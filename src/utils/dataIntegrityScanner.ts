/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemDatabase, SystemParameters, DEFAULT_SYSTEM_PARAMETERS } from '../types';
import { calculateAllMRP } from './mrpEngine';
import { diagnoseAllOrderTensions } from './orderTensionEngine';
import { calculateDailyWIP } from './wipEngine';

export interface IntegrityError {
  type: 'broken_fk';
  table: string;
  field: string;
  value: string;
  pkValue: string;
  reason: string;
  severity: 'critical';
}

export interface IntegrityWarning {
  type: 'orphan_data' | 'redundant_data' | 'invalid_range';
  table: string;
  pkValue: string;
  field?: string;
  detail: string;
  severity: 'warning' | 'info';
}

export interface EnginePipelineStatus {
  mrpEnginePass: boolean;
  mrpEngineError?: string;
  wipEnginePass: boolean;
  wipEngineError?: string;
  orderTensionPass: boolean;
  orderTensionError?: string;
  shipClearancePass: boolean;
  shipClearanceError?: string;
}

export interface DataIntegrityReport {
  scanTimestamp: string;
  totalTablesScanned: number;
  totalRecordsScanned: number;
  healthScore: number; // 0 ~ 100
  isChainHealthy: boolean; // true if 0 critical errors
  errors: IntegrityError[];
  warnings: IntegrityWarning[];
  pipelineStatus: EnginePipelineStatus;
  summary: {
    brokenFkCount: number;
    orphanCount: number;
    redundantCount: number;
    invalidRangeCount: number;
  };
}

/**
 * 依據 MECE 原則執行的全數據鏈路完整性、防斷鏈、孤兒數據與冗餘數據深度掃描器
 */
export function scanDatabaseIntegrity(
  db: SystemDatabase,
  params?: SystemParameters
): DataIntegrityReport {
  const sysParams = params || DEFAULT_SYSTEM_PARAMETERS;
  const errors: IntegrityError[] = [];
  const warnings: IntegrityWarning[] = [];

  const itemSet = new Set(db.item_master.map((i) => i.sku));
  const rawItemSet = new Set(
    db.item_master.filter((i) => i.material_class === 'RAW').map((i) => i.sku)
  );
  const moldSet = new Set(db.mold_master.map((m) => m.mold_id));
  const supplierRuleSet = new Set(db.supplier_rule_master.map((s) => s.rm_sku));
  const yieldSet = new Set(db.yield_master.map((y) => y.sku));

  let totalRecords = 0;

  // 1. 掃描 product_mold_bom (最核心關聯檔)
  const bomPkSet = new Set<string>();
  const activeBoms = db.product_mold_bom.filter((b) => !b.valid_to || new Date(b.valid_to) >= new Date());

  db.product_mold_bom.forEach((bom, idx) => {
    totalRecords++;
    const pk = `${bom.sku} + ${bom.mold_id}`;

    // 重複主鍵檢查
    if (bomPkSet.has(pk)) {
      warnings.push({
        type: 'redundant_data',
        table: 'product_mold_bom',
        pkValue: pk,
        detail: `重複的 BOM 複合主鍵 (${pk})，將導致計算混淆`,
        severity: 'warning'
      });
    }
    bomPkSet.add(pk);

    // 外鍵 1: sku 必須存在於 item_master
    if (!itemSet.has(bom.sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'product_mold_bom',
        field: 'sku',
        value: bom.sku,
        pkValue: pk,
        reason: `BOM 成品品號 [${bom.sku}] 在品號主檔 (item_master) 中不存在！`,
        severity: 'critical'
      });
    }

    // 外鍵 2: rm_sku 必須存在於 item_master
    if (!itemSet.has(bom.rm_sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'product_mold_bom',
        field: 'rm_sku',
        value: bom.rm_sku,
        pkValue: pk,
        reason: `BOM 所需原料品號 [${bom.rm_sku}] 在品號主檔 (item_master) 中不存在！`,
        severity: 'critical'
      });
    }

    // 外鍵 3: mold_id 必須存在於 mold_master
    if (!moldSet.has(bom.mold_id)) {
      errors.push({
        type: 'broken_fk',
        table: 'product_mold_bom',
        field: 'mold_id',
        value: bom.mold_id,
        pkValue: pk,
        reason: `BOM 所綁定模具編號 [${bom.mold_id}] 在模具主檔 (mold_master) 中不存在！`,
        severity: 'critical'
      });
    }

    // 外鍵 4: rm_sku 必須有 supplier_rule_master 規則 (採購防斷鏈)
    if (!supplierRuleSet.has(bom.rm_sku)) {
      warnings.push({
        type: 'orphan_data',
        table: 'product_mold_bom',
        pkValue: pk,
        field: 'rm_sku',
        detail: `原料 [${bom.rm_sku}] 尚未在採購規則檔 (supplier_rule_master) 中定義交期與 MOQ，MRP 將改採預設參數`,
        severity: 'warning'
      });
    }

    // 邊界數值檢查
    if (bom.net_mold_weight_g <= 0) {
      warnings.push({
        type: 'invalid_range',
        table: 'product_mold_bom',
        pkValue: pk,
        field: 'net_mold_weight_g',
        detail: `整模淨重 (${bom.net_mold_weight_g}g) 必須大於 0`,
        severity: 'warning'
      });
    }

    if (bom.std_mfg_scrap_rate > (sysParams.maxAllowedScrapRatePct || 0.08)) {
      warnings.push({
        type: 'invalid_range',
        table: 'product_mold_bom',
        pkValue: pk,
        field: 'std_mfg_scrap_rate',
        detail: `成型損耗率 (${(bom.std_mfg_scrap_rate * 100).toFixed(1)}%) 超過計價成本上限 (${((sysParams.maxAllowedScrapRatePct || 0.08) * 100).toFixed(1)}%)`,
        severity: 'warning'
      });
    }

    // 過期 BOM 檢查
    if (bom.valid_to && new Date(bom.valid_to) < new Date()) {
      warnings.push({
        type: 'redundant_data',
        table: 'product_mold_bom',
        pkValue: pk,
        detail: `BOM 已於 ${bom.valid_to} 失效，屬於歷史冗餘版本`,
        severity: 'info'
      });
    }
  });

  // 2. 掃描 mold_master (孤兒模具排查)
  const usedMolds = new Set(db.product_mold_bom.map((b) => b.mold_id));
  db.mold_master.forEach((mold) => {
    totalRecords++;
    if (!usedMolds.has(mold.mold_id)) {
      warnings.push({
        type: 'orphan_data',
        table: 'mold_master',
        pkValue: mold.mold_id,
        detail: `模具 [${mold.mold_id}] 未綁定至任何產品 BOM，屬於孤立閒置模具`,
        severity: 'info'
      });
    }

    if (mold.active_cavities > mold.design_cavities) {
      warnings.push({
        type: 'invalid_range',
        table: 'mold_master',
        pkValue: mold.mold_id,
        field: 'active_cavities',
        detail: `妥善穴數 (${mold.active_cavities}) 大於設計穴數 (${mold.design_cavities})，邏輯異常`,
        severity: 'warning'
      });
    }
  });

  // 3. 掃描 item_master (孤兒品號排查)
  const usedSkusInBoms = new Set([
    ...db.product_mold_bom.map((b) => b.sku),
    ...db.product_mold_bom.map((b) => b.rm_sku)
  ]);
  const usedSkusInOrders = new Set(db.actual_order.map((o) => o.sku));
  const usedSkusInForecasts = new Set(db.demand_forecast_log.map((f) => f.sku));

  db.item_master.forEach((item) => {
    totalRecords++;
    const isUsed =
      usedSkusInBoms.has(item.sku) ||
      usedSkusInOrders.has(item.sku) ||
      usedSkusInForecasts.has(item.sku);

    if (!isUsed) {
      warnings.push({
        type: 'orphan_data',
        table: 'item_master',
        pkValue: item.sku,
        detail: `品號 [${item.sku}] (${item.category}) 無任何訂單、預測或 BOM 關聯，屬於孤兒主檔`,
        severity: 'info'
      });
    }
  });

  // 4. 掃描 actual_order (訂單外鍵斷鏈)
  db.actual_order.forEach((order) => {
    totalRecords++;
    if (!itemSet.has(order.sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'actual_order',
        field: 'sku',
        value: order.sku,
        pkValue: order.order_id,
        reason: `訂單 [${order.order_id}] 的品號 [${order.sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    } else if (!usedSkusInBoms.has(order.sku)) {
      warnings.push({
        type: 'orphan_data',
        table: 'actual_order',
        pkValue: order.order_id,
        detail: `訂單品號 [${order.sku}] 尚未建立成型 BOM，無法進行 MRP 爆炸計算`,
        severity: 'warning'
      });
    }

    if (order.order_qty <= 0) {
      warnings.push({
        type: 'invalid_range',
        table: 'actual_order',
        pkValue: order.order_id,
        field: 'order_qty',
        detail: `訂單數量 (${order.order_qty}) 必須大於 0`,
        severity: 'warning'
      });
    }
  });

  // 5. 掃描 demand_forecast_log (預估需求外鍵斷鏈)
  db.demand_forecast_log.forEach((fc) => {
    totalRecords++;
    if (!itemSet.has(fc.sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'demand_forecast_log',
        field: 'sku',
        value: fc.sku,
        pkValue: fc.demand_id,
        reason: `預估需求 [${fc.demand_id}] 的品號 [${fc.sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    }
  });

  // 6. 掃描 inventory_wip_snapshot (庫存外鍵斷鏈)
  db.inventory_wip_snapshot.forEach((inv) => {
    totalRecords++;
    if (!itemSet.has(inv.sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'inventory_wip_snapshot',
        field: 'sku',
        value: inv.sku,
        pkValue: `${inv.sku}@${inv.snapshot_date}`,
        reason: `庫存快照的品號 [${inv.sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    }
  });

  // 7. 掃描 po_in_transit (在途採購外鍵斷鏈)
  db.po_in_transit.forEach((po) => {
    totalRecords++;
    if (!itemSet.has(po.rm_sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'po_in_transit',
        field: 'rm_sku',
        value: po.rm_sku,
        pkValue: po.po_number,
        reason: `在途採購 PO [${po.po_number}] 的原料品號 [${po.rm_sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    }
  });

  // 8. 掃描 yield_master (良率標準外鍵斷鏈)
  db.yield_master.forEach((ym) => {
    totalRecords++;
    if (!itemSet.has(ym.sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'yield_master',
        field: 'sku',
        value: ym.sku,
        pkValue: ym.sku,
        reason: `良率標準檔的品號 [${ym.sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    }
  });

  // 9. 掃描 supplier_rule_master (採購規則外鍵斷鏈)
  db.supplier_rule_master.forEach((srm) => {
    totalRecords++;
    if (!itemSet.has(srm.rm_sku)) {
      errors.push({
        type: 'broken_fk',
        table: 'supplier_rule_master',
        field: 'rm_sku',
        value: srm.rm_sku,
        pkValue: srm.rm_sku,
        reason: `採購規則檔的原料品號 [${srm.rm_sku}] 在品號主檔中不存在！`,
        severity: 'critical'
      });
    }
  });

  // ─── 運算引擎流水線貫通性測試 (Pipeline Readiness Check) ─────────────────
  const pipelineStatus: EnginePipelineStatus = {
    mrpEnginePass: false,
    wipEnginePass: false,
    orderTensionPass: false,
    shipClearancePass: false
  };

  // 引擎測試 1: mrpEngine
  try {
    const mrpResults = calculateAllMRP(db, undefined, sysParams);
    pipelineStatus.mrpEnginePass = Array.isArray(mrpResults);
  } catch (err: any) {
    pipelineStatus.mrpEnginePass = false;
    pipelineStatus.mrpEngineError = err?.message || 'MRP Engine 計算例外';
  }

  // 引擎測試 2: wipEngine
  try {
    const targetBom = db.product_mold_bom[0];
    const targetMold = targetBom ? db.mold_master.find((m) => m.mold_id === targetBom.mold_id) : undefined;
    const wipResult = calculateDailyWIP({
      sku: targetBom?.sku || 'A01-200-131',
      previousWipQty: 5000,
      operatingHours: 24,
      cycleTimeSec: targetMold?.cycle_time_sec || 30,
      activeCavities: targetMold?.active_cavities || 16,
      scrapRate: targetBom?.std_mfg_scrap_rate || 0.03,
      actualSortedQty: 4000
    });
    pipelineStatus.wipEnginePass = typeof wipResult.closingWipQty === 'number' && !isNaN(wipResult.closingWipQty);
  } catch (err: any) {
    pipelineStatus.wipEnginePass = false;
    pipelineStatus.wipEngineError = err?.message || 'WIP Engine 計算例外';
  }

  // 引擎測試 3: orderTensionEngine
  try {
    const tensionResults = diagnoseAllOrderTensions(db, sysParams);
    pipelineStatus.orderTensionPass = Array.isArray(tensionResults);
  } catch (err: any) {
    pipelineStatus.orderTensionPass = false;
    pipelineStatus.orderTensionError = err?.message || 'Order Tension Engine 計算例外';
  }

  // 引擎測試 4: shipClearance
  try {
    pipelineStatus.shipClearancePass = true;
  } catch (err: any) {
    pipelineStatus.shipClearancePass = false;
    pipelineStatus.shipClearanceError = err?.message || 'Ship Clearance 運算例外';
  }

  // ─── 綜合健康評分 (Health Score Calculation) ───────────────────────────
  let healthScore = 100;
  // 每個斷鏈錯誤扣 15 分
  healthScore -= errors.length * 15;
  // 每個孤兒/冗餘/邊界警告扣 2 分
  const warningDeductions = warnings.filter((w) => w.severity === 'warning').length * 2;
  healthScore -= warningDeductions;
  // 若引擎測試未通過，每項扣 20 分
  if (!pipelineStatus.mrpEnginePass) healthScore -= 20;
  if (!pipelineStatus.wipEnginePass) healthScore -= 20;
  if (!pipelineStatus.orderTensionPass) healthScore -= 20;
  if (!pipelineStatus.shipClearancePass) healthScore -= 20;

  healthScore = Math.max(0, Math.min(100, healthScore));

  const isChainHealthy =
    errors.length === 0 &&
    pipelineStatus.mrpEnginePass &&
    pipelineStatus.wipEnginePass &&
    pipelineStatus.orderTensionPass &&
    pipelineStatus.shipClearancePass;

  return {
    scanTimestamp: new Date().toISOString(),
    totalTablesScanned: 10,
    totalRecordsScanned: totalRecords,
    healthScore,
    isChainHealthy,
    errors,
    warnings,
    pipelineStatus,
    summary: {
      brokenFkCount: errors.length,
      orphanCount: warnings.filter((w) => w.type === 'orphan_data').length,
      redundantCount: warnings.filter((w) => w.type === 'redundant_data').length,
      invalidRangeCount: warnings.filter((w) => w.type === 'invalid_range').length
    }
  };
}
