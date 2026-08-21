/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ─── Material Classification System ──────────────────────────────────────────
// 五層核心物料分類體系，支援無限擴充

/** 物料業務類別：決定存儲模式與 MRP 處置邏輯 */
export type MaterialBusinessType = 'raw' | 'material' | 'part' | 'component' | 'set';

/** 五層分類代碼：以 '-' 分隔階層路徑 */
export type MaterialClassCode = 'RAW' | 'MAT' | 'PART' | 'COMP' | 'SET';

/** 分類樹節點 */
export interface MaterialClass {
  code: MaterialClassCode;          // 分類代碼（唯一識別）
  name: string;                     // 中文名稱
  nameEn?: string;                  // 英文名稱
  description?: string;             // 說明與涵蓋範圍
  parent_code?: MaterialClassCode;  // 父節點代碼（null = 頂層）
  color?: string;                   // 視覺區分色（hex / Tailwind class）
  sort_order: number;               // 顯示順序
  is_active: boolean;               // 是否啟用
  business_type: MaterialBusinessType; // 對應業務處理模式
}

/** 擴展的料號主檔（含分類字段） */
export interface ItemMaster {
  sku: string; // 品號 (PK)
  alt_sku?: string | null; // 替代品號
  customer_id: string; // 客戶代碼 (MDX, ICU, etc.)
  category: string; // 產品/原料種類 (T接頭, ABS, etc.)
  color?: string; // 外觀顏色
  unit: string; // 計量單位 (PCS, KG)
  description?: string; // 說明備註
  // 分類體系字段（可選，舊資料無此欄位）
  material_class?: MaterialClassCode | null;
  material_class_label?: string | null; // 分類完整路徑標籤（e.g. RAW > ABS/MABS）
}

// 現有資料結構維持不變
// 1. Item Master (料號基本主檔)
export interface ItemMasterV0 {
  sku: string; // 品號 (PK)
  alt_sku?: string | null; // 替代品號
  customer_id: string; // 客戶代碼 (MDX, ICU, etc.)
  category: string; // 產品/原料種類 (T接頭, ABS, etc.)
  color?: string; // 外觀顏色
  unit: string; // 計量單位 (PCS, KG)
  description?: string; // 說明備註
}

// 2. Mold Master (模具與產能主檔)
export interface MoldMaster {
  mold_id: string; // 模具編號 (PK) (e.g. MI17193)
  design_cavities: number; // 設計穴數 (原: 完整穴數)
  active_cavities: number; // 妥善穴數 (原: 現況穴數)
  cycle_time_sec: number; // 成型週期_秒
  daily_capacity?: number; // 系統動態計算: (86400 / cycle_time_sec) * active_cavities
  status?: 'active' | 'maintenance' | 'trial';
  location?: string;
}

// 3. Product Mold BOM (產品模具成型關聯檔)
export interface ProductMoldBOM {
  sku: string; // 品號 (FK)
  mold_id: string; // 模具編號 (FK)
  rm_sku: string; // 使用原料品號 (FK)
  net_mold_weight_g: number; // 整模重量_克 (不含流道)
  runner_weight_g: number; // 流道重量_克
  unit_weight_g?: number; // 系統動態計算: (net_mold_weight_g + runner_weight_g) / active_cavities
  is_primary_mold: boolean; // 是否為主模 (Primary)
  std_mfg_scrap_rate: number; // 標準生產損耗率 (e.g. 0.03 for 3%)
  remarks?: string; // 驗證狀態備註 (e.g. 已完成 PPOV 驗證)
}

// 4. Yield Master (Sorting良率標準檔 - 權責: 製造)
export interface YieldMaster {
  sku: string; // 品號 (PK, FK)
  std_sorting_yield: number; // 標準全檢良率 (e.g. 0.98 for 98%)
  notes?: string; // 備註說明
}

// 5. Supplier Rule Master (採購與供應商規則檔)
export interface SupplierRuleMaster {
  rm_sku: string; // 原料品號 (PK, FK)
  supplier_name: string; // 供應商名稱
  lead_time_days: number; // 採購交期_天 (國外海運 90~150天)
  moq_kg: number; // 最小起訂量_KG
  safety_stock_kg: number; // 安全庫存量_KG
  max_storage_capacity_kg?: number; // 實體倉容上限_KG (實體倉庫可存放極限)
  unit_price_usd?: number; // 預估單價 (USD/KG)
}

// 6. Demand Forecast Log (業務預估需求檔)
export interface DemandForecastLog {
  demand_id: string; // 需求序號 (PK)
  version_no: string; // 預估版本號 (e.g. 202608-W1)
  customer_id: string; // 客戶代碼
  sku: string; // 需求品號 (FK)
  target_date: string; // 需求交期 (YYYY-MM-DD)
  demand_qty: number; // 預估需求量_PCS
  created_by: string; // 填報業務
  created_at: string; // 建立時間
  notes?: string;
}

// 7. Actual Order (實際訂單檔)
export interface ActualOrder {
  order_id: string; // 訂單號 (PK)
  customer_id: string; // 客戶代碼
  sku: string; // 訂單品號 (FK)
  target_date: string; // 約定交期 (YYYY-MM-DD)
  order_qty: number; // 實際訂單量_PCS
  status?: 'confirmed' | 'in_production' | 'completed' | 'cancelled';
  order_date: string;
}

// 8. Inventory & WIP Snapshot (庫存與待驗快照檔)
export interface InventoryWIPSnapshot {
  snapshot_date: string; // 快照結算日 (PK)
  sku: string; // 料號 (PK, FK)
  fg_ready_qty: number; // 成品在庫良品_PCS (庫房已檢驗可出貨)
  wip_pending_qty: number; // Sorting 待驗品_PCS (製造完成待全檢)
  rm_on_hand_kg: number; // 原料可用庫存_KG (原料倉實體)
}

// 9. PO In Transit (在途採購訂單檔)
export interface POInTransit {
  po_number: string; // 採購單號 (PK)
  rm_sku: string; // 原料品號 (FK)
  in_transit_qty_kg: number; // 在途採購量_KG
  eta_date: string; // 預計到廠日 (YYYY-MM-DD)
  supplier_name?: string;
  status: 'ordered' | 'shipping' | 'customs' | 'arrived';
}

// Change Audit Log Entry (for Level 2 & Level 3 edits)
// Level 3 = Engineering Change (Method A: mandatory reason)
// Reserved: Level 3B = PIN approval, Level 3C = ECN workflow (future backend)
export type ChangeLevel = 1 | 2 | 3;

export interface ChangeAuditEntry {
  id: string;               // Unique entry ID (timestamp + random)
  timestamp: string;        // ISO 8601 change time
  table_key: string;        // Table name (e.g. 'mold_master')
  pk_value: string;         // PK value of the changed record
  field_name: string;       // Changed field name
  field_label: string;      // Human-readable field label
  old_value: string;        // Previous value (stringified)
  new_value: string;        // New value (stringified)
  change_level: 2 | 3;      // Impact level (1 = not logged)
  reason?: string;          // Level 3: mandatory change reason
  mrp_impact_summary?: string; // Optional MRP delta summary string
}

// Full Database Schema Container for Export/Import
export interface SystemDatabase {
  item_master: ItemMaster[];
  mold_master: MoldMaster[];
  product_mold_bom: ProductMoldBOM[];
  yield_master: YieldMaster[];
  supplier_rule_master: SupplierRuleMaster[];
  demand_forecast_log: DemandForecastLog[];
  actual_order: ActualOrder[];
  inventory_wip_snapshot: InventoryWIPSnapshot[];
  po_in_transit: POInTransit[];
  audit_log: ChangeAuditEntry[]; // Change audit trail (export-only, never import-overwrite)
  material_classes: MaterialClass[]; // 物料分類樹（匯出時包含，匯入時若無此欄位則保留現有分類）
}


// MRP Calculation Result Output
export interface MRPCalculationResult {
  sku: string;
  productName: string;
  customerId: string;
  versionNo: string;
  targetDate: string;
  
  // Phase 1: FG Net Requirement
  forecastQty: number;
  actualOrderQty: number;
  totalDemandQty: number;
  fgReadyQty: number;
  wipPendingQty: number;
  sortingYield: number;
  wipEffectiveQty: number;
  fgNetRequirementQty: number; // 真實成品缺口 (PCS)

  // Phase 2: Weight & BOM Explosion
  activeMoldId: string;
  designCavities: number;
  activeCavities: number;
  cycleTimeSec: number;
  dailyCapacityPcs: number;
  netMoldWeightG: number;
  runnerWeightG: number;
  totalShotWeightG: number;
  unitWeightG: number; // 單穴克重
  stdScrapRate: number;
  rmSku: string;
  rmGrossRequirementKg: number; // 原料毛需求 (KG)

  // Phase 3: Procurement & Alerts
  rmOnHandKg: number;
  rmInTransitKg: number;
  safetyStockKg: number;
  rmNetRequirementKg: number; // 原料淨需求 (KG)
  moqKg: number;
  leadTimeDays: number;
  suggestedOrderQtyKg: number; // 建議採購量 (向上取整 MOQ)
  suggestedOrderDate: string; // 建議下單日 (Target Date - Lead Time)
  daysUntilLatestOrder: number; // 距離最晚下單日天數

  // Capacity Analysis
  daysToDeliver: number; // 距離交期天數
  requiredProdDays: number; // 生產所需天數 = FG Net Req / Daily Capacity
  capacityDeficitDays: number; // 產能赤字天數

  // Alerts
  alerts: SystemAlert[];
}

export type AlertType = 'shortage' | 'overstock' | 'warehouse_overcapacity' | 'bottleneck' | 'normal';

export interface SystemAlert {
  type: AlertType;
  level: 'red' | 'yellow' | 'orange' | 'purple' | 'green';
  title: string;
  description: string;
  actionRecommendation: string;
}

// System Configurable Parameters & Business Rules
export type MultiMoldStrategy = 'conservative_max_weight' | 'primary_mold_only' | 'lowest_weight';
export type DemandConsumptionMode = 'additive' | 'po_consume' | 'actual_only' | 'forecast_only';

export interface SystemParameters {
  // 1. 預警門檻 (Alert Thresholds)
  shortageAlertBufferDays: number; // 採購緊急警戒天數 (預設: 15 天)
  overstockMultiplier: number; // 供需超備/呆滯倍數門檻 (預設: 1.6 倍)
  defaultWarehouseCapacityKg: number; // 全廠預設單項原料實體倉容上限_KG (預設: 12,000 KG)
  capacityBufferDays: number; // 產能瓶頸裕度天數 (預設: 0 天)
  cavityAlertThresholdPercent: number; // 塞穴告警門檻 (預設: 100%)

  // 2. 運算與排程策略 (Calculation Strategies)
  multiMoldStrategy: MultiMoldStrategy; // 多模備料原則 (預設: 'conservative_max_weight')
  demandConsumptionMode: DemandConsumptionMode; // 需求彙總模式 (預設: 'additive')
  dailyOperatingHours: number; // 每日有效工作時數 (預設: 24.0 小時)

  // 3. 全局預設工藝與良率基準 (Global Defaults)
  defaultSortingYield: number; // 預設全檢良率 (預設: 0.98, 即 98%)
  defaultMfgScrapRate: number; // 預設成型損耗率 (預設: 0.03, 即 3%)
  defaultProcurementLeadTimeDays: number; // 預設採購交期 (預設: 90 天)
  defaultMoqKg: number; // 預設 MOQ (預設: 1000 KG)
  safetyStockMultiplier: number; // 全廠安全庫存動態係數 (預設: 1.0x)
}

export const DEFAULT_SYSTEM_PARAMETERS: SystemParameters = {
  shortageAlertBufferDays: 15,
  overstockMultiplier: 1.6,
  defaultWarehouseCapacityKg: 12000,
  capacityBufferDays: 0,
  cavityAlertThresholdPercent: 100,
  multiMoldStrategy: 'conservative_max_weight',
  demandConsumptionMode: 'additive',
  dailyOperatingHours: 24.0,
  defaultSortingYield: 0.98,
  defaultMfgScrapRate: 0.03,
  defaultProcurementLeadTimeDays: 90,
  defaultMoqKg: 1000,
  safetyStockMultiplier: 1.0
};

// ─── Backup System Types ───────────────────────────────────────────────────────

export type BackupStatus = 'idle' | 'success' | 'failed' | 'pending';

export interface BackupLogEntry {
  id: string;                         // Unique entry ID (timestamp + random)
  timestamp: string;                  // ISO 8601 UTC time of backup
  status: BackupStatus;              // success | failed | pending
  backupFileName: string;            // Generated filename (e.g. PMS_Backup_20260821-020000+0800.json)
  fileSizeBytes: number;             // Compressed JSON size
  databaseSnapshotCount: number;     // Total rows across all tables
  auditLogCount: number;             // Current audit_log length
  targetDirectory?: string;          // Display path (not writable from browser)
  errorDetails?: string;             // Error message if status === 'failed'
  durationMs: number;                // Time taken for backup operation
}

export interface BackupScheduleConfig {
  enabled: boolean;                   // Whether scheduled backup is active
  scheduledHour: number;             // Hour (0-23) to trigger backup
  scheduledMinute: number;           // Minute (0-59) to trigger backup
  directoryHandle: FileSystemDirectoryHandle | null; // FSA API handle (runtime only, not serializable)
  directoryLabel: string;            // Human-readable label of chosen directory
  lastBackupId: string | null;       // ID of most recent successful backup
  autoDownloadOnLaunch: boolean;     // If true, download backup file on each page load
  alertOnError: boolean;             // Whether to show toast on backup failure
  maxLogEntries: number;             // Max backup log entries to keep (oldest pruned)
}

export const DEFAULT_BACKUP_CONFIG: BackupScheduleConfig = {
  enabled: false,
  scheduledHour: 2,        // 02:00 凌晨備份（離峰時段）
  scheduledMinute: 0,
  directoryHandle: null,
  directoryLabel: '',
  lastBackupId: null,
  autoDownloadOnLaunch: false,
  alertOnError: true,
  maxLogEntries: 365        // 最多保留 365 筆備份日誌
};

// ─── Material Classification System Default Tree ─────────────────────────────
// 五層核心物料分類體系，各層含說明、適用業務場景與 MRP 處置邏輯

export const DEFAULT_MATERIAL_CLASSES: MaterialClass[] = [
  // ── RAW：原料類（塑膠原粒、色母、色粉等基礎原材料）──
  { code: 'RAW', name: '原料類', nameEn: 'Raw Materials', sort_order: 1, is_active: true, business_type: 'raw',
    description: '塑膠原粒、色母、色粉等所有用於生產的基礎原材料。以 KG 計量，納入供應商規則與採購排程。' },
  // ── MAT：物料類（紙箱、塑膠袋、標籤、收縮膜等包裝與輔料）──
  { code: 'MAT', name: '物料類', nameEn: 'Packaging & Supplies', sort_order: 2, is_active: true, business_type: 'material',
    description: '紙箱、塑膠袋、標籤紙、B膠、收縮膜等各類包裝耗材與輔助生產物料。不直接參與成型，以 PCS/KG 計量。' },
  // ── PART：零件類（單一射出製品）──
  { code: 'PART', name: '零件類', nameEn: 'Parts', sort_order: 3, is_active: true, business_type: 'part',
    description: '單一塑膠射出製品，可獨立存在但尚非最終出貨品。由 BOM 展開計算毛需求，以 PCS 計量。' },
  // ── COMP：組件類（零件＋物料組裝完成之中間產品）──
  { code: 'COMP', name: '組件類', nameEn: 'Components', sort_order: 4, is_active: true, business_type: 'component',
    description: '由零件與物料組裝完成的中間組裝產品。作為 SET 的子階層，納入 Assembly BOM 管理。' },
  // ── SET：SET 類（最終出廠組合製品）──
  { code: 'SET', name: 'SET 類', nameEn: 'Sets (Final Products)', sort_order: 5, is_active: true, business_type: 'set',
    description: '由組件加裝輸液管所構成的最終出廠組合製品。對應業務 Forecast、PO 與成品庫存。' },
];

// 分類代碼 → 中文名稱快速查找表
export const MATERIAL_CLASS_LABELS: Record<MaterialClassCode, string> = {
  RAW:  '原料類',
  MAT:  '物料類',
  PART: '零件類',
  COMP: '組件類',
  SET:  'SET 類',
};

// Storage keys
export const BACKUP_CONFIG_STORAGE_KEY = 'PMS_BACKUP_CONFIG_V1';
export const BACKUP_LOG_STORAGE_KEY    = 'PMS_BACKUP_LOG_V1';
export const MATERIAL_CLASSES_STORAGE_KEY = 'PMS_MATERIAL_CLASSES_V1';

