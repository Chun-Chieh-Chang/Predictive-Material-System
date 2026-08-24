/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  SystemDatabase,
  ItemMaster,
  MoldMaster,
  ProductMoldBOM,
  DemandForecastLog,
  ActualOrder,
  InventoryWIPSnapshot,
  POInTransit,
  SortingActualYieldLog
} from '../types';
import { DEMO_SAMPLE_DATABASE } from '../data/seedData';

export interface ValidationReport {
  success: boolean;
  importedCounts: { [table: string]: number };
  errors: string[];
  warnings: string[];
}

// 1. Export to JSON
export function exportToJSON(db: SystemDatabase, filename = 'Predictive_Material_System_Data.json') {
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 0. Data Specification Dictionary (各權責單位填報規範與勾稽防呆清單 - 嚴格遵守 MECE 原則)
const DATA_SPECIFICATION_DICTIONARY = [
  // 1. 品號主檔 (含良率與採購規則 - 權責: 資材(生管) / 品保 / 採購)
  { '工作表': '品號主檔', '欄位名稱': '品號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (英數，如 A01-200-131)', '勾稽與防呆規則': '全系統唯一識別碼，不可重複 (對接 ERP 品號)', '填寫範例': 'A01-200-131' },
  { '工作表': '品號主檔', '欄位名稱': '替代品號', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '工程變更或舊料號對照', '填寫範例': 'R1-2355' },
  { '工作表': '品號主檔', '欄位名稱': '客戶代碼', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '文字代碼 (如 A客戶, B客戶, 通用客戶)', '勾稽與防呆規則': '用於區分客戶需求權限，通用原物料可填 通用客戶', '填寫範例': 'A客戶' },
  { '工作表': '品號主檔', '欄位名稱': '物料分類', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】RAW (原料類) / MAT (物料類) / PART (零件類) / COMP (組件類) / SET (SET類)', '勾稽與防呆規則': '五層核心物料分類，決定 MRP 運算層級與庫存型態', '填寫範例': 'SET' },
  { '工作表': '品號主檔', '欄位名稱': '產品種類', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 T接頭, 塑膠本體, ABS原粒)', '勾稽與防呆規則': '業務與產品規格種類說明 (對接 ERP 品名規格)', '填寫範例': 'T接頭' },
  { '工作表': '品號主檔', '欄位名稱': '外觀顏色', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字 (如 本色, 藍色, 黑色)', '勾稽與防呆規則': '料件色系識別', '填寫範例': '本色' },
  { '工作表': '品號主檔', '欄位名稱': '計量單位', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】PCS (件數) / KG (公斤) / SET (套數)', '勾稽與防呆規則': '製品通常為 PCS/SET，原料為 KG (對接 ERP 計量單位)', '填寫範例': 'PCS' },
  { '工作表': '品號主檔', '欄位名稱': '標準全檢良率', '權責單位': '品保', '必填/選填': '選填 (PART/COMP/SET 填)', '允許選項 / 資料型態': '數值 (0.01 ~ 1.0，如 0.98)', '勾稽與防呆規則': '在製品 (WIP) 待驗品良品折算率', '填寫範例': '0.98' },
  { '工作表': '品號主檔', '欄位名稱': '供應商名稱', '權責單位': '採購', '必填/選填': '選填 (RAW 填)', '允許選項 / 資料型態': '文字 (如 A供應商 (國內陸運))', '勾稽與防呆規則': '供貨廠商名稱', '填寫範例': 'A供應商 (國內陸運)' },
  { '工作表': '品號主檔', '欄位名稱': '採購交期_天', '權責單位': '採購', '必填/選填': '選填 (RAW 填)', '允許選項 / 資料型態': '正整數 (天數，如 90)', '勾稽與防呆規則': '採購 Lead Time，用於倒推最晚發單日', '填寫範例': '90' },
  { '工作表': '品號主檔', '欄位名稱': '最小起訂量_KG', '權責單位': '採購', '必填/選填': '選填 (RAW 填)', '允許選項 / 資料型態': '正數 (公斤，如 500)', '勾稽與防呆規則': 'MOQ 向上取整整補', '填寫範例': '500' },
  { '工作表': '品號主檔', '欄位名稱': '安全庫存量_KG', '權責單位': '採購', '必填/選填': '選填 (RAW 填)', '允許選項 / 資料型態': '正數 (公斤，如 200)', '勾稽與防呆規則': '常備安全庫存', '填寫範例': '200' },
  { '工作表': '品號主檔', '欄位名稱': '備註說明', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '品名完整詳細說明', '填寫範例': 'T接頭 (T-Connector)' },

  // 2. 模具與產能主檔 (權責: 製造)
  { '工作表': '模具與產能主檔', '欄位名稱': '模具編號', '權責單位': '製造', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 MI17193)', '勾稽與防呆規則': '模具實體編號，不可重複', '填寫範例': 'MI17193' },
  { '工作表': '模具與產能主檔', '欄位名稱': '妥善穴數', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (如 16, 22)', '勾稽與防呆規則': '目前產線實際可注塑出模之有效穴數（扣除塞穴）', '填寫範例': '22' },
  { '工作表': '模具與產能主檔', '欄位名稱': '成型週期_秒', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '正數 (秒，如 27.1)', '勾稽與防呆規則': '射出成型標準秒數，必須 > 0，用於推算 24h 日產能', '填寫範例': '27.1' },
  { '工作表': '模具與產能主檔', '欄位名稱': '運行狀態', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】active (正常量產) / maintenance (保養維修中) / trial (試模階段) / retired (封存報廢)', '勾稽與防呆規則': '非 active 模具於 MRP 模擬時會提示保養或停用警訊', '填寫範例': 'active' },

  // 3. 產品模具成型關聯檔 (權責: 工程)
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '品號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應製品品號 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「品號主檔」中', '填寫範例': 'A01-200-131' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '模具編號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應模具主檔)', '勾稽與防呆規則': '必須存在於「模具與產能主檔」中', '填寫範例': 'MI17193' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '使用原料品號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應原料品號 RAW)', '勾稽與防呆規則': '必須存在於「品號主檔」中且分類為 RAW', '填寫範例': 'TERLUX 2802' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '整模重量_克', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '正數 (公克，不含流道)', '勾稽與防呆規則': '一模所有產品淨重總和', '填寫範例': '80.0' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '流道重量_克', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '正數或 0 (公克)', '勾稽與防呆規則': '冷流道或副流道重量', '填寫範例': '16.0' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '是否為主模', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】TRUE (主模) / FALSE (備用模)', '勾稽與防呆規則': '每個品號建議至少指定一副主模 (TRUE)，備料推算基準', '填寫範例': 'TRUE' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '標準生產損耗率', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '數值 (0.0 ~ 0.15，如 3% 填 0.03)', '勾稽與防呆規則': '射出成型正常調機、啟動與料頭損耗 (不可超過計價成本上限 15%)', '填寫範例': '0.03' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '色母/色粉配比(%)', '權責單位': '工程', '必填/選填': '選填', '允許選項 / 資料型態': '數值 (如 3.0 代表 3%)', '勾稽與防呆規則': '色母或色粉混合配比，本色件填 0 或留空', '填寫範例': '3.0' },

  // 4. 業務預估需求檔 (權責: 業務)
  { '工作表': '業務預估需求檔', '欄位名稱': '需求序號', '權責單位': '業務', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 FC-202608-001)', '勾稽與防呆規則': '預估單流水號', '填寫範例': 'FC-202608-001' },
  { '工作表': '業務預估需求檔', '欄位名稱': '預估版本號', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 202608-W1)', '勾稽與防呆規則': 'Forecast 週滾動版本', '填寫範例': '202608-W1' },
  { '工作表': '業務預估需求檔', '欄位名稱': '客戶代碼', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 A客戶, B客戶)', '勾稽與防呆規則': '需求所屬客戶代號', '填寫範例': 'A客戶' },
  { '工作表': '業務預估需求檔', '欄位名稱': '需求品號', '權責單位': '業務', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應品號主檔 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「品號主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '業務預估需求檔', '欄位名稱': '需求交期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '格式必須為 YYYY-MM-DD，用於倒推下單期限', '填寫範例': '2026-11-30' },
  { '工作表': '業務預估需求檔', '欄位名稱': '預估需求量_PCS', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (PCS)', '勾稽與防呆規則': '客戶預測總交貨件數', '填寫範例': '100000' },

  // 5. 實際訂單檔 (權責: 業務)
  { '工作表': '實際訂單檔', '欄位名稱': '訂單號', '權責單位': '業務', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 PO-A-01)', '勾稽與防呆規則': '客戶正式採購單號 (Customer PO)', '填寫範例': 'PO-A-01' },
  { '工作表': '實際訂單檔', '欄位名稱': '客戶代碼', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 A客戶, B客戶)', '勾稽與防呆規則': '訂單客戶代碼', '填寫範例': 'A客戶' },
  { '工作表': '實際訂單檔', '欄位名稱': '訂單品號', '權責單位': '業務', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應品號主檔 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「品號主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '實際訂單檔', '欄位名稱': '下單日期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '客戶正式發單日期', '填寫範例': '2026-08-01' },
  { '工作表': '實際訂單檔', '欄位名稱': '約定交期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '承諾出貨交期', '填寫範例': '2026-11-30' },
  { '工作表': '實際訂單檔', '欄位名稱': '實際訂單量_PCS', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (PCS)', '勾稽與防呆規則': '正式訂單數量', '填寫範例': '50000' },
  { '工作表': '實際訂單檔', '欄位名稱': '訂單狀態', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】confirmed (已確認) / in_production (生產中) / partial_shipped (部分出貨) / completed (已結案) / cancelled (已取消)', '勾稽與防呆規則': '僅 confirmed、in_production 與 partial_shipped 計入需求運算', '填寫範例': 'confirmed' },

  // 6. 庫存與待驗快照檔 (權責: 資材(生管))
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '快照結算日', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '結算盤點基準日', '填寫範例': '2026-08-20' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '料號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK, FK)', '允許選項 / 資料型態': '文字 (對應製品或原料品號)', '勾稽與防呆規則': '必須存在於「品號主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '成品在庫良品_PCS', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負整數 (PCS)', '勾稽與防呆規則': '庫房已檢驗合格可立即出貨之庫存 (若為原料請填0)', '填寫範例': '15000' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': 'Sorting待驗品_PCS', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負整數 (PCS)', '勾稽與防呆規則': '射出完成但尚未經全檢之 WIP (若為原料請填0)', '填寫範例': '20000' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '原料可用庫存_KG', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負數 (KG)', '勾稽與防呆規則': '原料倉庫實體在庫可用原料公斤數 (若為成品請填0)', '填寫範例': '0' },

  // 7. 在途採購訂單檔 (權責: 資材(生管))
  { '工作表': '在途採購訂單檔', '欄位名稱': '採購單號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 PO-RM-01)', '勾稽與防呆規則': '向原料廠發出之正式發單 PO 號', '填寫範例': 'PO-RM-01' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '原料品號', '權責單位': '資材(生管)', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應原料品號 RAW)', '勾稽與防呆規則': '必須存在於「品號主檔」且分類為 RAW', '填寫範例': 'TERLUX 2802' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '在途採購量_KG', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '正數 (KG)', '勾稽與防呆規則': '正在海上航運或報關中的數量', '填寫範例': '5000' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '預計到廠日', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '海運 ETA 日期，比對是否趕得上需求交期', '填寫範例': '2026-09-15' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '供應商名稱', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字 (如 INEOS)', '勾稽與防呆規則': '發單之供應商名稱', '填寫範例': 'INEOS' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '在途狀態', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】ordered (已發單排產) / shipping (海上航運中) / customs (清關中) / arrived (已到廠驗收)', '勾稽與防呆規則': '尚未入庫之在途狀態', '填寫範例': 'shipping' }
];

// 2. Export to Excel (.xlsx) with all 9 sheets in Chinese
export function exportToExcel(db: SystemDatabase, filename = '料事如神系統_全表資料庫.xlsx') {
  const wb = XLSX.utils.book_new();

  // Helper Lookups
  const itemMap = new Map(db.item_master.map((i) => [i.sku, i]));

  // Sheet 0: 填報規範與勾稽字典 (首頁引導)
  const wsDict = XLSX.utils.json_to_sheet(DATA_SPECIFICATION_DICTIONARY);
  XLSX.utils.book_append_sheet(wb, wsDict, '填報規範與勾稽字典');

  // Sheet 1: 料號基本主檔 (資材(生管))
  const itemData = db.item_master.map((i) => ({
    '品號': i.sku,
    '客戶代碼': i.customer_id,
    '物料分類': i.material_class || '',
    '物料類別': i.category,
    '外觀顏色': i.color || '',
    '計量單位': i.unit,
    '標準全檢良率': i.std_sorting_yield != null ? i.std_sorting_yield : '',
    '供應商名稱': i.supplier_name || '',
    '採購交期_天': i.lead_time_days != null ? i.lead_time_days : '',
    '最小起訂量_KG': i.moq_kg != null ? i.moq_kg : '',
    '安全庫存量_KG': i.safety_stock_kg != null ? i.safety_stock_kg : '',
    '備註說明': i.description || ''
  }));
  const wsItem = XLSX.utils.json_to_sheet(itemData);
  XLSX.utils.book_append_sheet(wb, wsItem, '品號主檔');

  // Sheet 2: 模具與產能主檔 (製造)
  const moldData = db.mold_master.map((m) => {
    const linkedBoms = db.product_mold_bom.filter((b) => b.mold_id === m.mold_id);
    const linkedSkus = linkedBoms.map((b) => `${b.sku}${b.is_primary_mold ? '(主模)' : '(備用)'}`).join(', ');
    return {
      '模具編號': m.mold_id,
      '對應生產品號': linkedSkus || '無對應品號',
      '妥善穴數': m.active_cavities,
      '成型週期_秒': m.cycle_time_sec,
      '日產能_PCS(系統計算)': Math.round((86400 / m.cycle_time_sec) * m.active_cavities),
      '運行狀態': m.status || 'active'
    };
  });
  const wsMold = XLSX.utils.json_to_sheet(moldData);
  XLSX.utils.book_append_sheet(wb, wsMold, '模具與產能主檔');

  // Sheet 3: 產品模具成型關聯檔 (工程)
  const bomData = db.product_mold_bom.map((b) => {
    const mold = db.mold_master.find((m) => m.mold_id === b.mold_id);
    const cav = mold?.active_cavities || 16;
    const unitWeight = Number(((b.net_mold_weight_g + b.runner_weight_g) / cav).toFixed(3));
    const fgItem = itemMap.get(b.sku);
    const rmItem = itemMap.get(b.rm_sku);
    return {
      '品號': b.sku,
      '成品品名(參考)': fgItem?.description || fgItem?.category || '',
      '模具編號': b.mold_id,
      '使用原料品號': b.rm_sku,
      '原料說明(參考)': rmItem?.description || rmItem?.category || '',
      '整模重量_克': b.net_mold_weight_g,
      '流道重量_克': b.runner_weight_g,
      '單穴克重_克(系統計算)': unitWeight,
      '是否為主模': b.is_primary_mold ? 'TRUE' : 'FALSE',
      '標準生產損耗率': b.std_mfg_scrap_rate,
      '色母/色粉配比(%)': b.color_mixing_ratio_pct ? Number(b.color_mixing_ratio_pct).toFixed(1) : '—',
    };
  });
  const wsBOM = XLSX.utils.json_to_sheet(bomData);
  XLSX.utils.book_append_sheet(wb, wsBOM, '產品模具成型關聯檔');

  // Sheet 6: 業務預估需求檔 (業務)
  const forecastData = db.demand_forecast_log.map((f) => {
    const fgItem = itemMap.get(f.sku);
    return {
      '需求序號': f.demand_id,
      '預估版本號': f.version_no,
      '客戶代碼': f.customer_id,
      '需求品號': f.sku,
      '成品品名(參考)': fgItem?.description || fgItem?.category || '',
      '需求交期': f.target_date,
      '預估需求量_PCS': f.demand_qty
    };
  });
  const wsForecast = XLSX.utils.json_to_sheet(forecastData);
  XLSX.utils.book_append_sheet(wb, wsForecast, '業務預估需求檔');

  // Sheet 7: 實際訂單檔 (業務)
  const orderData = db.actual_order.map((o) => {
    const fgItem = itemMap.get(o.sku);
    return {
      '訂單號': o.order_id,
      '客戶代碼': o.customer_id,
      '訂單品號': o.sku,
      '成品品名(參考)': fgItem?.description || fgItem?.category || '',
      '下單日期': o.order_date,
      '約定交期': o.target_date,
      '實際訂單量_PCS': o.order_qty,
      '訂單狀態': o.status || 'confirmed'
    };
  });
  const wsOrder = XLSX.utils.json_to_sheet(orderData);
  XLSX.utils.book_append_sheet(wb, wsOrder, '實際訂單檔');

  // Sheet 8: 庫存與待驗快照檔 (資材(生管))
  const invData = db.inventory_wip_snapshot.map((inv) => {
    const item = itemMap.get(inv.sku);
    return {
      '快照結算日': inv.snapshot_date,
      '料號': inv.sku,
      '品名/物料說明(參考)': item?.description || item?.category || '',
      '成品在庫良品_PCS': inv.fg_ready_qty,
      'Sorting待驗品_PCS': inv.wip_pending_qty,
      '原料可用庫存_KG': inv.rm_on_hand_kg
    };
  });
  const wsInv = XLSX.utils.json_to_sheet(invData);
  XLSX.utils.book_append_sheet(wb, wsInv, '庫存與待驗快照檔');

  // Sheet 9: 在途採購訂單檔 (資材(生管))
  const poData = db.po_in_transit.map((p) => {
    const rmItem = itemMap.get(p.rm_sku);
    return {
      '採購單號': p.po_number,
      '原料品號': p.rm_sku,
      '原料說明(參考)': rmItem?.description || rmItem?.category || '',
      '在途採購量_KG': p.in_transit_qty_kg,
      '預計到廠日': p.eta_date,
      '供應商名稱': p.supplier_name || '',
      '在途狀態': p.status
    };
  });
  const wsPO = XLSX.utils.json_to_sheet(poData);
  XLSX.utils.book_append_sheet(wb, wsPO, '在途採購訂單檔');

  // Sheet 8: Sorting 實際良率紀錄檔 (品保)
  const sortingData = (db.sorting_actual_yield_log || []).map((s) => {
    const fgItem = itemMap.get(s.sku);
    return {
      '紀錄編號': s.log_id,
      '品號': s.sku,
      '成品品名(參考)': fgItem?.description || fgItem?.category || '',
      '生產批號': s.batch_no,
      '全檢日期': s.sorting_date,
      '全檢數量_PCS': s.qty_sorted,
      '合格數量_PCS': s.qty_passed,
      '實際全檢良率': s.actual_yield_rate ? `${(s.actual_yield_rate * 100).toFixed(2)}%` : '',
      '作業員ID': s.operator_id,
      '備註': s.notes || ''
    };
  });
  if (sortingData.length > 0) {
    const wsSorting = XLSX.utils.json_to_sheet(sortingData);
    XLSX.utils.book_append_sheet(wb, wsSorting, 'Sorting實際良率紀錄');
  }

  // Sheet 9: 變更稽核日誌 (唯讀匯出，不可從此工作表匯入覆蓋)
  const auditLog = db.audit_log || [];
  const auditData = auditLog.length > 0
    ? auditLog.map((entry) => ({
        '稽核序號': entry.id,
        '異動時間': entry.timestamp.replace('T', ' ').slice(0, 19),
        '資料表': entry.table_key,
        '主鍵值': entry.pk_value,
        '欄位名稱': entry.field_label,
        '舊值': entry.old_value,
        '新值': entry.new_value,
        '異動等級': entry.change_level === 3 ? 'L3 工程變更' : 'L2 影響確認',
        '變更原因': entry.reason || '—',
      }))
    : [{ '稽核序號': '(尚無變更記錄)', '異動時間': '', '資料表': '', '主鍵值': '', '欄位名稱': '', '舊值': '', '新值': '', '異動等級': '', '變更原因': '' }];
  const wsAudit = XLSX.utils.json_to_sheet(auditData);
  XLSX.utils.book_append_sheet(wb, wsAudit, '變更稽核日誌(唯讀)');

  XLSX.writeFile(wb, filename);
}


// 3. Download Formal Blank Template (正式空白填報範本 - 純淨無假資料，權責單位專用)
export function downloadTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // Sheet 0: 填報規範與勾稽字典 (首頁引導，符合 MECE 權責分工)
  const wsDict = XLSX.utils.json_to_sheet(DATA_SPECIFICATION_DICTIONARY);
  XLSX.utils.book_append_sheet(wb, wsDict, '填報規範與勾稽字典');

  // Sheet 1: 品號主檔 (含良率與採購規則 - 資材/品保/採購)
  const itemHeaders = [{
    '品號': '', '替代品號': '', '客戶代碼': '', '物料分類': '', '物料類別': '',
    '外觀顏色': '', '計量單位': '', '標準全檢良率': '', '供應商名稱': '',
    '採購交期_天': '', '最小起訂量_KG': '', '安全庫存量_KG': '', '備註說明': ''
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemHeaders), '品號主檔');

  // Sheet 2: 模具與產能主檔 (製造)
  const moldHeaders = [{ '模具編號': '', '妥善穴數': '', '成型週期_秒': '', '運行狀態': 'active' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(moldHeaders), '模具與產能主檔');

  // Sheet 3: 產品模具成型關聯檔 (工程)
  const bomHeaders = [{
    '品號': '', '模具編號': '', '使用原料品號': '', '整模重量_克': '',
    '流道重量_克': '', '是否為主模': 'TRUE', '標準生產損耗率': '0.03', '色母/色粉配比(%)': ''
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bomHeaders), '產品模具成型關聯檔');

  // Sheet 4: 業務預估需求檔 (業務)
  const forecastHeaders = [{ '需求序號': '', '預估版本號': '', '客戶代碼': '', '需求品號': '', '需求交期': '', '預估需求量_PCS': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(forecastHeaders), '業務預估需求檔');

  // Sheet 5: 實際訂單檔 (業務)
  const orderHeaders = [{ '訂單號': '', '客戶代碼': '', '訂單品號': '', '下單日期': '', '約定交期': '', '實際訂單量_PCS': '', '訂單狀態': 'confirmed' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderHeaders), '實際訂單檔');

  // Sheet 6: 庫存與待驗快照檔 (資材(生管))
  const invHeaders = [{ '快照結算日': '', '料號': '', '成品在庫良品_PCS': '', 'Sorting待驗品_PCS': '', '原料可用庫存_KG': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invHeaders), '庫存與待驗快照檔');

  // Sheet 7: 在途採購訂單檔 (資材(生管))
  const poHeaders = [{ '採購單號': '', '原料品號': '', '在途採購量_KG': '', '預計到廠日': '', '供應商名稱': '', '在途狀態': 'shipping' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poHeaders), '在途採購訂單檔');

  // Sheet 8: Sorting 實際良率紀錄檔 (品保)
  const sortingHeaders = [{ '紀錄編號': '', '品號': '', '生產批號': '', '全檢日期': '', '全檢數量_PCS': '', '合格數量_PCS': '', '作業員ID': '', '備註': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sortingHeaders), 'Sorting實際良率紀錄');

  XLSX.writeFile(wb, '料事如神系統_正式空白匯入範本_v2.0.xlsx');
}

// 3b. Download Demo / Training Sample Excel (離線示範演練測試包 - 標註 SAMPLE 專用)
export function downloadDemoSampleExcel() {
  exportToExcel(DEMO_SAMPLE_DATABASE, '料事如神系統_示範演練數據包_SAMPLE.xlsx');
}

// 4. Validate & Import JSON
export function importFromJSON(jsonText: string, currentDB: SystemDatabase): { db: SystemDatabase; report: ValidationReport } {
  const report: ValidationReport = {
    success: false,
    importedCounts: {},
    errors: [],
    warnings: []
  };

  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      report.errors.push('JSON 格式錯誤：根物件必須為 Object');
      return { db: currentDB, report };
    }

    const newDB: SystemDatabase = { ...currentDB };

    // Validate and Upsert item_master
    if (Array.isArray(parsed.item_master)) {
      let count = 0;
      parsed.item_master.forEach((row: any, idx: number) => {
        if (!row.sku || !row.customer_id || !row.category) {
          report.warnings.push(`[料號主檔] 第 ${idx + 1} 筆資料缺少必填品號/客戶/類別，已略過`);
          return;
        }
        const existingIdx = newDB.item_master.findIndex((i) => i.sku === row.sku);
        const item: ItemMaster = {
          sku: String(row.sku).trim(),
          alt_sku: row.alt_sku ? String(row.alt_sku).trim() : null,
          customer_id: String(row.customer_id).trim(),
          category: String(row.category).trim(),
          material_class: row.material_class ? String(row.material_class).trim().toUpperCase() as any : null,
          color: row.color ? String(row.color).trim() : '',
          unit: row.unit ? String(row.unit).trim() : 'PCS',
          description: row.description ? String(row.description).trim() : '',
          std_sorting_yield: row.std_sorting_yield != null ? Number(row.std_sorting_yield) : null,
          supplier_name: row.supplier_name ? String(row.supplier_name).trim() : null,
          lead_time_days: row.lead_time_days != null ? Number(row.lead_time_days) : null,
          moq_kg: row.moq_kg != null ? Number(row.moq_kg) : null,
          safety_stock_kg: row.safety_stock_kg != null ? Number(row.safety_stock_kg) : null
        };
        if (existingIdx >= 0) {
          newDB.item_master[existingIdx] = item;
        } else {
          newDB.item_master.push(item);
        }
        count++;
      });
      report.importedCounts['品號主檔'] = count;
    }

    // Validate and Upsert mold_master
    if (Array.isArray(parsed.mold_master)) {
      let count = 0;
      parsed.mold_master.forEach((row: any, idx: number) => {
        if (!row.mold_id) {
          report.warnings.push(`[模具主檔] 第 ${idx + 1} 筆缺少 mold_id，已略過`);
          return;
        }
        const existingIdx = newDB.mold_master.findIndex((m) => m.mold_id === row.mold_id);
        const mold: MoldMaster = {
          mold_id: String(row.mold_id).trim(),
          active_cavities: Math.max(1, Number(row.active_cavities) || 16),
          cycle_time_sec: Math.max(1, Number(row.cycle_time_sec) || 30),
          status: row.status || 'active'
        };
        if (existingIdx >= 0) {
          newDB.mold_master[existingIdx] = mold;
        } else {
          newDB.mold_master.push(mold);
        }
        count++;
      });
      report.importedCounts['模具與產能主檔'] = count;
    }

    // Validate and Upsert product_mold_bom
    if (Array.isArray(parsed.product_mold_bom)) {
      let count = 0;
      parsed.product_mold_bom.forEach((row: any) => {
        if (!row.sku || !row.mold_id || !row.rm_sku) return;
        const existingIdx = newDB.product_mold_bom.findIndex(
          (b) => b.sku === row.sku && b.mold_id === row.mold_id
        );
        const bom: ProductMoldBOM = {
          sku: String(row.sku).trim(),
          mold_id: String(row.mold_id).trim(),
          rm_sku: String(row.rm_sku).trim(),
          net_mold_weight_g: Number(row.net_mold_weight_g) || 0,
          runner_weight_g: Number(row.runner_weight_g) || 0,
          is_primary_mold: Boolean(row.is_primary_mold),
          std_mfg_scrap_rate: Number(row.std_mfg_scrap_rate) || 0.03,
          color_mixing_ratio_pct: row.color_mixing_ratio_pct != null ? Number(row.color_mixing_ratio_pct) : null,
        };
        if (existingIdx >= 0) {
          newDB.product_mold_bom[existingIdx] = bom;
        } else {
          newDB.product_mold_bom.push(bom);
        }
        count++;
      });
      report.importedCounts['產品模具成型關聯檔'] = count;
    }

    // Validate and Upsert sorting_actual_yield_log
    if (Array.isArray(parsed.sorting_actual_yield_log)) {
      let count = 0;
      parsed.sorting_actual_yield_log.forEach((row: any) => {
        if (!row.log_id || !row.sku) return;
        const existingIdx = newDB.sorting_actual_yield_log.findIndex((s) => s.log_id === row.log_id);
        const sortingLog: SortingActualYieldLog = {
          log_id: String(row.log_id).trim(),
          sku: String(row.sku).trim(),
          batch_no: String(row.batch_no || '').trim(),
          sorting_date: String(row.sorting_date || new Date().toISOString().slice(0, 10)),
          qty_sorted: Number(row.qty_sorted) || 0,
          qty_passed: Number(row.qty_passed) || 0,
          actual_yield_rate: Number(row.actual_yield_rate) || (row.qty_sorted ? Number(row.qty_passed) / Number(row.qty_sorted) : 1),
          operator_id: String(row.operator_id || '').trim(),
          notes: row.notes ? String(row.notes).trim() : null,
          created_at: row.created_at || new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          newDB.sorting_actual_yield_log[existingIdx] = sortingLog;
        } else {
          newDB.sorting_actual_yield_log.push(sortingLog);
        }
        count++;
      });
      report.importedCounts['Sorting實際良率紀錄'] = count;
    }

    // Legacy migration: merge yield_master & supplier_rule_master into item_master if present in JSON backup
    if (Array.isArray((parsed as any).yield_master)) {
      (parsed as any).yield_master.forEach((y: any) => {
        const item = newDB.item_master.find(i => i.sku === y.sku);
        if (item && y.std_sorting_yield != null) {
          item.std_sorting_yield = Number(y.std_sorting_yield);
        }
      });
      report.importedCounts['Sorting良率標準 (已合併至品號)'] = (parsed as any).yield_master.length;
    }
    if (Array.isArray((parsed as any).supplier_rule_master)) {
      (parsed as any).supplier_rule_master.forEach((s: any) => {
        const item = newDB.item_master.find(i => i.sku === s.rm_sku);
        if (item) {
          if (s.supplier_name) item.supplier_name = String(s.supplier_name);
          if (s.lead_time_days != null) item.lead_time_days = Number(s.lead_time_days);
          if (s.moq_kg != null) item.moq_kg = Number(s.moq_kg);
          if (s.safety_stock_kg != null) item.safety_stock_kg = Number(s.safety_stock_kg);
        }
      });
      report.importedCounts['採購與供應商規則 (已合併至品號)'] = (parsed as any).supplier_rule_master.length;
    }
    if (Array.isArray(parsed.demand_forecast_log)) {
      newDB.demand_forecast_log = parsed.demand_forecast_log;
      report.importedCounts['業務預估需求檔'] = parsed.demand_forecast_log.length;
    }
    if (Array.isArray(parsed.actual_order)) {
      newDB.actual_order = parsed.actual_order;
      report.importedCounts['實際訂單檔'] = parsed.actual_order.length;
    }
    if (Array.isArray(parsed.inventory_wip_snapshot)) {
      newDB.inventory_wip_snapshot = parsed.inventory_wip_snapshot;
      report.importedCounts['庫存與待驗快照檔'] = parsed.inventory_wip_snapshot.length;
    }
    if (Array.isArray(parsed.po_in_transit)) {
      const validPoStatuses = ['ordered', 'shipping', 'customs', 'arrived', 'delayed', 'partial_arrived'];
      const validatedPOs: POInTransit[] = parsed.po_in_transit.map((p: any) => {
        const item: POInTransit = {
          po_number: String(p.po_number || '').trim(),
          rm_sku: String(p.rm_sku || '').trim(),
          in_transit_qty_kg: Number(p.in_transit_qty_kg) || 0,
          eta_date: String(p.eta_date || '').trim(),
          supplier_name: p.supplier_name ? String(p.supplier_name).trim() : undefined,
          status: 'shipping'
        };
        const rawStatus = String(p.status || 'shipping').trim().toLowerCase();
        if (validPoStatuses.includes(rawStatus)) {
          item.status = rawStatus as any;
        }
        return item;
      });
      newDB.po_in_transit = validatedPOs;
      report.importedCounts['在途採購訂單檔'] = validatedPOs.length;
    }

    // Execute deep relational chain audit
    runRelationalAudit(newDB, report);

    report.success = report.errors.length === 0;
    return { db: newDB, report };
  } catch (err: any) {
    report.errors.push(`JSON 解析失敗: ${err.message}`);
    return { db: currentDB, report };
  }
}

// 5. Parse and Import Excel File
export async function importFromExcel(file: File, currentDB: SystemDatabase): Promise<{ db: SystemDatabase; report: ValidationReport }> {
  const report: ValidationReport = {
    success: false,
    importedCounts: {},
    errors: [],
    warnings: []
  };

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const newDB: SystemDatabase = { ...currentDB };

    // Sheet: 品號主檔 (含良率與採購規則)
    const sheetItem = workbook.Sheets['品號主檔'] || workbook.Sheets['料號基本主檔'] || workbook.Sheets['item_master'];
    if (sheetItem) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetItem);
      let count = 0;
      rows.forEach((r) => {
        const sku = r['品號'] || r['sku'];
        if (!sku) return;
        const rawClass = r['物料分類'] || r['material_class'] || r['分類'];
        const item: ItemMaster = {
          sku: String(sku).trim(),
          alt_sku: r['替代品號'] || r['alt_sku'] ? String(r['替代品號'] || r['alt_sku']).trim() : null,
          customer_id: String(r['客戶代碼'] || r['customer_id'] || 'GENERIC').trim(),
          material_class: rawClass ? String(rawClass).trim().toUpperCase() as any : null,
          category: String(r['物料類別'] || r['category'] || '零件').trim(),
          color: String(r['外觀顏色'] || r['color'] || '本色').trim(),
          unit: String(r['計量單位'] || r['unit'] || 'PCS').trim(),
          description: String(r['備註說明'] || r['description'] || '').trim(),
          std_sorting_yield: r['標準全檢良率'] != null && r['標準全檢良率'] !== '' ? Number(r['標準全檢良率']) : (r['std_sorting_yield'] != null ? Number(r['std_sorting_yield']) : undefined),
          supplier_name: r['供應商名稱'] ? String(r['供應商名稱']).trim() : (r['supplier_name'] ? String(r['supplier_name']).trim() : undefined),
          lead_time_days: r['採購交期_天'] != null && r['採購交期_天'] !== '' ? Number(r['採購交期_天']) : (r['lead_time_days'] != null ? Number(r['lead_time_days']) : undefined),
          moq_kg: r['最小起訂量_KG'] != null && r['最小起訂量_KG'] !== '' ? Number(r['最小起訂量_KG']) : (r['moq_kg'] != null ? Number(r['moq_kg']) : undefined),
          safety_stock_kg: r['安全庫存量_KG'] != null && r['安全庫存量_KG'] !== '' ? Number(r['安全庫存量_KG']) : (r['safety_stock_kg'] != null ? Number(r['safety_stock_kg']) : undefined)
        };
        const idx = newDB.item_master.findIndex((i) => i.sku === item.sku);
        if (idx >= 0) newDB.item_master[idx] = item;
        else newDB.item_master.push(item);
        count++;
      });
      report.importedCounts['品號主檔'] = count;
    }

    // Sheet: 模具與產能主檔
    const sheetMold = workbook.Sheets['模具與產能主檔'] || workbook.Sheets['mold_master'];
    if (sheetMold) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetMold);
      let count = 0;
      rows.forEach((r) => {
        const moldId = r['模具編號'] || r['mold_id'];
        if (!moldId) return;
        const activeCav = Number(r['妥善穴數'] || r['active_cavities'] || r['設計穴數'] || 16);
        const mold: MoldMaster = {
          mold_id: String(moldId).trim(),
          active_cavities: Math.max(1, activeCav),
          cycle_time_sec: Number(r['成型週期_秒'] || r['cycle_time_sec'] || 25),
          status: r['運行狀態'] || 'active'
        };
        const idx = newDB.mold_master.findIndex((m) => m.mold_id === mold.mold_id);
        if (idx >= 0) newDB.mold_master[idx] = mold;
        else newDB.mold_master.push(mold);
        count++;
      });
      report.importedCounts['模具與產能主檔'] = count;
    }

    // Sheet: 產品模具成型關聯檔
    const sheetBOM = workbook.Sheets['產品模具成型關聯檔'] || workbook.Sheets['product_mold_bom'];
    if (sheetBOM) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetBOM);
      let count = 0;
      rows.forEach((r) => {
        const sku = r['品號'] || r['sku'];
        const moldId = r['模具編號'] || r['mold_id'];
        const rmSku = r['使用原料品號'] || r['rm_sku'];
        if (!sku || !moldId || !rmSku) return;
        const isPrimary = String(r['是否為主模'] || r['is_primary_mold']).toUpperCase() === 'TRUE' || r['是否為主模'] === true;
        const bom: ProductMoldBOM = {
          sku: String(sku).trim(),
          mold_id: String(moldId).trim(),
          rm_sku: String(rmSku).trim(),
          net_mold_weight_g: Number(r['整模重量_克'] || r['net_mold_weight_g'] || 10),
          runner_weight_g: Number(r['流道重量_克'] || r['runner_weight_g'] || 5),
          is_primary_mold: isPrimary,
          std_mfg_scrap_rate: Number(r['標準生產損耗率'] || r['std_mfg_scrap_rate'] || 0.03),
          color_mixing_ratio_pct: r['色母/色粉配比(%)'] && r['色母/色粉配比(%)'] !== '—' ? Number(r['色母/色粉配比(%)']) : null,
        };
        const idx = newDB.product_mold_bom.findIndex((b) => b.sku === bom.sku && b.mold_id === bom.mold_id);
        if (idx >= 0) newDB.product_mold_bom[idx] = bom;
        else newDB.product_mold_bom.push(bom);
        count++;
      });
      report.importedCounts['產品模具成型關聯檔'] = count;
    }

    // Sheet: Sorting良率標準檔 (舊版相容：自動合併至品號主檔)
    const sheetYield = workbook.Sheets['Sorting良率標準檔'] || workbook.Sheets['yield_master'] || workbook.Sheets['製造良率標準檔'] || workbook.Sheets['品管良率標準檔'];
    if (sheetYield) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetYield);
      let count = 0;
      rows.forEach((r) => {
        const sku = r['品號'] || r['sku'];
        if (!sku) return;
        const yieldVal = Number(r['標準全檢良率'] || r['std_sorting_yield'] || 0.98);
        const item = newDB.item_master.find(i => i.sku === String(sku).trim());
        if (item) {
          item.std_sorting_yield = Math.min(1, Math.max(0.01, yieldVal));
          count++;
        }
      });
      report.importedCounts['Sorting良率標準 (合併至品號)'] = count;
    }

    // Sheet: 採購與供應商規則檔 (舊版相容：自動合併至品號主檔)
    const sheetSupplier = workbook.Sheets['採購與供應商規則檔'] || workbook.Sheets['supplier_rule_master'];
    if (sheetSupplier) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetSupplier);
      let count = 0;
      rows.forEach((r) => {
        const rmSku = r['原料品號'] || r['rm_sku'];
        if (!rmSku) return;
        const item = newDB.item_master.find(i => i.sku === String(rmSku).trim());
        if (item) {
          item.supplier_name = String(r['供應商名稱'] || r['supplier_name'] || item.supplier_name || '').trim();
          item.lead_time_days = Number(r['採購交期_天'] || r['lead_time_days'] || item.lead_time_days || 30);
          item.moq_kg = Number(r['最小起訂量_KG'] || r['moq_kg'] || item.moq_kg || 1000);
          item.safety_stock_kg = Number(r['安全庫存量_KG'] || r['safety_stock_kg'] || item.safety_stock_kg || 0);
          count++;
        }
      });
      report.importedCounts['採購與供應商規則 (合併至品號)'] = count;
    }

    // Sheet: 業務預估需求檔
    const sheetForecast = workbook.Sheets['業務預估需求檔'] || workbook.Sheets['demand_forecast_log'];
    if (sheetForecast) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetForecast);
      let count = 0;
      rows.forEach((r, i) => {
        const sku = r['需求品號'] || r['sku'];
        if (!sku) return;
        const demandId = r['需求序號'] || r['demand_id'] || `FC-IMP-${Date.now()}-${i}`;
        const forecast: DemandForecastLog = {
          demand_id: String(demandId).trim(),
          version_no: String(r['預估版本號'] || r['version_no'] || '202608-W1').trim(),
          customer_id: String(r['客戶代碼'] || r['customer_id'] || 'A客戶').trim(),
          sku: String(sku).trim(),
          target_date: String(r['需求交期'] || r['target_date'] || '2026-11-30').trim(),
          demand_qty: Number(r['預估需求量_PCS'] || r['demand_qty'] || 10000),
          created_at: new Date().toISOString()
        };
        const idx = newDB.demand_forecast_log.findIndex((f) => f.demand_id === forecast.demand_id);
        if (idx >= 0) newDB.demand_forecast_log[idx] = forecast;
        else newDB.demand_forecast_log.push(forecast);
        count++;
      });
      report.importedCounts['業務預估需求檔'] = count;
    }

    // Sheet: 實際訂單檔
    const sheetOrder = workbook.Sheets['實際訂單檔'] || workbook.Sheets['actual_order'];
    if (sheetOrder) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetOrder);
      let count = 0;
      rows.forEach((r, i) => {
        const orderId = r['訂單號'] || r['order_id'] || `ORD-IMP-${Date.now()}-${i}`;
        const sku = r['訂單品號'] || r['sku'];
        if (!sku) return;
        const orderItem: ActualOrder = {
          order_id: String(orderId).trim(),
          customer_id: String(r['客戶代碼'] || r['customer_id'] || 'A客戶').trim(),
          sku: String(sku).trim(),
          order_date: String(r['下單日期'] || r['order_date'] || '2026-08-01').trim(),
          target_date: String(r['約定交期'] || r['target_date'] || '2026-11-30').trim(),
          order_qty: Number(r['實際訂單量_PCS'] || r['order_qty'] || 0),
          status: (r['訂單狀態'] || r['status'] || 'confirmed') as any
        };
        const idx = newDB.actual_order.findIndex((o) => o.order_id === orderItem.order_id);
        if (idx >= 0) newDB.actual_order[idx] = orderItem;
        else newDB.actual_order.push(orderItem);
        count++;
      });
      report.importedCounts['實際訂單檔'] = count;
    }

    // Sheet: 庫存與待驗快照檔
    const sheetInv = workbook.Sheets['庫存與待驗快照檔'] || workbook.Sheets['inventory_wip_snapshot'];
    if (sheetInv) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetInv);
      let count = 0;
      rows.forEach((r) => {
        const sku = r['料號'] || r['sku'];
        if (!sku) return;
        const snapDate = String(r['快照結算日'] || r['snapshot_date'] || '2026-08-20').trim();
        const inv: InventoryWIPSnapshot = {
          snapshot_date: snapDate,
          sku: String(sku).trim(),
          fg_ready_qty: Number(r['成品在庫良品_PCS'] || r['fg_ready_qty'] || 0),
          wip_pending_qty: Number(r['Sorting待驗品_PCS'] || r['wip_pending_qty'] || 0),
          rm_on_hand_kg: Number(r['原料可用庫存_KG'] || r['rm_on_hand_kg'] || 0)
        };
        const idx = newDB.inventory_wip_snapshot.findIndex((s) => s.sku === inv.sku && s.snapshot_date === inv.snapshot_date);
        if (idx >= 0) newDB.inventory_wip_snapshot[idx] = inv;
        else newDB.inventory_wip_snapshot.push(inv);
        count++;
      });
      report.importedCounts['庫存與待驗快照檔'] = count;
    }

    // Sheet: 在途採購訂單檔
    const sheetPO = workbook.Sheets['在途採購訂單檔'] || workbook.Sheets['po_in_transit'];
    if (sheetPO) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetPO);
      let count = 0;
      rows.forEach((r, i) => {
        const poNum = r['採購單號'] || r['po_number'] || `PO-IMP-${Date.now()}-${i}`;
        const rmSku = r['原料品號'] || r['rm_sku'];
        if (!rmSku) return;
        // PO 在途狀態 validate：僅允許合法選項
        const validPoStatuses = ['ordered', 'shipping', 'customs', 'arrived', 'delayed', 'partial_arrived'];
        const rawStatus = String(r['在途狀態'] || r['status'] || 'shipping').trim().toLowerCase();
        const poStatus: 'ordered' | 'shipping' | 'customs' | 'arrived' | 'delayed' | 'partial_arrived' =
          validPoStatuses.includes(rawStatus) ? rawStatus as 'ordered' | 'shipping' | 'customs' | 'arrived' | 'delayed' | 'partial_arrived' : 'shipping';
        const etaDate = String(r['預計到廠日'] || r['eta_date'] || '2026-09-15').trim();
        const poItem: POInTransit = {
          po_number: String(poNum).trim(),
          rm_sku: String(rmSku).trim(),
          in_transit_qty_kg: Number(r['在途採購量_KG'] || r['in_transit_qty_kg'] || 0),
          eta_date: etaDate,
          supplier_name: String(r['供應商名稱'] || r['supplier_name'] || '').trim(),
          status: poStatus
        };
        const idx = newDB.po_in_transit.findIndex((p) => p.po_number === poItem.po_number);
        if (idx >= 0) newDB.po_in_transit[idx] = poItem;
        else newDB.po_in_transit.push(poItem);
        count++;
      });
      report.importedCounts['在途採購訂單檔'] = count;
    }

    // Sheet: Sorting 實際良率紀錄檔 (全檢回饋閉環)
    const sheetSorting = workbook.Sheets['Sorting實際良率紀錄'] || workbook.Sheets['sorting_actual_yield_log'];
    if (sheetSorting) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetSorting);
      let count = 0;
      rows.forEach((r) => {
        const logId = r['紀錄編號'] || r['log_id'];
        const sku = r['品號'] || r['sku'];
        if (!logId || !sku) return;
        const qtySorted = Number(r['全檢數量_PCS'] || r['qty_sorted'] || 0);
        const qtyPassed = Number(r['合格數量_PCS'] || r['qty_passed'] || 0);
        const sortingLog: SortingActualYieldLog = {
          log_id: String(logId).trim(),
          sku: String(sku).trim(),
          batch_no: String(r['生產批號'] || r['batch_no'] || '').trim(),
          sorting_date: String(r['全檢日期'] || r['sorting_date'] || new Date().toISOString().slice(0, 10)),
          qty_sorted: qtySorted,
          qty_passed: qtyPassed,
          actual_yield_rate: qtySorted > 0 ? qtyPassed / qtySorted : 1,
          operator_id: String(r['作業員ID'] || r['operator_id'] || '').trim(),
          notes: r['備註'] || r['notes'] ? String(r['備註'] || r['notes']).trim() : null,
          created_at: r['created_at'] || new Date().toISOString(),
        };
        const idx = newDB.sorting_actual_yield_log.findIndex((s) => s.log_id === sortingLog.log_id);
        if (idx >= 0) newDB.sorting_actual_yield_log[idx] = sortingLog;
        else newDB.sorting_actual_yield_log.push(sortingLog);
        count++;
      });
      report.importedCounts['Sorting實際良率紀錄'] = count;
    }

    // Execute deep relational chain audit
    runRelationalAudit(newDB, report);

    report.success = report.errors.length === 0;
    return { db: newDB, report };
  } catch (err: any) {
    report.errors.push(`Excel 解析失敗: ${err.message}`);
    return { db: currentDB, report };
  }
}

// 6. Deep Relational Chain Integrity Audit (水平展開數據鏈條防呆健檢)
function runRelationalAudit(db: SystemDatabase, report: ValidationReport) {
  const itemMap = new Set(db.item_master.map((i) => i.sku));
  const moldMap = new Set(db.mold_master.map((m) => m.mold_id));

  // 1. Audit ProductMoldBOM linkages
  const primaryMoldCounts: Record<string, number> = {};
  db.product_mold_bom.forEach((b) => {
    if (!itemMap.has(b.sku)) {
      report.warnings.push(`[BOM 關聯異常] 成品品號「${b.sku}」未建立於品號主檔中。`);
    }
    if (!moldMap.has(b.mold_id)) {
      report.errors.push(`[模具斷鏈] 成型 BOM 中的模具編號「${b.mold_id}」(品號 ${b.sku}) 不存在於模具與產能主檔中，將導致無法推算產能與單穴克重！`);
    }
    const rmItem = db.item_master.find(i => i.sku === b.rm_sku);
    if (!rmItem) {
      report.warnings.push(`[原料缺失] 成型 BOM 中原料「${b.rm_sku}」(品號 ${b.sku}) 尚未於品號主檔建立。`);
    } else if (rmItem.lead_time_days == null || rmItem.moq_kg == null) {
      report.warnings.push(`[原料採購規則缺失] 原料「${b.rm_sku}」(品號 ${b.sku}) 尚未設定採購交期或 MOQ，MRP 將改採預設參數。`);
    }
    if (b.is_primary_mold) {
      primaryMoldCounts[b.sku] = (primaryMoldCounts[b.sku] || 0) + 1;
    }
  });

  // Check if each SKU in BOM has at least 1 primary mold
  const allBOMSkus = Array.from(new Set(db.product_mold_bom.map((b) => b.sku)));
  allBOMSkus.forEach((sku) => {
    if (!primaryMoldCounts[sku]) {
      report.warnings.push(`[缺少主模標記] 品號「${sku}」目前未設定任何主模 (is_primary_mold=TRUE)，系統將自動取第一副模具作為備料依據。`);
    }
  });

  // 2. Audit Sales Forecast linkages
  db.demand_forecast_log.forEach((f) => {
    if (!itemMap.has(f.sku)) {
      report.warnings.push(`[業務預估品號異常] 預估需求單「${f.demand_id}」之品號「${f.sku}」不存在於品號主檔。`);
    }
    const hasBOM = db.product_mold_bom.some((b) => b.sku === f.sku);
    if (!hasBOM) {
      report.errors.push(`[未配置成型 BOM] 需求品號「${f.sku}」(預估單 ${f.demand_id}) 尚未建立模具成型 BOM，MRP 無法展開原料需求！`);
    }
  });

  // 3. Audit Actual Orders linkages
  db.actual_order.forEach((o) => {
    if (!itemMap.has(o.sku)) {
      report.warnings.push(`[訂單品號異常] 實際訂單「${o.order_id}」之品號「${o.sku}」不存在於品號主檔。`);
    }
  });

  // 4. Audit Mold Parameters
  db.mold_master.forEach((m) => {
    if (m.cycle_time_sec <= 0) {
      report.errors.push(`[模具參數錯誤] 模具「${m.mold_id}」之成型週期不可為 0 或負數！`);
    }
    if (m.active_cavities <= 0) {
      report.errors.push(`[妥善穴數錯誤] 模具「${m.mold_id}」之妥善穴數不可為 0！`);
    }
  });

  // 5. Audit Sorting Yield Standards (on ItemMaster)
  db.item_master.forEach((i) => {
    if (i.std_sorting_yield != null && (i.std_sorting_yield <= 0 || i.std_sorting_yield > 1)) {
      report.warnings.push(`[良率數值範圍異常] 品號「${i.sku}」標準良率值為 ${i.std_sorting_yield}，良率應介於 0.01 ~ 1.0 (例如 98% 填 0.98)。`);
    }
  });

  // 6. Audit PO In Transit → Raw Material linkage
  db.po_in_transit.forEach((p) => {
    const rm = db.item_master.find(i => i.sku === p.rm_sku);
    if (!rm) {
      report.warnings.push(`[PO 原料缺失] 在途訂單「${p.po_number}」之原料「${p.rm_sku}」不存在於品號主檔。`);
    }
  });

  // 7. Audit snapshot_date + sku uniqueness
  const snapshotKeys = new Set<string>();
  db.inventory_wip_snapshot.forEach((s) => {
    const key = `${s.snapshot_date}|${s.sku}`;
    if (snapshotKeys.has(key)) {
      report.errors.push(`[快照重複] 料號「${s.sku}」於 ${s.snapshot_date} 存在多筆庫存快照，將影響 MRP 最新值取用！`);
    }
    snapshotKeys.add(key);
  });
}
