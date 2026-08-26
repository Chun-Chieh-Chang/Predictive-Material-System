/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SystemDatabase,
  DemandForecastLog,
  MRPCalculationResult,
  SystemAlert,
  SystemParameters,
  DEFAULT_SYSTEM_PARAMETERS
} from '../types';

/**
 * 判定最新版本預估：優先以建立時間 (created_at) 降序，次以版本號 (version_no) 降序。
 * 不依賴陣列插入順序，避免資料維護順序不當造成「最新版」誤判。
 */
export function pickLatestForecast(forecasts: DemandForecastLog[]): DemandForecastLog | undefined {
  if (forecasts.length === 0) return undefined;
  return [...forecasts].sort((a, b) => {
    const ta = a.created_at || '';
    const tb = b.created_at || '';
    if (ta !== tb) return tb > ta ? 1 : -1;
    if (a.version_no !== b.version_no) return b.version_no > a.version_no ? 1 : -1;
    return 0;
  })[0];
}

/**
 * Anti-Placebo: 主檔關鍵欄位缺值時，回傳帶 calcError 的明確錯誤結果，
 * 禁止靜默帶入全域預設值偽裝成有效運算。
 */
function buildCalcErrorResult(db: SystemDatabase, sku: string, message: string): MRPCalculationResult {
  const item = db.item_master.find((i) => i.sku === sku);
  const forecasts = db.demand_forecast_log.filter((f) => f.sku === sku);
  const latestForecast = pickLatestForecast(forecasts);
  return {
    sku,
    productName: item?.category ?? sku,
    customerId: item?.customer_id ?? '',
    versionNo: latestForecast?.version_no ?? '',
    targetDate: latestForecast?.target_date ?? '',
    forecastQty: 0,
    actualOrderQty: 0,
    totalDemandQty: 0,
    fgReadyQty: 0,
    wipPendingQty: 0,
    sortingYield: 0,
    wipEffectiveQty: 0,
    fgNetRequirementQty: 0,
    activeMoldId: '',
    activeCavities: 0,
    cycleTimeSec: 0,
    dailyCapacityPcs: 0,
    netMoldWeightG: 0,
    runnerWeightG: 0,
    totalShotWeightG: 0,
    unitWeightG: 0,
    stdScrapRate: 0,
    rmSku: '',
    rmGrossRequirementKg: 0,
    colorMixingRatioPct: 0,
    rmOnHandKg: 0,
    rmInTransitKg: 0,
    safetyStockKg: 0,
    rmNetRequirementKg: 0,
    moqKg: 0,
    leadTimeDays: 0,
    suggestedOrderQtyKg: 0,
    suggestedOrderDate: '',
    daysUntilLatestOrder: 0,
    colorantDetail: null,
    daysToDeliver: 0,
    requiredProdDays: 0,
    capacityDeficitDays: 0,
    alerts: [{
      type: 'data_integrity',
      level: 'red',
      title: '⚠️ 主檔欄位缺值，無法計算',
      description: message,
      actionRecommendation: '請至「資料表維護」補齊該品號主檔欄位後重新計算。'
    }],
    calcError: message
  };
}

export function calculateMRPForSKU(
  db: SystemDatabase,
  sku: string,
  chosenMoldIdOrVersion?: string,
  selectedVersionNo?: string,
  systemParams?: SystemParameters
): MRPCalculationResult | null {
  const params: SystemParameters = systemParams || DEFAULT_SYSTEM_PARAMETERS;
  const item = db.item_master.find((i) => i.sku === sku);
  if (!item) return null;

  // Filter latest or chosen forecast for this SKU
  const forecasts = db.demand_forecast_log.filter((f) => f.sku === sku);
  if (forecasts.length === 0) return null;

  // Select specific version or latest version (created_at → version_no 降序判定)
  const activeForecast = selectedVersionNo
    ? forecasts.find((f) => f.version_no === selectedVersionNo) || pickLatestForecast(forecasts)
    : pickLatestForecast(forecasts);

  // Actual orders for this SKU (exclude cancelled orders per spec)
  const actualOrders = db.actual_order.filter((o) => o.sku === sku && o.status !== 'cancelled');
  const actualOrderQty = actualOrders.reduce((sum, o) => sum + o.order_qty, 0);

  const forecastQty = activeForecast.demand_qty;
  
  // Apply Demand Consumption Mode Strategy
  let totalDemandQty = forecastQty + actualOrderQty;
  if (params.demandConsumptionMode === 'po_consume') {
    totalDemandQty = Math.max(forecastQty, actualOrderQty);
  } else if (params.demandConsumptionMode === 'actual_only') {
    totalDemandQty = actualOrderQty;
  } else if (params.demandConsumptionMode === 'forecast_only') {
    totalDemandQty = forecastQty;
  }

  const targetDate = activeForecast.target_date;

  // Inventory & WIP snapshot
  const latestSnapshot = db.inventory_wip_snapshot
    .filter((s) => s.sku === sku)
    .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

  const fgReadyQty = latestSnapshot ? latestSnapshot.fg_ready_qty : 0;
  const wipPendingQty = latestSnapshot ? latestSnapshot.wip_pending_qty : 0;

  // Yield standard — V2.0: lookup from item_master.std_sorting_yield（缺值即擋，禁止靜默帶入預設）
  const itemRecord = db.item_master.find((i) => i.sku === sku);
  if (itemRecord?.std_sorting_yield == null) {
    return buildCalcErrorResult(db, sku, `成品 [${sku}] 主檔缺「標準全檢良率 (std_sorting_yield)」，無法計算 WIP 折算。`);
  }
  const sortingYield = itemRecord.std_sorting_yield;

  // Phase 1: Real FG Gap
  const wipEffectiveQty = Math.round(wipPendingQty * sortingYield);
  const fgNetRequirementQty = Math.max(0, totalDemandQty - fgReadyQty - wipEffectiveQty);

  // Phase 2: BOM & Molding Parameter Selection
  // Lookup BOM mappings for this SKU
  const bomRecords = db.product_mold_bom.filter((b) => b.sku === sku);
  if (bomRecords.length === 0) {
    // If no BOM, return partial with warning
    return null;
  }

  // Find mold by chosen ID, or apply multi-mold strategy
  let activeBOM = chosenMoldIdOrVersion
    ? bomRecords.find((b) => b.mold_id === chosenMoldIdOrVersion)
    : undefined;

  if (!activeBOM) {
    if (params.multiMoldStrategy === 'primary_mold_only') {
      activeBOM = bomRecords.find((b) => b.is_primary_mold) || bomRecords[0];
    } else if (params.multiMoldStrategy === 'lowest_weight') {
      // Pick the one with lowest unit weight
      activeBOM = bomRecords.reduce((prev, curr) => {
        const moldPrev = db.mold_master.find((m) => m.mold_id === prev.mold_id);
        const moldCurr = db.mold_master.find((m) => m.mold_id === curr.mold_id);
        const prevCav = moldPrev?.active_cavities || 1;
        const currCav = moldCurr?.active_cavities || 1;
        const prevWeight = (prev.net_mold_weight_g + prev.runner_weight_g) / prevCav;
        const currWeight = (curr.net_mold_weight_g + curr.runner_weight_g) / currCav;
        return currWeight < prevWeight ? curr : prev;
      }, bomRecords[0]);
    } else {
      // Conservative Max Weight (Default): assume the heaviest unit weight for procurement safety
      activeBOM = bomRecords.reduce((prev, curr) => {
        const moldPrev = db.mold_master.find((m) => m.mold_id === prev.mold_id);
        const moldCurr = db.mold_master.find((m) => m.mold_id === curr.mold_id);
        const prevCav = moldPrev?.active_cavities || 1;
        const currCav = moldCurr?.active_cavities || 1;
        const prevWeight = (prev.net_mold_weight_g + prev.runner_weight_g) / prevCav;
        const currWeight = (curr.net_mold_weight_g + curr.runner_weight_g) / currCav;
        return currWeight >= prevWeight ? curr : prev;
      }, bomRecords[0]);
    }
  }

  const activeMold = db.mold_master.find((m) => m.mold_id === activeBOM.mold_id) || {
    mold_id: activeBOM.mold_id,
    active_cavities: 16,
    cycle_time_sec: 30
  };

  const activeCavities = Math.max(1, activeMold.active_cavities || 16);
  const cycleTimeSec = activeMold.cycle_time_sec || 30;

  // Formula: Daily Capacity = (Daily Operating Seconds / Cycle Time) * Active Cavities
  const dailyOperatingSeconds = (params.dailyOperatingHours || 24) * 3600;
  const dailyCapacityPcs = Math.round((dailyOperatingSeconds / cycleTimeSec) * activeCavities);

  // Formula: Unit Weight = (Net Mold Weight + Runner Weight) / Active Cavities
  const netMoldWeightG = activeBOM.net_mold_weight_g;
  const runnerWeightG = activeBOM.runner_weight_g;
  const totalShotWeightG = Number((netMoldWeightG + runnerWeightG).toFixed(3));
  const unitWeightG = Number((totalShotWeightG / activeCavities).toFixed(3));
  // 缺值即擋（注意：0 為合法值，不得用 || 判斷而誤覆蓋）
  if (activeBOM.std_mfg_scrap_rate == null) {
    return buildCalcErrorResult(db, sku, `BOM [${sku} × ${activeBOM.mold_id}] 缺「成型損耗率 (std_mfg_scrap_rate)」，無法計算原料毛需求。`);
  }
  const stdScrapRate = activeBOM.std_mfg_scrap_rate;

  // Formula: Raw Material Gross Req (KG) = [FG Gap * Unit Weight / 1000] / (1 - Scrap Rate)
  const rmGrossRequirementKg = Number(
    ((fgNetRequirementQty * unitWeightG) / 1000 / (1 - stdScrapRate)).toFixed(2)
  );

  const rmSku = activeBOM.rm_sku;
  const mixingRatioPct = activeBOM.color_mixing_ratio_pct ?? 0;

  // ─── Color Mixing Adjusted RM Calculation ────────────────────────────────────
  // When color_mixing_ratio_pct > 0, the rm_sku represents a colorant (色母/色粉).
  // The true base resin requirement must be derived by dividing by (1 + ratio/100).
  let effectiveResinGrossKg = rmGrossRequirementKg;
  if (mixingRatioPct > 0) {
    effectiveResinGrossKg = Number((rmGrossRequirementKg / (1 + mixingRatioPct / 100)).toFixed(2));
  }

  // Phase 3: Raw Material Inventory & PO
  const rmSnapshot = db.inventory_wip_snapshot
    .filter((s) => s.sku === rmSku)
    .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

  const rmOnHandKg = rmSnapshot ? rmSnapshot.rm_on_hand_kg : 0;

  // 只计入未到达的PO（排除已到达和分批到达的订单）
  const rmPOs = db.po_in_transit.filter((p) => p.rm_sku === rmSku && !['arrived', 'partial_arrived'].includes(p.status));
  const rmInTransitKg = rmPOs.reduce((sum, p) => sum + p.in_transit_qty_kg, 0);

  // V2.0: lookup supplier rules from item_master (RAW class) — 採購規則缺值即擋，禁止靜默帶入全域預設
  const rmItem = db.item_master.find((i) => i.sku === rmSku);
  if (!rmItem) {
    return buildCalcErrorResult(db, sku, `原料品號 [${rmSku}] 不存在於品號主檔，無法取得採購規則。`);
  }
  if (rmItem.lead_time_days == null || rmItem.moq_kg == null || rmItem.safety_stock_kg == null) {
    const missingFields = [
      rmItem.lead_time_days == null ? '採購交期 (lead_time_days)' : null,
      rmItem.moq_kg == null ? '最小起訂量 (moq_kg)' : null,
      rmItem.safety_stock_kg == null ? '安全庫存 (safety_stock_kg)' : null
    ].filter(Boolean).join('、');
    return buildCalcErrorResult(db, sku, `原料 [${rmSku}] 主檔缺${missingFields}，無法計算採購建議。`);
  }
  const supplierRule = {
    supplier_name: rmItem.supplier_name || '未填供應商',
    lead_time_days: rmItem.lead_time_days,
    moq_kg: rmItem.moq_kg,
    safety_stock_kg: rmItem.safety_stock_kg,
  };

  const baseSafetyStockKg = supplierRule.safety_stock_kg;
  const safetyStockKg = Math.round(baseSafetyStockKg * (params.safetyStockMultiplier || 1.0));
  const moqKg = supplierRule.moq_kg;
  const leadTimeDays = supplierRule.lead_time_days;

  // Virtual Backflush calculation for in-house molding before month-end ERP deduction
  let virtualBackflushDeductedKg = 0;
  if (params.enableVirtualBackflush) {
    virtualBackflushDeductedKg = Number(
      ((wipPendingQty * unitWeightG) / 1000 / Math.max(0.01, 1 - stdScrapRate)).toFixed(2)
    );
  }
  const effectiveRmOnHandKg = Math.max(0, Number((rmOnHandKg - virtualBackflushDeductedKg).toFixed(2)));

  // Formula: Net RM Requirement (KG) = Gross RM - Effective OnHand - InTransit + SafetyStock
  // Note: when mixingRatioPct > 0, rmSku is the colorant; rmNetRequirementKg is colorant net req.
  const rmNetRequirementKg = Math.max(
    0,
    Number((effectiveResinGrossKg - effectiveRmOnHandKg - rmInTransitKg + safetyStockKg).toFixed(2))
  );

  // Round up to MOQ
  const suggestedOrderQtyKg =
    rmNetRequirementKg > 0 ? Math.ceil(rmNetRequirementKg / moqKg) * moqKg : 0;

  // ─── Colorant Detail (when mixingRatioPct > 0) ──────────────────────────────
  let colorantDetail: {
    colorantSku: string;
    colorantGrossKg: number;
    colorantOnHandKg: number;
    colorantInTransitKg: number;
    colorantNetRequirementKg: number;
    colorantSuggestedQtyKg: number;
    colorantLeadTimeDays: number;
  } | null = null;

  if (mixingRatioPct > 0) {
    const colorantGrossKg = Number((rmGrossRequirementKg - effectiveResinGrossKg).toFixed(2));
    const colorantSnapshot = db.inventory_wip_snapshot
      .filter((s) => s.sku === rmSku)
      .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];
    const colorantOnHandKg = colorantSnapshot ? colorantSnapshot.rm_on_hand_kg : 0;
    const colorantPOs = db.po_in_transit.filter((p) => p.rm_sku === rmSku && !['arrived', 'partial_arrived'].includes(p.status));
    const colorantInTransitKg = colorantPOs.reduce((sum, p) => sum + p.in_transit_qty_kg, 0);
    const colorantRule = rmItem; // 色母與原料同一品號，採購規則已於上方驗證非空
    const colorantNetKg = Math.max(0, Number((colorantGrossKg - colorantOnHandKg - colorantInTransitKg + colorantRule.safety_stock_kg).toFixed(2)));
    colorantDetail = {
      colorantSku: rmSku,
      colorantGrossKg,
      colorantOnHandKg,
      colorantInTransitKg,
      colorantNetRequirementKg: colorantNetKg,
      colorantSuggestedQtyKg: colorantNetKg > 0 ? Math.ceil(colorantNetKg / colorantRule.moq_kg) * colorantRule.moq_kg : 0,
      colorantLeadTimeDays: colorantRule.lead_time_days,
    };
  }

  // Suggested Order Date calculation
  const targetDateObj = new Date(targetDate);
  const suggestedOrderDateObj = new Date(targetDateObj.getTime() - leadTimeDays * 24 * 60 * 60 * 1000);
  const suggestedOrderDate = suggestedOrderDateObj.toISOString().split('T')[0];

  const now = new Date();
  const daysUntilLatestOrder = Math.ceil(
    (suggestedOrderDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  const daysToDeliver = Math.max(
    1,
    Math.ceil((targetDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );

  const requiredProdDays =
    dailyCapacityPcs > 0 ? Math.ceil(fgNetRequirementQty / dailyCapacityPcs) : 0;

  const capacityDeficitDays = requiredProdDays - daysToDeliver;

  // Alert generation using parameterized thresholds
  const alerts: SystemAlert[] = [];

  // Shortage Alert (Red)
  if (rmNetRequirementKg > 0 && daysUntilLatestOrder <= params.shortageAlertBufferDays) {
    alerts.push({
      type: 'shortage',
      level: 'red',
      title: daysUntilLatestOrder < 0 ? '🔴 嚴重缺料危機 (已逾最晚下單日)' : '🔴 採購警急警戒 (下單期吃緊)',
      description: `原料 [${rmSku}] 淨需求達 ${rmNetRequirementKg.toLocaleString()} KG。交期需 ${leadTimeDays} 天，最晚下單日為 ${suggestedOrderDate}（距離現今剩餘 ${daysUntilLatestOrder} 天，低於警示門檻 ${params.shortageAlertBufferDays} 天）。`,
      actionRecommendation: `請採購即刻開立採購單 ${suggestedOrderQtyKg.toLocaleString()} KG (符合 MOQ ${moqKg} KG)，或評估改採空運/提早到港！`
    });
  }

  const totalRMAvailable = rmOnHandKg + rmInTransitKg;

  // Track 1: 🟡 供需失衡與超備呆滯預警 (Supply-to-Demand Excess Risk)
  if (
    rmGrossRequirementKg > 0 &&
    totalRMAvailable > rmGrossRequirementKg * params.overstockMultiplier &&
    totalRMAvailable > safetyStockKg * 1.5
  ) {
    const surplusKg = totalRMAvailable - rmGrossRequirementKg;
    alerts.push({
      type: 'overstock',
      level: 'yellow',
      title: '🟡 供需超備與呆滯料預警 (供大於求)',
      description: `目前原料庫存+在途量 (${totalRMAvailable.toLocaleString()} KG) 達需求量 (${rmGrossRequirementKg.toLocaleString()} KG) 之 ${(totalRMAvailable / rmGrossRequirementKg).toFixed(1)} 倍 (高於設定門檻 ${params.overstockMultiplier} 倍)，超額備料達 ${surplusKg.toFixed(0)} KG。`,
      actionRecommendation: '可能受 Forecast 下修影響。請生管與採購檢視在途 PO 是否踩煞車、延後交期 (ETA)，降低資金積壓呆滯風險！'
    });
  }

  // Track 2: 🟠 實體倉容超載爆倉預警 (Physical Warehouse Overcapacity Risk)
  const maxStorageCapacityKg = params.defaultWarehouseCapacityKg || 12000;
  if (totalRMAvailable > maxStorageCapacityKg) {
    const overflowKg = totalRMAvailable - maxStorageCapacityKg;
    alerts.push({
      type: 'warehouse_overcapacity',
      level: 'orange',
      title: '🟠 實體倉容超載爆倉預警 (空間不足)',
      description: `原料 [${rmSku}] 現有庫存與在途總量 (${totalRMAvailable.toLocaleString()} KG) 已超出實體倉庫容積上限 (${maxStorageCapacityKg.toLocaleString()} KG)，預計超容 ${overflowKg.toLocaleString()} KG (${((totalRMAvailable / maxStorageCapacityKg) * 100).toFixed(0)}% 容積率)。`,
      actionRecommendation: '實體倉庫空間即將爆倉！請協調分批交貨、租借外部保稅倉或優先排產消耗，避免物料到廠無處卸貨堆放。'
    });
  }

  // Capacity Bottleneck Alert (Purple)
  if (requiredProdDays + (params.capacityBufferDays || 0) > daysToDeliver) {
    alerts.push({
      type: 'bottleneck',
      level: 'purple',
      title: '🟣 射出產能瓶頸預警 (交期緊迫)',
      description: `成品缺口 ${fgNetRequirementQty.toLocaleString()} PCS，以模具 [${activeMold.mold_id}] 妥善穴數 ${activeCavities} 穴 (日產能 ${dailyCapacityPcs.toLocaleString()} PCS) 計算，需連續生產 ${requiredProdDays} 天；但距離客戶交期僅剩 ${daysToDeliver} 天 (安全裕度 ${params.capacityBufferDays} 天)。`,
      actionRecommendation: '產能不足！建議提早投線生產、修復塞穴，或啟動備用模具同時排產！'
    });
  }

  // Normal status if no critical alerts
  if (alerts.length === 0 && suggestedOrderQtyKg > 0) {
    alerts.push({
      type: 'normal',
      level: 'green',
      title: '🟢 正常備料建議',
      description: `排程正常。建議於 ${suggestedOrderDate} 前向 [${supplierRule.supplier_name}] 下單 ${suggestedOrderQtyKg.toLocaleString()} KG。`,
      actionRecommendation: '按標準流程發出 PO 採購單。'
    });
  }

  // Phased Delivery Plan Generation (for Subtask 3.1)
  let phasedDeliveryPlan: { batchNo: number; qtyKg: number; orderDate: string; etaDate: string; reason: string }[] | undefined = undefined;
  if (params.enablePhasedDeliveryAdvisor && suggestedOrderQtyKg > 0) {
    const isLargeBatch = suggestedOrderQtyKg > maxStorageCapacityKg * 0.6 || suggestedOrderQtyKg >= 5000;
    if (isLargeBatch) {
      const batch1Qty = Math.ceil((suggestedOrderQtyKg * 0.5) / moqKg) * moqKg;
      const batch2Qty = Math.max(0, suggestedOrderQtyKg - batch1Qty);

      const batch2OrderDateObj = new Date(suggestedOrderDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
      const batch2EtaDateObj = new Date(targetDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);

      phasedDeliveryPlan = [
        {
          batchNo: 1,
          qtyKg: batch1Qty,
          orderDate: suggestedOrderDate,
          etaDate: targetDate,
          reason: '首批到港 (滿足前半段排產與安全水位，防範實體爆倉)',
        },
        {
          batchNo: 2,
          qtyKg: batch2Qty,
          orderDate: batch2OrderDateObj.toISOString().split('T')[0],
          etaDate: batch2EtaDateObj.toISOString().split('T')[0],
          reason: '次批到港 (間隔 30 天，平衡倉庫容積與資金積壓風險)',
        },
      ];
    }
  }

  return {
    sku,
    productName: item.category,
    customerId: item.customer_id,
    versionNo: activeForecast.version_no,
    targetDate,
    forecastQty,
    actualOrderQty,
    totalDemandQty,
    fgReadyQty,
    wipPendingQty,
    sortingYield,
    wipEffectiveQty,
    fgNetRequirementQty,
    activeMoldId: activeMold.mold_id,
    activeCavities,
    cycleTimeSec,
    dailyCapacityPcs,
    netMoldWeightG,
    runnerWeightG,
    totalShotWeightG,
    unitWeightG,
    stdScrapRate,
    rmSku,
    rmGrossRequirementKg,
    colorMixingRatioPct: mixingRatioPct,
    rmOnHandKg,
    virtualBackflushDeductedKg,
    effectiveRmOnHandKg,
    rmInTransitKg,
    safetyStockKg,
    rmNetRequirementKg,
    moqKg,
    leadTimeDays,
    suggestedOrderQtyKg,
    suggestedOrderDate,
    daysUntilLatestOrder,
    daysToDeliver,
    requiredProdDays,
    capacityDeficitDays,
    colorantDetail,
    phasedDeliveryPlan,
    alerts
  };
}

export function calculateAllMRP(
  db: SystemDatabase,
  selectedVersionNo?: string,
  systemParams?: SystemParameters
): MRPCalculationResult[] {
  // Get all finished good SKUs that have forecasts
  const fgSkus = Array.from(
    new Set(db.demand_forecast_log.map((f) => f.sku))
  );

  const results: MRPCalculationResult[] = [];
  for (const sku of fgSkus) {
    const res = calculateMRPForSKU(db, sku, undefined, selectedVersionNo, systemParams);
    if (res) {
      results.push(res);
    }
  }

  return results;
}



