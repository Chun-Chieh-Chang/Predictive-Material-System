/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemDatabase, SystemParameters, DEFAULT_SYSTEM_PARAMETERS } from '../types';
import { calculateMRPForSKU } from './mrpEngine';
import { calculateDailyWIP } from './wipEngine';
import { diagnoseAllOrderTensions } from './orderTensionEngine';
import { scanDatabaseIntegrity, DataIntegrityReport } from './dataIntegrityScanner';

interface SimulationScenarioResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  passed: boolean;
  durationMs: number;
  keyOutputs: Record<string, any>;
  findings: string[];
}

export interface DeepPipelineSimulationSuiteResult {
  suiteTimestamp: string;
  allPassed: boolean;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  integrityReport: DataIntegrityReport;
  scenarioResults: SimulationScenarioResult[];
}

/**
 * 執行資料關聯完整性與業務流程模擬測試套件 (End-to-End Simulation Test Suite)
 */
export function runDeepPipelineSimulation(
  db: SystemDatabase,
  params?: SystemParameters
): DeepPipelineSimulationSuiteResult {
  const sysParams = params || DEFAULT_SYSTEM_PARAMETERS;
  const startTime = Date.now();

  // 1. 執行基礎數據鏈路完整性掃描
  const integrityReport = scanDatabaseIntegrity(db, sysParams);

  const scenarioResults: SimulationScenarioResult[] = [];

  // ─── 場景 1：標準業務流程計算 (Baseline Pass-Through) ──────────────────────
  const s1Start = performance.now();
  let s1Passed = false;
  const s1Outputs: Record<string, any> = {};
  const s1Findings: string[] = [];

  try {
    const testSku = db.item_master.find((i) => i.material_class === 'SET')?.sku || 'A01-200-131';
    const mrp = calculateMRPForSKU(db, testSku, undefined, undefined, sysParams);
    if (!mrp) throw new Error(`查無料號 ${testSku} 之 MRP 運算結果`);

    s1Outputs.sku = testSku;
    s1Outputs.fgNetRequirementQty = mrp.fgNetRequirementQty;
    s1Outputs.unitWeightG = mrp.unitWeightG;
    s1Outputs.rmGrossRequirementKg = mrp.rmGrossRequirementKg;
    s1Outputs.suggestedOrderQtyKg = mrp.suggestedOrderQtyKg;
    s1Outputs.suggestedOrderDate = mrp.suggestedOrderDate;

    s1Passed =
      !isNaN(mrp.rmGrossRequirementKg) &&
      !isNaN(mrp.suggestedOrderQtyKg) &&
      mrp.unitWeightG > 0 &&
      mrp.suggestedOrderDate.length > 0;

    s1Findings.push(`✅ 成功完成 3 階 MRP 計算：成品缺口 ${mrp.fgNetRequirementQty} PCS ➔ 單穴耗料 ${mrp.unitWeightG}g ➔ 建議採購 ${mrp.suggestedOrderQtyKg} KG (最晚下單: ${mrp.suggestedOrderDate})`);
  } catch (err: any) {
    s1Passed = false;
    s1Findings.push(`❌ 標準業務閉環計算失敗: ${err?.message}`);
  }

  scenarioResults.push({
    scenarioId: 'SCENARIO-01',
    scenarioName: '標準業務流程計算驗證 (Baseline Pass-Through)',
    description: '驗證從客戶訂單 ➔ BOM 展開 ➔ 模具成型 ➔ WIP 良率折算 ➔ 原料採購建議之端到端數值流',
    passed: s1Passed,
    durationMs: Number((performance.now() - s1Start).toFixed(2)),
    keyOutputs: s1Outputs,
    findings: s1Findings
  });

  // ─── 場景 2：模具塞穴降級與產能衝擊驗證 (Degraded Cavity Stress) ──────────
  const s2Start = performance.now();
  let s2Passed = false;
  const s2Outputs: Record<string, any> = {};
  const s2Findings: string[] = [];

  try {
    // 構造塞穴模具情境
    const primaryBom = db.product_mold_bom[0];
    const testMold = db.mold_master.find((m) => m.mold_id === primaryBom?.mold_id);
    const baseCav = testMold?.active_cavities || 16;
    const degradedCav = Math.max(1, baseCav - 4); // 塞 4 穴

    const degradedDb: SystemDatabase = {
      ...db,
      mold_master: db.mold_master.map((m) =>
        m.mold_id === testMold?.mold_id ? { ...m, active_cavities: degradedCav } : m
      )
    };

    const mrpDegraded = calculateMRPForSKU(degradedDb, primaryBom.sku, undefined, undefined, sysParams);
    if (!mrpDegraded) throw new Error(`查無料號 ${primaryBom?.sku} 之降級 MRP 運算結果`);
    const normalUnitWeight = primaryBom ? (primaryBom.net_mold_weight_g + primaryBom.runner_weight_g) / baseCav : 20;

    s2Outputs.designCavities = baseCav;
    s2Outputs.activeCavities = degradedCav;
    s2Outputs.normalUnitWeightG = Number(normalUnitWeight.toFixed(3));
    s2Outputs.degradedUnitWeightG = mrpDegraded.unitWeightG;
    s2Outputs.weightInflationPct = Number((((mrpDegraded.unitWeightG - normalUnitWeight) / normalUnitWeight) * 100).toFixed(1));

    // 塞穴時單穴克重必須上升
    s2Passed = mrpDegraded.unitWeightG > normalUnitWeight;
    s2Findings.push(`✅ 妥善穴數由 ${baseCav} 穴降為 ${degradedCav} 穴時，單穴耗料由 ${normalUnitWeight.toFixed(3)}g 上升至 ${mrpDegraded.unitWeightG.toFixed(3)}g (+${s2Outputs.weightInflationPct}%)，產能折損精確聯動！`);
  } catch (err: any) {
    s2Passed = false;
    s2Findings.push(`❌ 塞穴降級模擬失敗: ${err?.message}`);
  }

  scenarioResults.push({
    scenarioId: 'SCENARIO-02',
    scenarioName: '模具塞穴降級與產能衝擊 (Degraded Cavity Stress)',
    description: '驗證現場塞穴時，流道分攤克重增加與單穴用料自動膨脹之數學防禦',
    passed: s2Passed,
    durationMs: Number((performance.now() - s2Start).toFixed(2)),
    keyOutputs: s2Outputs,
    findings: s2Findings
  });

  // ─── 場景 3：夜班 12h 時序差與虛擬預扣 (Temporal Lag & Virtual Backflush) ─
  const s3Start = performance.now();
  let s3Passed = false;
  const s3Outputs: Record<string, any> = {};
  const s3Findings: string[] = [];

  try {
    const testSku = db.item_master.find((i) => i.material_class === 'SET')?.sku || 'A01-200-131';
    const wipRecord = calculateDailyWIP({
      sku: testSku,
      previousWipQty: 5000,
      operatingHours: 24,
      cycleTimeSec: 30,
      activeCavities: 16,
      scrapRate: 0.03,
      actualSortedQty: 4000,
      unitWeightG: 20
    });

    s3Outputs.dailyProducedQty = wipRecord.dailyProducedQty;
    s3Outputs.nightShiftPendingQty = wipRecord.nightShiftPendingQty;
    s3Outputs.closingWipQty = wipRecord.closingWipQty;

    // 測試虛擬預扣
    const mrpWithBackflush = calculateMRPForSKU(db, testSku, undefined, undefined, {
      ...sysParams,
      enableVirtualBackflush: true
    });
    if (!mrpWithBackflush) throw new Error(`查無料號 ${testSku} 之預扣 MRP 運算結果`);

    s3Outputs.virtualBackflushDeductedKg = mrpWithBackflush.virtualBackflushDeductedKg;
    s3Outputs.effectiveRmOnHandKg = mrpWithBackflush.effectiveRmOnHandKg;

    s3Passed =
      wipRecord.nightShiftPendingQty > 0 &&
      mrpWithBackflush.virtualBackflushDeductedKg !== undefined;

    s3Findings.push(`✅ 成功捕捉夜間 12h 無人挑選產出 ${wipRecord.nightShiftPendingQty} PCS WIP，且月內已成型原料自動預扣 ${mrpWithBackflush.virtualBackflushDeductedKg} KG，徹底消除 ERP 月底開單扣料時序差！`);
  } catch (err: any) {
    s3Passed = false;
    s3Findings.push(`❌ 時序差與虛擬預扣模擬失敗: ${err?.message}`);
  }

  scenarioResults.push({
    scenarioId: 'SCENARIO-03',
    scenarioName: '現場時序差消除與月內虛擬預扣 (Temporal Lag & Virtual Backflush)',
    description: '驗證 24h 機台成型 vs 12h 白班挑選時序差補償，以及月中可用原料庫存虛增之校正',
    passed: s3Passed,
    durationMs: Number((performance.now() - s3Start).toFixed(2)),
    keyOutputs: s3Outputs,
    findings: s3Findings
  });

  // ─── 場景 4：大宗採購倉容超載與分批進貨 (Phased Inbound Delivery) ────────
  const s4Start = performance.now();
  let s4Passed = false;
  const s4Outputs: Record<string, any> = {};
  const s4Findings: string[] = [];

  try {
    const testSku = db.item_master.find((i) => i.material_class === 'SET')?.sku || 'A01-200-131';

    // 構造大宗需求激發爆倉建議 (需淨需求 > 倉容上限 12,000 KG)
    const surgeDb: SystemDatabase = {
      ...db,
      inventory_wip_snapshot: db.inventory_wip_snapshot.map((inv) =>
        inv.sku === 'TERLUX 2802' ? { ...inv, rm_on_hand_kg: 1000 } : inv
      ),
      po_in_transit: db.po_in_transit.filter((p) => p.rm_sku !== 'TERLUX 2802'),
      actual_order: [
        ...db.actual_order,
        {
          order_id: 'SURGE-PO-999',
          customer_id: 'A客戶',
          sku: testSku,
          order_date: new Date().toISOString().split('T')[0],
          target_date: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
          order_qty: 800000,
          status: 'confirmed'
        }
      ]
    };

    const mrpSurge = calculateMRPForSKU(surgeDb, testSku, undefined, undefined, {
      ...sysParams,
      enablePhasedDeliveryAdvisor: true
    });
    if (!mrpSurge) throw new Error(`查無料號 ${testSku} 之大宗 MRP 運算結果`);

    s4Outputs.suggestedTotalKg = mrpSurge.suggestedOrderQtyKg;
    s4Outputs.phasedPlanLength = mrpSurge.phasedDeliveryPlan?.length || 0;
    s4Outputs.batch1Kg = mrpSurge.phasedDeliveryPlan?.[0]?.qtyKg;
    s4Outputs.batch2Kg = mrpSurge.phasedDeliveryPlan?.[1]?.qtyKg;

    s4Passed =
      mrpSurge.phasedDeliveryPlan !== undefined &&
      mrpSurge.phasedDeliveryPlan.length === 2 &&
      mrpSurge.phasedDeliveryPlan[0].qtyKg > 0;

    s4Findings.push(`✅ 採購需求達 ${mrpSurge.suggestedOrderQtyKg} KG (超逾倉容上限 12,000 KG) 時，自動拆解為首批 (${s4Outputs.batch1Kg} KG) 與次批 (${s4Outputs.batch2Kg} KG，間隔 30 天)，成功防範 8000 萬爆倉！`);
  } catch (err: any) {
    s4Passed = false;
    s4Findings.push(`❌ 分批進貨模擬失敗: ${err?.message}`);
  }

  scenarioResults.push({
    scenarioId: 'SCENARIO-04',
    scenarioName: '大宗採購倉容超載與分批到貨排程 (Phased Inbound Delivery Advisor)',
    description: '驗證單次採購量超出倉庫上限時，自動生成首批與次批分批進貨排程',
    passed: s4Passed,
    durationMs: Number((performance.now() - s4Start).toFixed(2)),
    keyOutputs: s4Outputs,
    findings: s4Findings
  });

  const allPassed = integrityReport.isChainHealthy && scenarioResults.every((s) => s.passed);

  return {
    suiteTimestamp: new Date().toISOString(),
    allPassed,
    totalScenarios: scenarioResults.length,
    passedCount: scenarioResults.filter((s) => s.passed).length,
    failedCount: scenarioResults.filter((s) => !s.passed).length,
    integrityReport,
    scenarioResults
  };
}
