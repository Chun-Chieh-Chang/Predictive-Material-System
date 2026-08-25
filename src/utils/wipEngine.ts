/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface DailyWIPEstimationInput {
  sku: string;
  previousWipQty: number; // WIP(t-1) 前一日結存
  operatingHours: number; // 機台當日運轉工時 (e.g. 24h)
  cycleTimeSec: number; // 成型週期秒數
  activeCavities: number; // 當日開模妥善穴數
  scrapRate: number; // 估算不良率 (e.g. 0.03 for 3%)
  actualSortedQty: number; // S(t) 當日人工挑選全檢完工入庫量
  unitWeightG?: number; // 單穴重量 (克，含料頭流道)
}

interface DailyWIPEstimationResult {
  sku: string;
  previousWipQty: number;
  dailyProducedQty: number; // P(t) 當日機台成型產出量
  actualSortedQty: number; // S(t) 當日人工挑選入庫量
  closingWipQty: number; // WIP(t) 當日在製品暫存區結存量
  netWipDelta: number; // WIP 淨變動量 (P(t) - S(t))
  nightShiftPendingQty: number; // 夜間無人挑選積壓量 (約 50% 產出)
  rmConsumedKg: number; // 當日成型耗用原料 (KG)
  estimatedBoxes: number; // 預估暫存箱數 (以 3,000 PCS/箱估算)
  fifoAgingAlert: 'fresh' | 'warning' | 'critical'; // FIFO 庫齡警示
}

/**
 * 依據會議共識公式計算單日 WIP 動態推估量
 * P(t) = 工時 * (3600 / 週期) * 穴數 * (1 - 不良率)
 * WIP(t) = WIP(t-1) + P(t) - S(t)
 */
export function calculateDailyWIP(input: DailyWIPEstimationInput): DailyWIPEstimationResult {
  const {
    sku,
    previousWipQty,
    operatingHours,
    cycleTimeSec,
    activeCavities,
    scrapRate,
    actualSortedQty,
    unitWeightG = 20
  } = input;

  // P(t) 產出估算
  const cyclesPerHour = cycleTimeSec > 0 ? 3600 / cycleTimeSec : 0;
  const theoreticalOutput = operatingHours * cyclesPerHour * activeCavities;
  const dailyProducedQty = Math.round(theoreticalOutput * Math.max(0, 1 - scrapRate));

  // WIP(t) 結存
  const netWipDelta = dailyProducedQty - actualSortedQty;
  const closingWipQty = Math.max(0, previousWipQty + netWipDelta);

  // 夜間 12 小時 (20:00 ~ 08:00) 無人挑選產出量
  const nightShiftPendingQty = Math.round((dailyProducedQty / Math.max(1, operatingHours)) * Math.min(12, operatingHours));

  // 原料耗用 (KG)
  const rmConsumedKg = Number(((dailyProducedQty * unitWeightG) / 1000 / Math.max(0.01, 1 - scrapRate)).toFixed(2));

  // 預估暫存箱數 (一箱約 3,000 ~ 5,000 顆，取基準 3,500 顆)
  const estimatedBoxes = Math.ceil(closingWipQty / 3500);

  // FIFO 庫齡評估：若暫存箱數超過 200 箱，觸發先進先出預警
  let fifoAgingAlert: 'fresh' | 'warning' | 'critical' = 'fresh';
  if (estimatedBoxes > 300) {
    fifoAgingAlert = 'critical';
  } else if (estimatedBoxes > 150) {
    fifoAgingAlert = 'warning';
  }

  return {
    sku,
    previousWipQty,
    dailyProducedQty,
    actualSortedQty,
    closingWipQty,
    netWipDelta,
    nightShiftPendingQty,
    rmConsumedKg,
    estimatedBoxes,
    fifoAgingAlert
  };
}
