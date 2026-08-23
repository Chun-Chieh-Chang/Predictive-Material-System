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
  YieldMaster,
  SupplierRuleMaster,
  DemandForecastLog,
  ActualOrder,
  InventoryWIPSnapshot,
  POInTransit,
  ColorMixingLog
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
  // 1. 料號基本主檔 (權責: 資材(生管))
  { '工作表': '料號基本主檔', '欄位名稱': '品號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (英數，如 A01-200-131)', '勾稽與防呆規則': '全系統唯一識別碼，不可重複 (對接 ERP 品號)', '填寫範例': 'A01-200-131' },
  { '工作表': '料號基本主檔', '欄位名稱': '替代品號', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '工程變更或舊料號對照', '填寫範例': 'R1-2355' },
  { '工作表': '料號基本主檔', '欄位名稱': '客戶代碼', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '文字代碼 (如 MDX, ICU, GEN)', '勾稽與防呆規則': '用於區分客戶需求權限，通用原物料可填 GEN / ALL', '填寫範例': 'MDX' },
  { '工作表': '料號基本主檔', '欄位名稱': '物料分類', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】RAW (原料類) / MAT (物料類) / PART (零件類) / COMP (組件類) / SET (SET類)', '勾稽與防呆規則': '五層核心物料分類，決定 MRP 運算層級與庫存型態', '填寫範例': 'SET' },
  { '工作表': '料號基本主檔', '欄位名稱': '產品種類', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 T接頭, 塑膠本體, ABS原粒)', '勾稽與防呆規則': '業務與產品規格種類說明 (對接 ERP 品名規格)', '填寫範例': 'T接頭' },
  { '工作表': '料號基本主檔', '欄位名稱': '外觀顏色', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字 (如 本色, 藍色, 黑色)', '勾稽與防呆規則': '料件色系識別', '填寫範例': '本色' },
  { '工作表': '料號基本主檔', '欄位名稱': '計量單位', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】PCS (件數) / KG (公斤) / SET (套數)', '勾稽與防呆規則': '製品通常為 PCS/SET，原料為 KG (對接 ERP 計量單位)', '填寫範例': 'PCS' },
  { '工作表': '料號基本主檔', '欄位名稱': '備註說明', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '品名完整詳細說明', '填寫範例': 'T接頭 (T-Connector)' },

  // 2. 模具與產能主檔 (權責: 製造)
  { '工作表': '模具與產能主檔', '欄位名稱': '模具編號', '權責單位': '製造', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 MI17193)', '勾稽與防呆規則': '模具實體編號，不可重複', '填寫範例': 'MI17193' },
  { '工作表': '模具與產能主檔', '欄位名稱': '設計穴數', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (如 8, 16, 24, 32)', '勾稽與防呆規則': '模具開模時原始設計之總出模穴數', '填寫範例': '16' },
  { '工作表': '模具與產能主檔', '欄位名稱': '妥善穴數', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (1 ~ 設計穴數)', '勾稽與防呆規則': '目前產線實際可注塑出模之有效穴數，不可大於設計穴數', '填寫範例': '16' },
  { '工作表': '模具與產能主檔', '欄位名稱': '成型週期_秒', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '正數 (秒，如 27.1)', '勾稽與防呆規則': '射出成型標準秒數，必須 > 0，用於推算 24h 日產能', '填寫範例': '27.1' },
  { '工作表': '模具與產能主檔', '欄位名稱': '存放位置/機台', '權責單位': '製造', '必填/選填': '選填', '允許選項 / 資料型態': '文字 (如 1號廠 射出機 A-03)', '勾稽與防呆規則': '模具架位或常駐機台', '填寫範例': '1號廠 射出機 A-03' },
  { '工作表': '模具與產能主檔', '欄位名稱': '運行狀態', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】active (正常量產) / maintenance (保養維修中) / trial (試模階段) / retired (封存報廢)', '勾稽與防呆規則': '非 active 模具於 MRP 模擬時會提示保養或停用警訊', '填寫範例': 'active' },

  // 3. 產品模具成型關聯檔 (權責: 工程)
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '品號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應製品品號 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「料號基本主檔」中', '填寫範例': 'A01-200-131' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '模具編號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應模具主檔)', '勾稽與防呆規則': '必須存在於「模具與產能主檔」中', '填寫範例': 'MI17193' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '使用原料品號', '權責單位': '工程', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應原料品號 RAW)', '勾稽與防呆規則': '必須對應於採購規則檔設定', '填寫範例': 'TERLUX 2802' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '整模重量_克', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '正數 (公克，不含流道)', '勾稽與防呆規則': '一模所有產品淨重總和', '填寫範例': '9.63' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '流道重量_克', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '正數或 0 (公克)', '勾稽與防呆規則': '冷流道或副流道重量', '填寫範例': '8.32' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '是否為主模', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】TRUE (主模) / FALSE (備用模)', '勾稽與防呆規則': '每個品號建議至少指定一副主模 (TRUE)，備料推算基準', '填寫範例': 'TRUE' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '標準生產損耗率', '權責單位': '工程', '必填/選填': '必填', '允許選項 / 資料型態': '數值 (0.0 ~ 0.15，如 3% 填 0.03)', '勾稽與防呆規則': '射出成型正常調機、啟動與料頭損耗 (不可超過計價成本上限 15%)', '填寫範例': '0.03' },
  { '工作表': '產品模具成型關聯檔', '欄位名稱': '備註驗證狀態', '權責單位': '工程', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '工程驗證通過狀態', '填寫範例': '驗證通過' },

  // 4. Sorting良率標準檔 (權責: 製造)
  { '工作表': 'Sorting良率標準檔', '欄位名稱': '品號', '權責單位': '製造', '必填/選填': '必填 (PK, FK)', '允許選項 / 資料型態': '文字 (對應製品品號 PART/COMP/SET)', '勾稽與防呆規則': '必須為需全檢之製品料號', '填寫範例': 'A01-200-131' },
  { '工作表': 'Sorting良率標準檔', '欄位名稱': '標準全檢良率', '權責單位': '製造', '必填/選填': '必填', '允許選項 / 資料型態': '小數 (0.01 ~ 1.0，如 98% 填 0.98)', '勾稽與防呆規則': '折算 Sorting 待驗品之合格折算率 (良率範圍: 0.01~1.0)', '填寫範例': '0.98' },
  { '工作表': 'Sorting良率標準檔', '欄位名稱': '備註說明', '權責單位': '製造', '必填/選填': '選填', '允許選項 / 資料型態': '文字', '勾稽與防呆規則': '良率檢驗備註', '填寫範例': '標準全檢' },

  // 5. 採購與供應商規則檔 (權責: 資材(生管))
  { '工作表': '採購與供應商規則檔', '欄位名稱': '原料品號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 TERLUX 2802)', '勾稽與防呆規則': '原料品號，需與 BOM 原料一致', '填寫範例': 'TERLUX 2802' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '供應商名稱', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (供應商全名)', '勾稽與防呆規則': '原料製造廠或一級代理商', '填寫範例': 'INEOS' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '採購交期_天', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (海運天數，如 120)', '勾稽與防呆規則': '國外海運+報關+入庫總前置天數 (Lead Time)', '填寫範例': '120' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '最小起訂量_KG', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (公斤，如 5000)', '勾稽與防呆規則': 'MOQ，採購發單時自動向上取整', '填寫範例': '5000' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '安全庫存量_KG', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (公斤，如 2000)', '勾稽與防呆規則': '防範船期延誤之底線緩衝', '填寫範例': '2000' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '實體倉容上限_KG', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '正整數 (公斤，如 12000)', '勾稽與防呆規則': '原料實體貨架最高容納量，用於爆倉預警', '填寫範例': '12000' },
  { '工作表': '採購與供應商規則檔', '欄位名稱': '預估單價_USD', '權責單位': '資材(生管)', '必填/選填': '選填', '允許選項 / 資料型態': '數值 (美元/公斤，如 3.85)', '勾稽與防呆規則': '用於計算預估採購總金額 (USD)', '填寫範例': '3.85' },

  // 6. 業務預估需求檔 (權責: 業務)
  { '工作表': '業務預估需求檔', '欄位名稱': '需求序號', '權責單位': '業務', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 FC-202608-001)', '勾稽與防呆規則': '預估單流水號', '填寫範例': 'FC-202608-001' },
  { '工作表': '業務預估需求檔', '欄位名稱': '預估版本號', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 202608-W1)', '勾稽與防呆規則': 'Forecast 週滾動版本', '填寫範例': '202608-W1' },
  { '工作表': '業務預估需求檔', '欄位名稱': '客戶代碼', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 MDX, ICU)', '勾稽與防呆規則': '需求所屬客戶代號', '填寫範例': 'MDX' },
  { '工作表': '業務預估需求檔', '欄位名稱': '需求品號', '權責單位': '業務', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應料號主檔 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「料號基本主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '業務預估需求檔', '欄位名稱': '需求交期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '格式必須為 YYYY-MM-DD，用於倒推下單期限', '填寫範例': '2026-11-30' },
  { '工作表': '業務預估需求檔', '欄位名稱': '預估需求量_PCS', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (PCS)', '勾稽與防呆規則': '客戶預測總交貨件數', '填寫範例': '100000' },
  { '工作表': '業務預估需求檔', '欄位名稱': '填報業務', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 業務 / 業務人員)', '勾稽與防呆規則': '負責業務窗口或填表人稱謂', '填寫範例': '業務人員' },

  // 7. 實際訂單檔 (權責: 業務)
  { '工作表': '實際訂單檔', '欄位名稱': '訂單號', '權責單位': '業務', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 PO-MDX-01)', '勾稽與防呆規則': '客戶正式採購單號 (Customer PO)', '填寫範例': 'PO-MDX-01' },
  { '工作表': '實際訂單檔', '欄位名稱': '客戶代碼', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '文字 (如 MDX, ICU)', '勾稽與防呆規則': '訂單客戶代碼', '填寫範例': 'MDX' },
  { '工作表': '實際訂單檔', '欄位名稱': '訂單品號', '權責單位': '業務', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應料號主檔 PART/COMP/SET)', '勾稽與防呆規則': '必須存在於「料號基本主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '實際訂單檔', '欄位名稱': '下單日期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '客戶正式發單日期', '填寫範例': '2026-08-01' },
  { '工作表': '實際訂單檔', '欄位名稱': '約定交期', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '承諾出貨交期', '填寫範例': '2026-11-30' },
  { '工作表': '實際訂單檔', '欄位名稱': '實際訂單量_PCS', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '正整數 (PCS)', '勾稽與防呆規則': '正式訂單數量', '填寫範例': '50000' },
  { '工作表': '實際訂單檔', '欄位名稱': '訂單狀態', '權責單位': '業務', '必填/選填': '必填', '允許選項 / 資料型態': '【選項】confirmed (已確認) / in_production (生產中) / partial_shipped (部分出貨) / completed (已結案) / cancelled (已取消)', '勾稽與防呆規則': '僅 confirmed、in_production 與 partial_shipped 計入需求運算', '填寫範例': 'confirmed' },

  // 8. 庫存與待驗快照檔 (權責: 資材(生管))
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '快照結算日', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '日期字串 (YYYY-MM-DD)', '勾稽與防呆規則': '結算盤點基準日', '填寫範例': '2026-08-20' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '料號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK, FK)', '允許選項 / 資料型態': '文字 (對應製品或原料品號)', '勾稽與防呆規則': '必須存在於「料號基本主檔」', '填寫範例': 'A01-200-131' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '成品在庫良品_PCS', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負整數 (PCS)', '勾稽與防呆規則': '庫房已檢驗合格可立即出貨之庫存 (若為原料請填0)', '填寫範例': '15000' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': 'Sorting待驗品_PCS', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負整數 (PCS)', '勾稽與防呆規則': '射出完成但尚未經全檢之 WIP (若為原料請填0)', '填寫範例': '20000' },
  { '工作表': '庫存與待驗快照檔', '欄位名稱': '原料可用庫存_KG', '權責單位': '資材(生管)', '必填/選填': '必填', '允許選項 / 資料型態': '非負數 (KG)', '勾稽與防呆規則': '原料倉庫實體在庫可用原料公斤數 (若為成品請填0)', '填寫範例': '0' },

  // 9. 在途採購訂單檔 (權責: 資材(生管))
  { '工作表': '在途採購訂單檔', '欄位名稱': '採購單號', '權責單位': '資材(生管)', '必填/選填': '必填 (PK)', '允許選項 / 資料型態': '文字 (如 PO-RM-01)', '勾稽與防呆規則': '向原料廠發出之正式發單 PO 號', '填寫範例': 'PO-RM-01' },
  { '工作表': '在途採購訂單檔', '欄位名稱': '原料品號', '權責單位': '資材(生管)', '必填/選填': '必填 (FK)', '允許選項 / 資料型態': '文字 (對應採購規則檔原料品號)', '勾稽與防呆規則': '必須存在於「採購與供應商規則檔」', '填寫範例': 'TERLUX 2802' },
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
    '替代品號': i.alt_sku || '',
    '客戶代碼': i.customer_id,
    '物料分類': i.material_class || '',
    '物料類別': i.category,
    '外觀顏色': i.color || '',
    '計量單位': i.unit,
    '備註說明': i.description || ''
  }));
  const wsItem = XLSX.utils.json_to_sheet(itemData);
  XLSX.utils.book_append_sheet(wb, wsItem, '料號基本主檔');

  // Sheet 2: 模具與產能主檔 (製造)
  const moldData = db.mold_master.map((m) => {
    const linkedBoms = db.product_mold_bom.filter((b) => b.mold_id === m.mold_id);
    const linkedSkus = linkedBoms.map((b) => `${b.sku}${b.is_primary_mold ? '(主模)' : '(備用)'}`).join(', ');
    return {
      '模具編號': m.mold_id,
      '對應生產品號': linkedSkus || '無對應品號',
      '設計穴數': m.design_cavities,
      '妥善穴數': m.active_cavities,
      '成型週期_秒': m.cycle_time_sec,
      '日產能_PCS(系統計算)': Math.round((86400 / m.cycle_time_sec) * m.active_cavities),
      '存放位置/機台': m.location || '',
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
      '備註驗證狀態': b.remarks || ''
    };
  });
  const wsBOM = XLSX.utils.json_to_sheet(bomData);
  XLSX.utils.book_append_sheet(wb, wsBOM, '產品模具成型關聯檔');

  // Sheet 4: Sorting良率標準檔 (製造)
  const yieldData = db.yield_master.map((y) => {
    const fgItem = itemMap.get(y.sku);
    return {
      '品號': y.sku,
      '成品品名(參考)': fgItem?.description || fgItem?.category || '',
      '標準全檢良率': y.std_sorting_yield,
      '備註說明': y.notes || '標準全檢'
    };
  });
  const wsYield = XLSX.utils.json_to_sheet(yieldData);
  XLSX.utils.book_append_sheet(wb, wsYield, 'Sorting良率標準檔');

  // Sheet 5: 採購與供應商規則檔 (資材(生管))
  const supplierData = db.supplier_rule_master.map((s) => {
    const rmItem = itemMap.get(s.rm_sku);
    const linkedBoms = db.product_mold_bom.filter((b) => b.rm_sku === s.rm_sku);
    const linkedFgSkus = Array.from(new Set(linkedBoms.map((b) => b.sku))).join(', ');
    return {
      '原料品號': s.rm_sku,
      '原料說明(參考)': rmItem?.description || rmItem?.category || '',
      '供應商名稱': s.supplier_name,
      '採購交期_天': s.lead_time_days,
      '最小起訂量_KG': s.moq_kg,
      '安全庫存量_KG': s.safety_stock_kg,
      '實體倉容上限_KG': s.max_storage_capacity_kg || 12000,
      '預估單價_USD': s.unit_price_usd || 0,
      '關聯成品品號(參考)': linkedFgSkus || '無'
    };
  });
  const wsSupplier = XLSX.utils.json_to_sheet(supplierData);
  XLSX.utils.book_append_sheet(wb, wsSupplier, '採購與供應商規則檔');

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
      '預估需求量_PCS': f.demand_qty,
      '填報業務': f.created_by_name || f.created_by_id || '',
      '備註說明': f.notes || ''
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

  // Sheet 10: 色母/色粉混合製程紀錄檔 (製造)
  const mixLogData = (db.color_mixing_log || []).map((m) => {
    const baseItem = itemMap.get(m.base_resin_sku);
    const colorItem = itemMap.get(m.colorant_sku);
    return {
      '紀錄ID': m.mix_log_id,
      '混合批次號': m.batch_no || '',
      '混合日期': m.mixing_date,
      '混合作業員ID': m.operator_id,
      '基礎樹脂品號': m.base_resin_sku,
      '基礎樹脂說明(參考)': baseItem?.description || baseItem?.category || '',
      '基礎樹脂用量_KG': m.base_resin_kg,
      '色母/色粉品號': m.colorant_sku,
      '色母/色粉說明(參考)': colorItem?.description || colorItem?.category || '',
      '色母/色粉用量_KG': m.colorant_kg,
      '混合配比(%)（計算值）': m.mixing_ratio_pct ? Number(m.mixing_ratio_pct).toFixed(2) : '',
      '混合後總重量_KG（計算值）': m.total_batch_kg ? Number(m.total_batch_kg).toFixed(2) : '',
      '成型模具編號(FK)': m.mold_id || '',
      '對應SET品號(FK)': m.sku || '',
      '製程標籤': m.process_tag || 'mixed',
      '備註': m.notes || ''
    };
  });
  const wsMixLog = XLSX.utils.json_to_sheet(mixLogData.length > 0 ? mixLogData : [{ '紀錄ID': '(尚無混合紀錄)', '混合批次號': '', '混合日期': '', '混合作業員ID': '', '基礎樹脂品號': '', '基礎樹脂說明(參考)': '', '基礎樹脂用量_KG': '', '色母/色粉品號': '', '色母/色粉說明(參考)': '', '色母/色粉用量_KG': '', '混合配比(%)': '', '混合後總重量_KG': '', '成型模具編號': '', '對應SET品號': '', '製程標籤': '', '備註': '' }]);
  XLSX.utils.book_append_sheet(wb, wsMixLog, '色母色粉混合製程紀錄');

  // Sheet 11: 變更稽核日誌 (唯讀匯出，不可從此工作表匯入覆蓋)
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
export function downloadFormalTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // Sheet 0: 填報規範與勾稽字典 (首頁引導，符合 MECE 權責分工)
  const wsDict = XLSX.utils.json_to_sheet(DATA_SPECIFICATION_DICTIONARY);
  XLSX.utils.book_append_sheet(wb, wsDict, '填報規範與勾稽字典');

  // Sheet 1: 料號基本主檔 (資材(生管))
  const itemHeaders = [{ '品號': '', '替代品號': '', '客戶代碼': '', '物料類別': '', '外觀顏色': '', '計量單位': '', '備註說明': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemHeaders), '料號基本主檔');

  // Sheet 2: 模具與產能主檔 (製造)
  const moldHeaders = [{ '模具編號': '', '對應生產品號': '', '設計穴數': '', '妥善穴數': '', '成型週期_秒': '', '存放位置/機台': '', '運行狀態': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(moldHeaders), '模具與產能主檔');

  // Sheet 3: 產品模具成型關聯檔 (工程)
  const bomHeaders = [{ '品號': '', '成品品名(參考)': '', '模具編號': '', '使用原料品號': '', '原料說明(參考)': '', '整模重量_克': '', '流道重量_克': '', '是否為主模': '', '標準生產損耗率': '', '備註驗證狀態': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bomHeaders), '產品模具成型關聯檔');

  // Sheet 4: Sorting良率標準檔 (製造)
  const yieldHeaders = [{ '品號': '', '成品品名(參考)': '', '標準全檢良率': '', '備註說明': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(yieldHeaders), 'Sorting良率標準檔');

  // Sheet 5: 採購與供應商規則檔 (資材(生管))
  const supplierHeaders = [{ '原料品號': '', '原料說明(參考)': '', '供應商名稱': '', '採購交期_天': '', '最小起訂量_KG': '', '安全庫存量_KG': '', '實體倉容上限_KG': '', '預估單價_USD': '', '關聯成品品號(參考)': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierHeaders), '採購與供應商規則檔');

  // Sheet 6: 業務預估需求檔 (業務)
  const forecastHeaders = [{ '需求序號': '', '預估版本號': '', '客戶代碼': '', '需求品號': '', '成品品名(參考)': '', '需求交期': '', '預估需求量_PCS': '', '填報業務': '', '備註說明': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(forecastHeaders), '業務預估需求檔');

  // Sheet 7: 實際訂單檔 (業務)
  const orderHeaders = [{ '訂單號': '', '客戶代碼': '', '訂單品號': '', '成品品名(參考)': '', '下單日期': '', '約定交期': '', '實際訂單量_PCS': '', '訂單狀態': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderHeaders), '實際訂單檔');

  // Sheet 8: 庫存與待驗快照檔 (資材(生管))
  const invHeaders = [{ '快照結算日': '', '料號': '', '品名/物料說明(參考)': '', '成品在庫良品_PCS': '', 'Sorting待驗品_PCS': '', '原料可用庫存_KG': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invHeaders), '庫存與待驗快照檔');

  // Sheet 9: 在途採購訂單檔 (資材(生管))
  const poHeaders = [{ '採購單號': '', '原料品號': '', '原料說明(參考)': '', '在途採購量_KG': '', '預計到廠日': '', '供應商名稱': '', '在途狀態': '' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poHeaders), '在途採購訂單檔');

  XLSX.writeFile(wb, '料事如神系統_正式空白匯入範本_v1.0.xlsx');
}

// 兼容舊介面別名
export const downloadTemplateExcel = downloadFormalTemplateExcel;

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
          material_class_label: row.material_class_label ? String(row.material_class_label).trim() : null,
          color: row.color ? String(row.color).trim() : '',
          unit: row.unit ? String(row.unit).trim() : 'PCS',
          description: row.description ? String(row.description).trim() : ''
        };
        if (existingIdx >= 0) {
          newDB.item_master[existingIdx] = item;
        } else {
          newDB.item_master.push(item);
        }
        count++;
      });
      report.importedCounts['料號基本主檔'] = count;
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
        const designCav = Number(row.design_cavities) || 16;
        const activeCav = Number(row.active_cavities) || designCav;
        const mold: MoldMaster = {
          mold_id: String(row.mold_id).trim(),
          design_cavities: designCav,
          active_cavities: Math.min(designCav, Math.max(1, activeCav)),
          cycle_time_sec: Math.max(1, Number(row.cycle_time_sec) || 30),
          status: row.status || 'active',
          location: row.location || ''
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
          remarks: row.remarks || '',
          valid_from: String(row.valid_from || '2025-01-01'),
          valid_to: row.valid_to ? String(row.valid_to) : null,
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

    // Validate and Upsert color_mixing_log
    if (Array.isArray(parsed.color_mixing_log)) {
      let count = 0;
      parsed.color_mixing_log.forEach((row: any) => {
        if (!row.mix_log_id) return;
        const existingIdx = newDB.color_mixing_log.findIndex((m) => m.mix_log_id === row.mix_log_id);
        const mixLog: ColorMixingLog = {
          mix_log_id: String(row.mix_log_id).trim(),
          batch_no: row.batch_no ? String(row.batch_no).trim() : null,
          mixing_date: String(row.mixing_date || new Date().toISOString().slice(0, 10)),
          operator_id: row.operator_id ? String(row.operator_id).trim() : '',
          base_resin_sku: row.base_resin_sku ? String(row.base_resin_sku).trim() : '',
          base_resin_kg: Number(row.base_resin_kg) || 0,
          colorant_sku: row.colorant_sku ? String(row.colorant_sku).trim() : '',
          colorant_kg: Number(row.colorant_kg) || 0,
          mixing_ratio_pct: Number(row.mixing_ratio_pct) || 0,
          total_batch_kg: Number(row.total_batch_kg) || 0,
          mold_id: row.mold_id ? String(row.mold_id).trim() : null,
          sku: row.sku ? String(row.sku).trim() : null,
          process_tag: ['mixed', 'pre_mix', 'direct'].includes(row.process_tag) ? row.process_tag : 'mixed',
          notes: row.notes ? String(row.notes).trim() : null,
          created_at: row.created_at || new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          newDB.color_mixing_log[existingIdx] = mixLog;
        } else {
          newDB.color_mixing_log.push(mixLog);
        }
        count++;
      });
      report.importedCounts['色母色粉混合製程紀錄'] = count;
    }

    // Validate other tables
    if (Array.isArray(parsed.yield_master)) {
      newDB.yield_master = parsed.yield_master;
      report.importedCounts['Sorting良率標準檔'] = parsed.yield_master.length;
    }
    if (Array.isArray(parsed.supplier_rule_master)) {
      newDB.supplier_rule_master = parsed.supplier_rule_master;
      report.importedCounts['採購與供應商規則檔'] = parsed.supplier_rule_master.length;
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
      // 同步計算 eta_variance_days 若 actual_arrival_date 已存在，并验证PO状态
      const validPoStatuses = ['ordered', 'shipping', 'customs', 'arrived', 'delayed', 'partial_arrived'];
      const validatedPOs: POInTransit[] = parsed.po_in_transit.map((p: any) => {
        const item: POInTransit = { ...p };
        // PO 在途状态 validate：仅允许合法选项
        const rawStatus = String(p.status || 'shipping').trim().toLowerCase();
        if (!validPoStatuses.includes(rawStatus)) {
          item.status = 'shipping';
        } else {
          item.status = rawStatus as 'ordered' | 'shipping' | 'customs' | 'arrived' | 'delayed' | 'partial_arrived';
        }
        if (p.actual_arrival_date && p.eta_date) {
          const eta = new Date(String(p.eta_date));
          const actual = new Date(String(p.actual_arrival_date));
          if (!isNaN(eta.getTime()) && !isNaN(actual.getTime())) {
            item.eta_variance_days = Math.round((actual.getTime() - eta.getTime()) / (24 * 60 * 60 * 1000));
          }
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

    // Sheet: 料號基本主檔
    const sheetItem = workbook.Sheets['料號基本主檔'] || workbook.Sheets['item_master'];
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
          description: String(r['備註說明'] || r['description'] || '').trim()
        };
        const idx = newDB.item_master.findIndex((i) => i.sku === item.sku);
        if (idx >= 0) newDB.item_master[idx] = item;
        else newDB.item_master.push(item);
        count++;
      });
      report.importedCounts['料號基本主檔'] = count;
    }

    // Sheet: 模具與產能主檔
    const sheetMold = workbook.Sheets['模具與產能主檔'] || workbook.Sheets['mold_master'];
    if (sheetMold) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetMold);
      let count = 0;
      rows.forEach((r) => {
        const moldId = r['模具編號'] || r['mold_id'];
        if (!moldId) return;
        const designCav = Number(r['設計穴數'] || r['design_cavities'] || 16);
        const activeCav = Number(r['妥善穴數'] || r['active_cavities'] || designCav);
        const mold: MoldMaster = {
          mold_id: String(moldId).trim(),
          design_cavities: designCav,
          active_cavities: Math.min(designCav, Math.max(1, activeCav)),
          cycle_time_sec: Number(r['成型週期_秒'] || r['cycle_time_sec'] || 25),
          location: r['存放位置/機台'] || r['location'] || '',
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
          remarks: r['備註驗證狀態'] || r['remarks'] || '',
          valid_from: String(r['BOM生效起始日'] || r['valid_from'] || '2025-01-01'),
          valid_to: r['BOM失效日'] || r['valid_to'] || null,
          color_mixing_ratio_pct: r['色母/色粉配比(%)'] && r['色母/色粉配比(%)'] !== '—' ? Number(r['色母/色粉配比(%)']) : null,
        };
        const idx = newDB.product_mold_bom.findIndex((b) => b.sku === bom.sku && b.mold_id === bom.mold_id);
        if (idx >= 0) newDB.product_mold_bom[idx] = bom;
        else newDB.product_mold_bom.push(bom);
        count++;
      });
      report.importedCounts['產品模具成型關聯檔'] = count;
    }

    // Sheet: Sorting良率標準檔 (Sorting 全檢良率)
    const sheetYield = workbook.Sheets['Sorting良率標準檔'] || workbook.Sheets['yield_master'] || workbook.Sheets['製造良率標準檔'] || workbook.Sheets['品管良率標準檔'];
    if (sheetYield) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetYield);
      let count = 0;
      rows.forEach((r) => {
        const sku = r['品號'] || r['sku'];
        if (!sku) return;
        const yieldVal = Number(r['標準全檢良率'] || r['std_sorting_yield'] || 0.98);
        const yItem: YieldMaster = {
          sku: String(sku).trim(),
          std_sorting_yield: Math.min(1, Math.max(0.01, yieldVal)),
          notes: String(r['備註說明'] || r['notes'] || '').trim()
        };
        const idx = newDB.yield_master.findIndex((y) => y.sku === yItem.sku);
        if (idx >= 0) newDB.yield_master[idx] = yItem;
        else newDB.yield_master.push(yItem);
        count++;
      });
      report.importedCounts['Sorting良率標準檔'] = count;
    }

    // Sheet: 採購與供應商規則檔
    const sheetSupplier = workbook.Sheets['採購與供應商規則檔'] || workbook.Sheets['supplier_rule_master'];
    if (sheetSupplier) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetSupplier);
      let count = 0;
      rows.forEach((r) => {
        const rmSku = r['原料品號'] || r['rm_sku'];
        if (!rmSku) return;
        const suppItem: SupplierRuleMaster = {
          rm_sku: String(rmSku).trim(),
          supplier_name: String(r['供應商名稱'] || r['supplier_name'] || '').trim(),
          lead_time_days: Number(r['採購交期_天'] || r['lead_time_days'] || 90),
          moq_kg: Number(r['最小起訂量_KG'] || r['moq_kg'] || 1000),
          safety_stock_kg: Number(r['安全庫存量_KG'] || r['safety_stock_kg'] || 0),
          max_storage_capacity_kg: Number(r['實體倉容上限_KG'] || r['max_storage_capacity_kg'] || 12000),
          unit_price_usd: Number(r['預估單價_USD'] || r['unit_price_usd'] || 0)
        };
        const idx = newDB.supplier_rule_master.findIndex((s) => s.rm_sku === suppItem.rm_sku);
        if (idx >= 0) newDB.supplier_rule_master[idx] = suppItem;
        else newDB.supplier_rule_master.push(suppItem);
        count++;
      });
      report.importedCounts['採購與供應商規則檔'] = count;
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
          customer_id: String(r['客戶代碼'] || r['customer_id'] || 'MDX').trim(),
          sku: String(sku).trim(),
          target_date: String(r['需求交期'] || r['target_date'] || '2026-11-30').trim(),
          demand_qty: Number(r['預估需求量_PCS'] || r['demand_qty'] || 10000),
          created_by_id: String(r['填報業務'] || r['created_by'] || r['created_by_id'] || 'Admin').trim(),
          created_by_name: r['created_by_name'] || null,
          created_at: new Date().toISOString(),
          notes: r['備註說明'] || ''
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
          customer_id: String(r['客戶代碼'] || r['customer_id'] || 'MDX').trim(),
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
        const actualArrivalDate = r['實際到廠日'] || r['actual_arrival_date'];
        // eta_variance_days：若實際到廠日已填寫，自動計算偏差天數
        let etaVarianceDays: number | null = null;
        if (actualArrivalDate) {
          const eta = new Date(etaDate);
          const actual = new Date(String(actualArrivalDate).trim());
          if (!isNaN(eta.getTime()) && !isNaN(actual.getTime())) {
            etaVarianceDays = Math.round((actual.getTime() - eta.getTime()) / (24 * 60 * 60 * 1000));
          }
        }
        const poItem: POInTransit = {
          po_number: String(poNum).trim(),
          rm_sku: String(rmSku).trim(),
          in_transit_qty_kg: Number(r['在途採購量_KG'] || r['in_transit_qty_kg'] || 0),
          eta_date: etaDate,
          actual_arrival_date: actualArrivalDate ? String(actualArrivalDate).trim() : null,
          eta_variance_days: etaVarianceDays,
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

    // Sheet: 色母/色粉混合製程紀錄檔
    const sheetMixLog = workbook.Sheets['色母色粉混合製程紀錄'] || workbook.Sheets['color_mixing_log'];
    if (sheetMixLog) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheetMixLog);
      let count = 0;
      rows.forEach((r) => {
        const mixLogId = r['紀錄ID'] || r['mix_log_id'];
        if (!mixLogId) return;
        const mixLog: ColorMixingLog = {
          mix_log_id: String(mixLogId).trim(),
          batch_no: r['混合批次號'] || r['batch_no'] || null,
          mixing_date: String(r['混合日期'] || r['mixing_date'] || new Date().toISOString().slice(0, 10)),
          operator_id: String(r['混合作業員ID'] || r['operator_id'] || '').trim(),
          base_resin_sku: String(r['基礎樹脂品號'] || r['base_resin_sku'] || '').trim(),
          base_resin_kg: Number(r['基礎樹脂用量_KG'] || r['base_resin_kg'] || 0),
          colorant_sku: String(r['色母/色粉品號'] || r['colorant_sku'] || '').trim(),
          colorant_kg: Number(r['色母/色粉用量_KG'] || r['colorant_kg'] || 0),
          mixing_ratio_pct: Number(r['混合配比(%)（計算值）'] || r['mixing_ratio_pct'] || 0),
          total_batch_kg: Number(r['混合後總重量_KG（計算值）'] || r['total_batch_kg'] || 0),
          mold_id: r['成型模具編號(FK)'] || r['mold_id'] || null,
          sku: r['對應SET品號(FK)'] || r['sku'] || null,
          process_tag: ['mixed', 'pre_mix', 'direct'].includes(String(r['製程標籤'] || r['process_tag'] || 'mixed').toLowerCase()) ? String(r['製程標籤'] || r['process_tag'] || 'mixed').toLowerCase() as 'mixed' | 'pre_mix' | 'direct' : 'mixed',
          notes: r['備註'] || r['notes'] || null,
          created_at: r['created_at'] || new Date().toISOString(),
        };
        const idx = newDB.color_mixing_log.findIndex((m) => m.mix_log_id === mixLog.mix_log_id);
        if (idx >= 0) newDB.color_mixing_log[idx] = mixLog;
        else newDB.color_mixing_log.push(mixLog);
        count++;
      });
      report.importedCounts['色母色粉混合製程紀錄'] = count;
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
  const supplierRuleMap = new Set(db.supplier_rule_master.map((s) => s.rm_sku));

  // 1. Audit ProductMoldBOM linkages
  const primaryMoldCounts: Record<string, number> = {};
  db.product_mold_bom.forEach((b) => {
    if (!itemMap.has(b.sku)) {
      report.warnings.push(`[BOM 關聯異常] 成品品號「${b.sku}」未建立於料號基本主檔中。`);
    }
    if (!moldMap.has(b.mold_id)) {
      report.errors.push(`[模具斷鏈] 成型 BOM 中的模具編號「${b.mold_id}」(品號 ${b.sku}) 不存在於模具與產能主檔中，將導致無法推算產能與單穴克重！`);
    }
    if (!supplierRuleMap.has(b.rm_sku)) {
      report.warnings.push(`[原料採購規則缺失] 成型 BOM 中原料「${b.rm_sku}」(品號 ${b.sku}) 尚未於採購規則檔設定採購交期與 MOQ。`);
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
      report.warnings.push(`[業務預估品號異常] 預估需求單「${f.demand_id}」之品號「${f.sku}」不存在於料號基本主檔。`);
    }
    const hasBOM = db.product_mold_bom.some((b) => b.sku === f.sku);
    if (!hasBOM) {
      report.errors.push(`[未配置成型 BOM] 需求品號「${f.sku}」(預估單 ${f.demand_id}) 尚未建立模具成型 BOM，MRP 無法展開原料需求！`);
    }
  });

  // 3. Audit Actual Orders linkages
  db.actual_order.forEach((o) => {
    if (!itemMap.has(o.sku)) {
      report.warnings.push(`[訂單品號異常] 實際訂單「${o.order_id}」之品號「${o.sku}」不存在於料號基本主檔。`);
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
    if (m.active_cavities > m.design_cavities) {
      report.warnings.push(`[穴數邏輯異常] 模具「${m.mold_id}」妥善穴數 (${m.active_cavities}) 大於設計穴數 (${m.design_cavities})。`);
    }
  });

  // 5. Audit Sorting Yield Standards
  db.yield_master.forEach((y) => {
    if (y.std_sorting_yield <= 0 || y.std_sorting_yield > 1) {
      report.warnings.push(`[良率數值範圍異常] 品號「${y.sku}」標準良率值為 ${y.std_sorting_yield}，良率應填寫 0.01 ~ 1.0 (例如 98% 填 0.98)。`);
    }
  });

  // 6. Audit Supplier Procurement Rules
  db.supplier_rule_master.forEach((s) => {
    if (s.lead_time_days <= 0) {
      report.warnings.push(`[採購交期缺失] 原料「${s.rm_sku}」採購交期為 0 天，可能導致排程倒推下單日異常。`);
    }
    if (s.moq_kg <= 0) {
      report.warnings.push(`[MOQ缺失] 原料「${s.rm_sku}」最小起訂量為 0 KG。`);
    }
  });

  // 7. Audit PO In Transit → Supplier Rule linkage
  const supplierSkus = new Set(db.supplier_rule_master.map((s) => s.rm_sku));
  db.po_in_transit.forEach((p) => {
    if (!supplierSkus.has(p.rm_sku)) {
      report.warnings.push(`[PO 採購規則缺失] 在途訂單「${p.po_number}」之原料「${p.rm_sku}」尚未於採購規則檔設定，MRP 將使用全廠預設參數。`);
    }
  });

  // 8. Audit snapshot_date + sku uniqueness
  const snapshotKeys = new Set<string>();
  db.inventory_wip_snapshot.forEach((s) => {
    const key = `${s.snapshot_date}|${s.sku}`;
    if (snapshotKeys.has(key)) {
      report.errors.push(`[快照重複] 料號「${s.sku}」於 ${s.snapshot_date} 存在多筆庫存快照，將影響 MRP 最新值取用！`);
    }
    snapshotKeys.add(key);
  });
}
