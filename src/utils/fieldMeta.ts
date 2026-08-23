/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * fieldMeta.ts
 * Field-level metadata for inline editing in DataTablesView.
 */

export type Editability = 'locked' | 'computed' | 1 | 2 | 3;
export type InputType = 'text' | 'number' | 'select' | 'fk_select' | 'date' | 'checkbox' | 'computed';

export interface FieldOption { value: string; label: string; }

export interface FieldMeta {
  key: string;
  label: string;
  editability: Editability;
  inputType: InputType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: FieldOption[];
  fkTable?: string;
  fkValueKey?: string;
  fkLabelKey?: string;
  placeholder?: string;
  maxLength?: number;
  validate?: (value: unknown, row: Record<string, unknown>) => string | null;
  formatDisplay?: (value: unknown) => string;
}

export interface TableMeta {
  key: string;
  label: string;
  pkFields: string[];
  compositeKey?: boolean;
  fields: FieldMeta[];
}

const ITEM_MASTER_META: TableMeta = {
  key: 'item_master', label: '料號基本主檔', pkFields: ['sku'],
  fields: [
    { key: 'sku', label: '品號 (SKU)', editability: 'locked', inputType: 'text', required: true },
    { key: 'alt_sku', label: '替代品號', editability: 1, inputType: 'text', maxLength: 50 },
    { key: 'customer_id', label: '客戶代碼', editability: 3, inputType: 'text', required: true, maxLength: 20, placeholder: 'e.g. MDX, ICU' },
    { key: 'category', label: '產品種類', editability: 3, inputType: 'text', required: true, maxLength: 50 },
    { key: 'material_class', label: '物料分類', editability: 3, inputType: 'select', required: false,
      options: [
        { value: 'RAW',  label: '🌿 RAW — 原料類' },
        { value: 'MAT',  label: '📦 MAT — 物料類' },
        { value: 'PART', label: '⚙️ PART — 零件類' },
        { value: 'COMP', label: '🔧 COMP — 組件類' },
        { value: 'SET',  label: '📋 SET — SET 類' },
      ] },
    { key: 'color', label: '外觀顏色', editability: 1, inputType: 'text', maxLength: 30 },
    { key: 'unit', label: '計量單位', editability: 3, inputType: 'select', required: true, options: [{ value: 'PCS', label: 'PCS（件）' }, { value: 'KG', label: 'KG（公斤）' }, { value: 'SET', label: 'SET（套）' }] },
    { key: 'description', label: '說明備註', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

const MOLD_MASTER_META: TableMeta = {
  key: 'mold_master', label: '模具與產能主檔', pkFields: ['mold_id'],
  fields: [
    { key: 'mold_id', label: '模具編號', editability: 'locked', inputType: 'text', required: true },
    {
      key: 'design_cavities', label: '設計穴數', editability: 3, inputType: 'number', required: true, min: 1, max: 256, step: 1,
      validate: (v, row) => { const val = Number(v); const active = Number(row['active_cavities']); if (!isFinite(val) || val < 1) return '設計穴數必須 ≥ 1'; if (active && active > val) return `不可小於妥善穴數 (${active})`; return null; },
    },
    {
      key: 'active_cavities', label: '妥善穴數', editability: 2, inputType: 'number', required: true, min: 1, step: 1,
      validate: (v, row) => { const val = Number(v); const design = Number(row['design_cavities']); if (!isFinite(val) || val < 1) return '妥善穴數必須 ≥ 1'; if (design && val > design) return `不可超過設計穴數 (${design})`; return null; },
    },
    {
      key: 'cycle_time_sec', label: '成型週期 (秒)', editability: 2, inputType: 'number', required: true, min: 1, step: 0.5,
      validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 1) ? null : '成型週期必須 ≥ 1 秒'; },
    },
    { key: 'status', label: '模具狀態', editability: 1, inputType: 'select', options: [{ value: 'active', label: '✅ 正常使用' }, { value: 'maintenance', label: '🔧 維修保養' }, { value: 'trial', label: '🧪 試模驗證' }, { value: 'retired', label: '🗃️ 封存報廢' }] },
    { key: 'location', label: '機台存放位置', editability: 1, inputType: 'text', maxLength: 50 },
    { key: 'machine_type', label: '成型機型號', editability: 1, inputType: 'text', maxLength: 50 }, // M-03
    { key: 'production_line', label: '產線編號', editability: 1, inputType: 'text', maxLength: 20 }, // M-03
    { key: 'daily_capacity', label: '日產能 PCS（計算值）', editability: 'computed', inputType: 'computed', formatDisplay: (v) => v ? `${Number(v).toLocaleString()} PCS` : '—' },
  ],
};

const PRODUCT_MOLD_BOM_META: TableMeta = {
  key: 'product_mold_bom', label: '產品模具成型關聯檔', pkFields: ['sku', 'mold_id'], compositeKey: true,
  fields: [
    { key: 'sku', label: '品號 (FK)', editability: 'locked', inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'mold_id', label: '模具編號 (FK)', editability: 'locked', inputType: 'fk_select', fkTable: 'mold_master', fkValueKey: 'mold_id', fkLabelKey: 'mold_id', required: true },
    { key: 'rm_sku', label: '原料品號 (FK，僅 RAW)', editability: 3, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'net_mold_weight_g', label: '整模淨重 (g)', editability: 3, inputType: 'number', required: true, min: 0.001, step: 0.001, validate: (v) => { const val = Number(v); return (isFinite(val) && val > 0) ? null : '整模淨重必須 > 0 克'; } },
    { key: 'runner_weight_g', label: '流道重量 (g)', editability: 3, inputType: 'number', required: true, min: 0, step: 0.001, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0) ? null : '流道重量必須 ≥ 0 克'; } },
    { key: 'is_primary_mold', label: '主模標記', editability: 3, inputType: 'checkbox' },
    { key: 'std_mfg_scrap_rate', label: '成型損耗率', editability: 3, inputType: 'number', required: true, min: 0, max: 0.15, step: 0.001,
      validate: (v) => {
        const val = Number(v);
        if (!isFinite(val) || val < 0 || val > 0.15) return '損耗率須介於 0 ~ 15% (不可超過計價成本上限)';
        return null;
      },
      formatDisplay: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    },
    {
      key: 'color_mixing_ratio_pct', label: '色母/色粉配比 (%)', editability: 2, inputType: 'number', min: 0, max: 50, step: 0.1,
      placeholder: '0 = 純原料無配色 / 3 = 3% 色母添加量',
      validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0 && val <= 50) ? null : '配比須介於 0 ~ 50%'; },
      formatDisplay: (v) => v ? `${Number(v).toFixed(1)}%` : '—（純原料）',
    },
    { key: 'valid_from', label: 'BOM 生效起始日', editability: 1, inputType: 'date', required: true }, // M-05
    { key: 'valid_to', label: 'BOM 失效日（null = 至今有效）', editability: 1, inputType: 'date' }, // M-05
    { key: 'remarks', label: '驗證備註', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

const YIELD_MASTER_META: TableMeta = {
  key: 'yield_master', label: 'Sorting良率標準檔', pkFields: ['sku'],
  fields: [
    { key: 'sku', label: '品號 (PK/FK，PART/COMP/SET)', editability: 'locked', inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    {
      key: 'std_sorting_yield', label: '標準全檢良率', editability: 2, inputType: 'number', required: true, min: 0.01, max: 1.0, step: 0.001,
      validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0.01 && val <= 1.0) ? null : '良率須介於 0.01 ~ 1.00'; },
      formatDisplay: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    },
    { key: 'notes', label: '備註說明', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

export const SUPPLIER_RULE_MASTER_META: TableMeta = {
  key: 'supplier_rule_master', label: '採購與供應商規則檔', pkFields: ['rm_sku'],
  fields: [
    { key: 'rm_sku', label: '原料品號 (PK/FK，僅 RAW)', editability: 'locked', inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'supplier_name', label: '供應商名稱', editability: 1, inputType: 'text', required: true, maxLength: 100 },
    { key: 'lead_time_days', label: '採購交期 (天)', editability: 2, inputType: 'number', required: true, min: 1, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 1) ? null : '交期必須 ≥ 1 天'; } },
    { key: 'moq_kg', label: 'MOQ (KG)', editability: 2, inputType: 'number', required: true, min: 1, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val > 0) ? null : 'MOQ 必須 > 0 KG'; } },
    { key: 'safety_stock_kg', label: '安全庫存 (KG)', editability: 2, inputType: 'number', required: true, min: 0, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0) ? null : '安全庫存必須 ≥ 0 KG'; } },
    { key: 'max_storage_capacity_kg', label: '倉容上限 (KG)', editability: 2, inputType: 'number', min: 0, step: 100 },
    { key: 'unit_price_usd', label: '單價 (USD/KG)', editability: 2, inputType: 'number', min: 0, step: 0.01 },
    { key: 'unit_price_twd', label: '單價 (TWD/KG)', editability: 2, inputType: 'number', min: 0, step: 0.01 }, // M-04
  ],
};

const DEMAND_FORECAST_LOG_META: TableMeta = {
  key: 'demand_forecast_log', label: '業務預估需求檔', pkFields: ['demand_id'],
  fields: [
    { key: 'demand_id', label: '需求序號 (PK)', editability: 'locked', inputType: 'text', required: true },
    { key: 'version_no', label: '版本號', editability: 1, inputType: 'text', required: true, maxLength: 20, placeholder: 'e.g. 202608-W1' },
    { key: 'customer_id', label: '客戶代碼', editability: 1, inputType: 'text', required: true, maxLength: 20 },
    { key: 'sku', label: '需求品號 (FK)', editability: 1, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'target_date', label: '需求交期', editability: 2, inputType: 'date', required: true },
    { key: 'demand_qty', label: '預估量 (PCS)', editability: 2, inputType: 'number', required: true, min: 1, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 1) ? null : '預估量必須 ≥ 1 PCS'; } },
    { key: 'created_by_id', label: '操作者帳號 ID', editability: 1, inputType: 'text', maxLength: 30, placeholder: 'e.g. usr_001' }, // M-02（原 created_by）
    { key: 'created_by_name', label: '操作者顯示姓名', editability: 1, inputType: 'text', maxLength: 50 }, // M-02
    { key: 'notes', label: '備註', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

const ACTUAL_ORDER_META: TableMeta = {
  key: 'actual_order', label: '實際訂單檔', pkFields: ['order_id'],
  fields: [
    { key: 'order_id', label: '訂單號 (PK)', editability: 'locked', inputType: 'text', required: true },
    { key: 'customer_id', label: '客戶代碼', editability: 1, inputType: 'text', required: true, maxLength: 20 },
    { key: 'sku', label: '訂單品號 (FK)', editability: 1, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'order_date', label: '下單日期', editability: 1, inputType: 'date', required: true },
    { key: 'target_date', label: '約定交期', editability: 2, inputType: 'date', required: true },
    { key: 'order_qty', label: '訂單量 (PCS)', editability: 2, inputType: 'number', required: true, min: 1, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 1) ? null : '訂單量必須 ≥ 1 PCS'; } },
    { key: 'status', label: '訂單狀態', editability: 1, inputType: 'select', options: [
      { value: 'confirmed', label: '📋 已確認' },
      { value: 'in_production', label: '🏭 生產中' },
      { value: 'partial_shipped', label: '📦 部分出貨' },
      { value: 'completed', label: '✅ 已完成' },
      { value: 'cancelled', label: '❌ 已取消' }
    ] },
  ],
};

const INVENTORY_WIP_SNAPSHOT_META: TableMeta = {
  key: 'inventory_wip_snapshot', label: '庫存與待驗快照檔', pkFields: ['snapshot_date', 'sku'], compositeKey: true,
  fields: [
    { key: 'snapshot_date', label: '快照結算日 (PK)', editability: 'locked', inputType: 'date', required: true },
    { key: 'sku', label: '料號 (PK/FK)', editability: 'locked', inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'fg_ready_qty', label: '成品在庫良品 (PCS)', editability: 2, inputType: 'number', required: true, min: 0, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0) ? null : '庫存量必須 ≥ 0'; } },
    { key: 'wip_pending_qty', label: 'Sorting待驗品 (PCS)', editability: 2, inputType: 'number', required: true, min: 0, step: 1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0) ? null : '待驗數量必須 ≥ 0'; } },
    { key: 'rm_on_hand_kg', label: '原料庫存 (KG)', editability: 2, inputType: 'number', required: true, min: 0, step: 0.1, validate: (v) => { const val = Number(v); return (isFinite(val) && val >= 0) ? null : '原料庫存必須 ≥ 0 KG'; } },
  ],
};

const PO_IN_TRANSIT_META: TableMeta = {
  key: 'po_in_transit', label: '在途採購訂單檔', pkFields: ['po_number'],
  fields: [
    { key: 'po_number', label: '採購單號 (PK)', editability: 'locked', inputType: 'text', required: true },
    { key: 'rm_sku', label: '原料品號 (FK，僅 RAW)', editability: 1, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'in_transit_qty_kg', label: '在途量 (KG)', editability: 2, inputType: 'number', required: true, min: 0.1, step: 0.1, validate: (v) => { const val = Number(v); return (isFinite(val) && val > 0) ? null : '在途量必須 > 0 KG'; } },
    { key: 'eta_date', label: '預計到廠日', editability: 1, inputType: 'date', required: true },
    { key: 'actual_arrival_date', label: '實際到廠日（回寫）', editability: 2, inputType: 'date' }, // M-01
    { key: 'eta_variance_days', label: 'ETA 偏差天數（計算值）', editability: 'computed', inputType: 'computed', formatDisplay: (v) => {
      if (v === null || v === undefined) return '—';
      const n = Number(v);
      return n === 0 ? '準時' : n > 0 ? `${n} 天延遲` : `${Math.abs(n)} 天提前`;
    }}, // M-01
    { key: 'supplier_name', label: '供應商名稱', editability: 1, inputType: 'text', maxLength: 100 },
    { key: 'status', label: '在途狀態', editability: 1, inputType: 'select', options: [
      { value: 'ordered', label: '📋 已下單' },
      { value: 'shipping', label: '🚢 海運中' },
      { value: 'customs', label: '🛃 清關中' },
      { value: 'arrived', label: '✅ 已到廠' },
      { value: 'delayed', label: '⚠️ 延遲' },
      { value: 'partial_arrived', label: '📦 部分到貨' },
    ]},
  ],
};

// 11. Sorting Actual Yield Log (Phase 3 動態回饋閉環)
export const SORTING_ACTUAL_YIELD_LOG_META: TableMeta = {
  key: 'sorting_actual_yield_log', label: 'Sorting 實際良率紀錄檔', pkFields: ['log_id'],
  fields: [
    { key: 'log_id', label: '紀錄 ID (PK)', editability: 'locked', inputType: 'text', required: true },
    { key: 'sku', label: '品號 (FK，僅 PART/COMP/SET)', editability: 'locked', inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'batch_no', label: '生產批號', editability: 1, inputType: 'text', required: true, maxLength: 30 },
    { key: 'sorting_date', label: '全檢日期', editability: 1, inputType: 'date', required: true },
    { key: 'qty_sorted', label: '全檢數量 (PCS)', editability: 2, inputType: 'number', required: true, min: 1, step: 1 },
    { key: 'qty_passed', label: '合格數量 (PCS)', editability: 2, inputType: 'number', required: true, min: 0, step: 1 },
    { key: 'actual_yield_rate', label: '實際良率（計算值）', editability: 'computed', inputType: 'computed', formatDisplay: (v) => v ? `${(Number(v) * 100).toFixed(2)}%` : '—' },
    { key: 'operator_id', label: '作業員 ID', editability: 1, inputType: 'text', maxLength: 30 },
    { key: 'notes', label: '備註', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

// 12. Color Mixing Log (色母/色粉混合製程紀錄檔)
const COLOR_MIXING_LOG_META: TableMeta = {
  key: 'color_mixing_log', label: '色母/色粉混合製程紀錄檔', pkFields: ['mix_log_id'],
  fields: [
    { key: 'mix_log_id', label: '紀錄 ID (PK)', editability: 'locked', inputType: 'text', required: true },
    { key: 'batch_no', label: '混合批次號', editability: 1, inputType: 'text', required: true, maxLength: 30, placeholder: 'e.g. MIX-20260821-001' },
    { key: 'mixing_date', label: '混合日期', editability: 1, inputType: 'date', required: true },
    { key: 'operator_id', label: '混合作業員 ID', editability: 1, inputType: 'text', required: true, maxLength: 30, placeholder: 'e.g. op_001' },
    { key: 'base_resin_sku', label: '基礎樹脂品號 (FK，RAW)', editability: 2, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'base_resin_kg', label: '基礎樹脂用量 (KG)', editability: 2, inputType: 'number', required: true, min: 0.01, step: 0.1,
      validate: (v) => { const val = Number(v); return (isFinite(val) && val > 0) ? null : '基礎樹脂用量必須 > 0 KG'; } },
    { key: 'colorant_sku', label: '色母/色粉品號 (FK，RAW)', editability: 2, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku', required: true },
    { key: 'colorant_kg', label: '色母/色粉用量 (KG)', editability: 2, inputType: 'number', required: true, min: 0.001, step: 0.001,
      validate: (v) => { const val = Number(v); return (isFinite(val) && val > 0) ? null : '色母/色粉用量必須 > 0 KG'; } },
    { key: 'mixing_ratio_pct', label: '混合配比 (%)（計算值）', editability: 'computed', inputType: 'computed',
      formatDisplay: (v) => v ? `${Number(v).toFixed(2)}%` : '—' },
    { key: 'total_batch_kg', label: '混合後總重量 (KG)（計算值）', editability: 'computed', inputType: 'computed',
      formatDisplay: (v) => v ? `${Number(v).toFixed(2)} KG` : '—' },
    { key: 'mold_id', label: '成型模具編號 (FK)', editability: 1, inputType: 'fk_select', fkTable: 'mold_master', fkValueKey: 'mold_id', fkLabelKey: 'mold_id' },
    { key: 'sku', label: '對應製品品號 (FK)', editability: 1, inputType: 'fk_select', fkTable: 'item_master', fkValueKey: 'sku', fkLabelKey: 'sku' },
    {
      key: 'process_tag', label: '製程標籤', editability: 2, inputType: 'select', required: true,
      options: [
        { value: 'mixed',       label: '🔄 預先混合（色母/色粉先與樹脂混合）' },
        { value: 'pre_mix',     label: '🧪 預混樣品（試模/小批量）' },
        { value: 'direct',      label: '➡️ 直接成型（色母滴注/色粉噴灑，非預混）' },
      ]
    },
    { key: 'notes', label: '備註', editability: 1, inputType: 'text', maxLength: 200 },
  ],
};

export const ALL_TABLE_METAS: TableMeta[] = [
  ITEM_MASTER_META, MOLD_MASTER_META, PRODUCT_MOLD_BOM_META, YIELD_MASTER_META,
  SUPPLIER_RULE_MASTER_META, DEMAND_FORECAST_LOG_META, ACTUAL_ORDER_META,
  INVENTORY_WIP_SNAPSHOT_META, PO_IN_TRANSIT_META, SORTING_ACTUAL_YIELD_LOG_META,
  COLOR_MIXING_LOG_META,
];

export function getTableMeta(key: string): TableMeta | undefined {
  return ALL_TABLE_METAS.find((t) => t.key === key);
}

export function getPkDisplay(meta: TableMeta, record: Record<string, unknown>): string {
  return meta.pkFields.map((pk) => String(record[pk] ?? '')).join(' + ');
}

export function generateAuditId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
