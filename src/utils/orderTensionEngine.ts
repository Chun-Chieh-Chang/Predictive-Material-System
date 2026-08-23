/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SystemDatabase,
  SystemParameters,
  DEFAULT_SYSTEM_PARAMETERS
} from '../types';

export type BottleneckStageType =
  | 'raw_material_leadtime' // 🔴 原料採購交期環節
  | 'molding_capacity'      // 🟣 模具射出產能環節
  | 'wip_sorting'           // 🟡 3樓 WIP 全檢環節
  | 'in_transit_shipping'   // 🟠 在途海運船期環節
  | 'colorant_shortage'     // 🔵 色母配色缺料環節
  | 'warehouse_overcapacity'; // 🟤 實體倉容超載環節

export interface OrderBottleneckItem {
  stage: BottleneckStageType;
  level: 'red' | 'orange' | 'yellow' | 'purple' | 'blue';
  stageName: string;
  stageBadge: string;
  title: string;
  detail: string;
  metricText: string;
  actionGuide: string;
}

export interface OrderTensionDiagnostic {
  orderId: string;
  customerId: string;
  sku: string;
  productName: string;
  orderQty: number;
  orderDate: string;
  targetDate: string;
  daysToDeliver: number;
  status: string;
  overallTensionLevel: 'critical' | 'high' | 'medium' | 'normal';
  tensionScore: number; // 0 ~ 100 緊張指數 (100 = 極度危急)
  bottlenecks: OrderBottleneckItem[];
  fgReadyQty: number;
  wipPendingQty: number;
  wipEffectiveQty: number;
  rmSku: string;
  rmNetRequirementKg: number;
  daysUntilLatestOrder: number;
  activeMoldId: string;
}

/**
 * 針對全系統訂單進行全鏈路物料健康診斷與緊張環節定位
 */
export function diagnoseAllOrderTensions(
  db: SystemDatabase,
  systemParams?: SystemParameters
): OrderTensionDiagnostic[] {
  const params: SystemParameters = systemParams || DEFAULT_SYSTEM_PARAMETERS;
  const now = new Date();

  return db.actual_order
    .filter((o) => o.status !== 'cancelled')
    .map((order) => {
      const item = db.item_master.find((i) => i.sku === order.sku) || {
        sku: order.sku,
        category: '未定義產品',
        customer_id: order.customer_id,
        unit: 'PCS'
      };

      const targetDateObj = new Date(order.target_date);
      const daysToDeliver = Math.ceil(
        (targetDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // 1. 成品在庫與 WIP 狀態 (Stage 1)
      const latestSnapshot = db.inventory_wip_snapshot
        .filter((s) => s.sku === order.sku)
        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

      const fgReadyQty = latestSnapshot ? latestSnapshot.fg_ready_qty : 0;
      const wipPendingQty = latestSnapshot ? latestSnapshot.wip_pending_qty : 0;

      const yieldRecord = db.yield_master.find((y) => y.sku === order.sku);
      const sortingYield = yieldRecord ? yieldRecord.std_sorting_yield : params.defaultSortingYield;
      const wipEffectiveQty = Math.round(wipPendingQty * sortingYield);

      const totalSupply = fgReadyQty + wipEffectiveQty;
      const fgGap = Math.max(0, order.order_qty - fgReadyQty - wipEffectiveQty);

      // 2. 模具與 BOM 參數 (Stage 2)
      const bomRecords = db.product_mold_bom.filter((b) => b.sku === order.sku);
      const primaryBom = bomRecords.find((b) => b.is_primary_mold) || bomRecords[0];
      const moldRecord = primaryBom ? db.mold_master.find((m) => m.mold_id === primaryBom.mold_id) : undefined;

      const activeMoldId = primaryBom?.mold_id || 'DEFAULT_MOLD';
      const designCavities = moldRecord?.design_cavities || 16;
      const activeCavities = Math.max(1, moldRecord?.active_cavities || designCavities);
      const cycleTimeSec = moldRecord?.cycle_time_sec || 30;

      const dailyOperatingSeconds = (params.dailyOperatingHours || 24) * 3600;
      const dailyCapacityPcs = Math.round((dailyOperatingSeconds / cycleTimeSec) * activeCavities);
      const requiredProdDays = dailyCapacityPcs > 0 && fgGap > 0 ? Math.ceil(fgGap / dailyCapacityPcs) : 0;

      // 3. 原料需求與採購前置時間 (Stage 3)
      const rmSku = primaryBom?.rm_sku || 'RAW-RESIN';
      const netMoldWeightG = primaryBom?.net_mold_weight_g || 300;
      const runnerWeightG = primaryBom?.runner_weight_g || 20;
      const unitWeightG = Number(((netMoldWeightG + runnerWeightG) / activeCavities).toFixed(3));
      const scrapRate = primaryBom?.std_mfg_scrap_rate || params.defaultMfgScrapRate;

      const rmGrossReqKg = Number(((fgGap * unitWeightG) / 1000 / Math.max(0.01, 1 - scrapRate)).toFixed(2));

      const rmSnapshot = db.inventory_wip_snapshot
        .filter((s) => s.sku === rmSku)
        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];
      const rmOnHandKg = rmSnapshot ? rmSnapshot.rm_on_hand_kg : 0;

      const rmPOs = db.po_in_transit.filter(
        (p) => p.rm_sku === rmSku && !['arrived', 'partial_arrived'].includes(p.status)
      );
      const rmInTransitKg = rmPOs.reduce((sum, p) => sum + p.in_transit_qty_kg, 0);

      const supplierRule = db.supplier_rule_master.find((s) => s.rm_sku === rmSku) || {
        lead_time_days: params.defaultProcurementLeadTimeDays,
        moq_kg: params.defaultMoqKg,
        safety_stock_kg: 1000,
        max_storage_capacity_kg: params.defaultWarehouseCapacityKg || 12000
      };

      const leadTimeDays = supplierRule.lead_time_days || params.defaultProcurementLeadTimeDays;
      const safetyStockKg = Math.round((supplierRule.safety_stock_kg || 1000) * params.safetyStockMultiplier);

      // 虛擬預扣
      const virtualBackflushKg = params.enableVirtualBackflush
        ? Number(((wipPendingQty * unitWeightG) / 1000 / Math.max(0.01, 1 - scrapRate)).toFixed(2))
        : 0;
      const effectiveRmOnHandKg = Math.max(0, Number((rmOnHandKg - virtualBackflushKg).toFixed(2)));

      const rmNetRequirementKg = Math.max(
        0,
        Number((rmGrossReqKg - effectiveRmOnHandKg - rmInTransitKg + safetyStockKg).toFixed(2))
      );

      const suggestedOrderDateObj = new Date(targetDateObj.getTime() - leadTimeDays * 24 * 60 * 60 * 1000);
      const suggestedOrderDate = suggestedOrderDateObj.toISOString().split('T')[0];
      const daysUntilLatestOrder = Math.ceil(
        (suggestedOrderDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      // ─── 逐一診斷 6 大緊張環節 ───────────────────────────────────────────
      const bottlenecks: OrderBottleneckItem[] = [];

      // 環節 1：🔴 原料採購交期環節 (RM Lead Time & Shortage)
      if (rmNetRequirementKg > 0 && daysUntilLatestOrder <= params.shortageAlertBufferDays) {
        bottlenecks.push({
          stage: 'raw_material_leadtime',
          level: 'red',
          stageName: '原料採購交期',
          stageBadge: daysUntilLatestOrder < 0 ? `🔴 下單逾期 ${Math.abs(daysUntilLatestOrder)}天` : `🔴 下單吃緊 ${daysUntilLatestOrder}天`,
          title: '國外原料採購前置期緊張 / 缺料危機',
          detail: `訂單所需原料 [${rmSku}] 淨缺口達 ${rmNetRequirementKg.toLocaleString()} KG。供應商海運交期需 ${leadTimeDays} 天，最晚下單日為 ${suggestedOrderDate}。`,
          metricText: `缺口 ${rmNetRequirementKg.toLocaleString()} KG (最晚發單: ${suggestedOrderDate})`,
          actionGuide: '請採購即刻下達採購單，或評估改採空運/提早到港以搶救客戶約定交期！'
        });
      }

      // 環節 2：🟣 模具射出產能環節 (Molding Capacity & Cavity)
      if (requiredProdDays > daysToDeliver) {
        bottlenecks.push({
          stage: 'molding_capacity',
          level: 'purple',
          stageName: '模具射出產能',
          stageBadge: `🟣 產能赤字 ${requiredProdDays - daysToDeliver}天`,
          title: '射出排產天數不足以滿足交期',
          detail: `成品缺口 ${fgGap.toLocaleString()} PCS，以模具 [${activeMoldId}] 妥善 ${activeCavities} 穴計算需連續生產 ${requiredProdDays} 天，但距離客戶交期僅剩 ${daysToDeliver} 天。`,
          metricText: `需連續開機 ${requiredProdDays} 天 (交期剩 ${daysToDeliver} 天)`,
          actionGuide: '建議提前投產排線、啟動 24h 滿載加班，或加開備用模具同時射出！'
        });
      } else if (activeCavities < designCavities) {
        bottlenecks.push({
          stage: 'molding_capacity',
          level: 'purple',
          stageName: '模具射出產能',
          stageBadge: `🟣 模具塞穴 (${activeCavities}/${designCavities}穴)`,
          title: '模具塞穴導致產能折損與單穴耗料上升',
          detail: `模具 [${activeMoldId}] 現況僅 ${activeCavities} 穴運作（設計為 ${designCavities} 穴），產能折損 ${(((designCavities - activeCavities) / designCavities) * 100).toFixed(0)}%。`,
          metricText: `塞穴 ${designCavities - activeCavities} 穴 (折損 ${(((designCavities - activeCavities) / designCavities) * 100).toFixed(0)}%)`,
          actionGuide: '請模修課安排停機保養修復塞穴，以恢復 100% 原始設計產能。'
        });
      }

      // 環節 3：🟡 3樓 WIP 全檢環節 (WIP Sorting Dependency)
      if (fgReadyQty < order.order_qty) {
        if (totalSupply >= order.order_qty) {
          const neededWip = order.order_qty - fgReadyQty;
          bottlenecks.push({
            stage: 'wip_sorting',
            level: 'yellow',
            stageName: '3F WIP 待檢',
            stageBadge: `🟡 需挑選 ${neededWip.toLocaleString()} PCS`,
            title: '成品現貨不足，極度仰賴 3樓 WIP 及時挑選驗收',
            detail: `庫房在庫良品僅 ${fgReadyQty.toLocaleString()} PCS，需仰賴三樓暫存區之待驗品及時挑選入庫 ${neededWip.toLocaleString()} PCS 才能如期出貨。`,
            metricText: `現貨缺 ${neededWip.toLocaleString()} PCS (3F 待驗 ${wipPendingQty.toLocaleString()} PCS)`,
            actionGuide: '請生管與品保課優先排單檢驗該批號 WIP，確保在出貨日前完成全檢入庫！'
          });
        } else {
          const absoluteDeficit = order.order_qty - totalSupply;
          bottlenecks.push({
            stage: 'wip_sorting',
            level: 'red',
            stageName: '3F WIP 待檢',
            stageBadge: `🔴 實質缺貨 ${absoluteDeficit.toLocaleString()} PCS`,
            title: '現貨與 WIP 總供給皆不足以覆蓋訂單',
            detail: `成品現貨 (${fgReadyQty.toLocaleString()}) + 有效 WIP (${wipEffectiveQty.toLocaleString()}) = 總可用量 ${totalSupply.toLocaleString()} PCS，實質赤字缺口達 ${absoluteDeficit.toLocaleString()} PCS。`,
            metricText: `赤字 ${absoluteDeficit.toLocaleString()} PCS`,
            actionGuide: '現有庫存無法滿足，必須緊急開機成型生產或向客戶協調延後分批交付！'
          });
        }
      }

      // 環節 4：🟠 在途原料船期環節 (In-Transit Sea Freight Delays)
      const delayedPOs = rmPOs.filter(
        (p) => p.status === 'delayed' || (p.eta_variance_days && p.eta_variance_days > 0)
      );
      if (delayedPOs.length > 0) {
        bottlenecks.push({
          stage: 'in_transit_shipping',
          level: 'orange',
          stageName: '在途海運船期',
          stageBadge: `🟠 PO 船期延誤 (${delayedPOs.length}筆)`,
          title: '在途原料海運到港延期風險',
          detail: `原料在途採購單 [${delayedPOs.map((p) => p.po_number).join(', ')}] 標記為延遲或到廠日延後，恐影響排產起跑日。`,
          metricText: `在途延遲量 ${delayedPOs.reduce((s, p) => s + p.in_transit_qty_kg, 0).toLocaleString()} KG`,
          actionGuide: '請採購人員即刻向船公司追蹤貨櫃清關進度，確認實際到廠排程。'
        });
      }

      // 環節 5：🔵 色母/色粉配色環節 (Colorant Shortage)
      const mixingRatioPct = primaryBom?.color_mixing_ratio_pct ?? 0;
      if (mixingRatioPct > 0) {
        const colorantGrossKg = Number(((rmGrossReqKg * mixingRatioPct) / (100 + mixingRatioPct)).toFixed(2));
        if (colorantGrossKg > 0 && effectiveRmOnHandKg < colorantGrossKg) {
          bottlenecks.push({
            stage: 'colorant_shortage',
            level: 'blue',
            stageName: '色母配色缺料',
            stageBadge: `🔵 色母缺料 ${colorantGrossKg} KG`,
            title: '特定配色色母/色粉庫存不足',
            detail: `本品號含 ${mixingRatioPct}% 色母混合製程，預估色粉/色母需 ${colorantGrossKg} KG，在庫不足以支持混料成型。`,
            metricText: `色母需求 ${colorantGrossKg} KG`,
            actionGuide: '請確認色母在庫或提早進行預先混料 (Pre-mix) 製程準備。'
          });
        }
      }

      // ─── 綜合評定訂單緊張等級 (Overall Tension Level) ───────────────────
      let overallTensionLevel: 'critical' | 'high' | 'medium' | 'normal' = 'normal';
      let tensionScore = 0;

      const hasRed = bottlenecks.some((b) => b.level === 'red');
      const hasPurple = bottlenecks.some((b) => b.level === 'purple');
      const hasOrange = bottlenecks.some((b) => b.level === 'orange');
      const hasYellow = bottlenecks.some((b) => b.level === 'yellow');
      const hasBlue = bottlenecks.some((b) => b.level === 'blue');

      if (hasRed) {
        overallTensionLevel = 'critical';
        tensionScore = 95;
      } else if (hasPurple || hasOrange) {
        overallTensionLevel = 'high';
        tensionScore = 75;
      } else if (hasYellow || hasBlue) {
        overallTensionLevel = 'medium';
        tensionScore = 50;
      } else {
        overallTensionLevel = 'normal';
        tensionScore = 10;
      }

      return {
        orderId: order.order_id,
        customerId: order.customer_id,
        sku: order.sku,
        productName: item.category,
        orderQty: order.order_qty,
        orderDate: order.order_date,
        targetDate: order.target_date,
        daysToDeliver,
        status: order.status || 'confirmed',
        overallTensionLevel,
        tensionScore,
        bottlenecks,
        fgReadyQty,
        wipPendingQty,
        wipEffectiveQty,
        rmSku,
        rmNetRequirementKg,
        daysUntilLatestOrder,
        activeMoldId
      };
    })
    .sort((a, b) => b.tensionScore - a.tensionScore); // 預設依緊張程度由高至低排序
}
