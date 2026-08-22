# 原料主檔編碼規則診斷報告

**編號：** PMS-INV-20260822-02  
**日期：** 2026-08-22  
**狀態：** ✅ 已完成診斷，待實施  
**分析範圍：** `src/types.ts` / `src/utils/fieldMeta.ts` / `src/data/seedData.ts` / 相關業務流程

---

## 一、問題根因分析

### 1.1 為何「客戶代碼存在、供應商代碼缺失」？

#### 根本原因：`customer_id` 字段存在雙重語義衝突

經逐一排查 `src/data/seedData.ts` 中的全部 10 筆原料主檔記錄，發現以下關鍵現象：

| 品號類型 | SKU | customer_id 實際值 | 真實語義 | 問題 |
|---------|-----|-------------------|---------|------|
| SET 成品 | `A01-200-131` | `'MDX'` | ✅ 終端客戶 | 正確 |
| SET 成品 | `B02-100-011` | `'ICU'` | ✅ 終端客戶 | 正確 |
| RAW 原料 | `TERLUX 2802` | `'INEOS'` | ❌ 供應商（德國） | **語義錯誤** |
| RAW 原料 | `Geon M4910` | `'Avient'` | ❌ 供應商（美國） | **語義錯誤** |
| RAW 原料 | `PP-5011` | `'台化'` | ❌ 供應商（台灣） | **語義錯誤** |
| RAW 色母 | `CB-BLACK-01` | `'廠內'` | ⚠️ 內部替代 | **語義模糊** |
| RAW 色粉 | `CP-RED-01` | `'廠內'` | ⚠️ 內部替代 | **語義模糊** |

#### 成因鏈（五層失效）

```
設計決策：單一字段存儲多方關係
    ↓
實施決策：RAW 物料直接借用 customer_id 欄位存放供應商名稱
    ↓
系統驗證：MRP 引擎使用 supplier_rule_master.rm_sku 關聯（非 customer_id）
    ↓
數據維護：業務人員以 supplier_name 填空，不區分供應/客戶
    ↓
結果：customer_id 成為「誰與此品號相關」的萬能容器，失去語義精確性
```

**核心缺陷總結：**

| 缺陷項 | 位置 | 影響 |
|--------|------|------|
| 無 `supplier_code` 字段 | `ItemMaster` / `SupplierRuleMaster` | 無法標準化識別供應商 |
| `customer_id` 雙重語義 | `ItemMaster.customer_id` | RAW 物料記錄的是供應商，非客戶 |
| `supplier_name` 非唯一鍵 | `SupplierRuleMaster.supplier_name` (text) | 同一供應商可能有多種寫法導致重複 |
| `POInTransit.supplier_name` 孤立 | `POInTransit`（自由文本） | 在途訂單無 FK 約束，供應商資料獨立於主檔 |
| 無 `VendorCode` 類型定義 | `types.ts` | 全系統無供應商代碼結構化規範 |

---

### 1.2 業務流程漏洞分析

#### 場景 A：新增 RAW 原料時的數據斷層

```
業務流程：倉管人員新增 RAW 原料 → 填寫 customer_id 欄位 → 誤填入供應商名稱
                ↓
系統反應：無驗證機制阻止錯誤輸入（因為 no supplier_code 字段存在）
                ↓
後續影響：
  - MRP 計算時：從 supplier_rule_master 查找供應商規則（正確路徑）
  - 報表查詢時：無法透過 customer_id 追溯真實供應商
  - 匯出對帳時：Excel 欄位名「客戶代碼」顯示供應商名稱（混淆）
```

#### 場景 B：供應商變更時的數據不一致

```
情境：INEOS 退出後改用其他 MABS 供應商
現狀：
  - item_master.sku='TERLUX 2802' 的 customer_id 仍為 'INEOS'（不會自動更新）
  - supplier_rule_master.rm_sku='TERLUX 2802' 需手動更新 supplier_name
  - po_in_transit 歷史紀錄的 supplier_name 是自由文本（已固化）
問題：三個地方各自獨立，無 FK 約束確保一致性
```

---

## 二、關鍵業務欄位標準化作業手冊

### 2.1 原料主檔（ItemMaster）欄位定義

| 欄位 | 類型 | 業務權責 | 校驗規則 | 適用場景 |
|------|------|---------|---------|---------|
| `sku` | string (PK) | 資材/生管 | 必填，前綴強制校驗（RAW/MAT/PART/COMP/SET） | 所有物料 |
| `supplier_code` | string (FK→VendorMaster) | 採購/資材 | **新增**：必填（RAW/MAT），PART/COMP/SET 可為 null | RAW、MAT 類物料 |
| `customer_code` | string (FK→CustomerMaster) | 業務/出貨 | **新增**：必填（PART/COMP/SET），RAW/MAT 可為 null | PART、COMP、SET 類 |
| `category` | string | 資材 | 必填， maxLength:50 | 所有物料 |
| `material_class` | RAW\|MAT\|PART\|COMP\|SET | 資材 | L3 可編輯，必填 | 所有物料 |
| `color` | string? | 資材 | maxLength:30，可選 | 有顏色需求的物料 |
| `unit` | PCS\|KG\|SET | 資材 | L3 鎖定，僅三選一 | 所有物料 |
| `description` | string? | 資材 | maxLength:200，可選 | 所有物料 |
| `alt_sku` | string? | 資材/業務 | maxLength:50，可選；需校驗不與主 sku 重複 | 有替代關係的品號 |

### 2.2 供應商規則（SupplierRuleMaster）欄位定義

| 欄位 | 類型 | 業務權責 | 校驗規則 | 說明 |
|------|------|---------|---------|------|
| `rm_sku` | string (PK+FK) | 採購 | 必填，僅接受 RAW 類品號 | 與 ItemMaster.sku FK 約束 |
| `supplier_code` | string (PK 副鍵) | 採購 | **新增**：必填，唯一校驗（如 V-INEOS, V-AVIENT） | 標準化供應商代碼 |
| `supplier_name` | string | 採購 | 必填，maxLength:100 | 供應商完整名稱 |
| `lead_time_days` | number | 採購 | 必填，≥ 1 天 | 海運 90~150 天，陸運 7~30 天 |
| `moq_kg` | number | 採購 | 必填，> 0 KG | 最小起訂量 |
| `safety_stock_kg` | number | 採購 | 必填，≥ 0 KG | 安全庫存基準值 |
| `max_storage_capacity_kg` | number? | 倉管 | 可選，≥ 0 KG | 實體倉容上限 |
| `unit_price_usd` | number? | 採購 | 可選，> 0 | 預估單價（美金） |
| `unit_price_twd` | number? | 採購 | 可選，> 0 | 預估單價（台幣） |

### 2.3 欄位職責邊界矩陣

```
┌──────────────────┬─────────────┬─────────────┬──────────────┬──────────────┐
│ 字段             │ ItemMaster  │ SuppRuleMstr│ POInTransit  │ CustomerLog  │
├──────────────────┼─────────────┼─────────────┼──────────────┼──────────────┤
│ sku / rm_sku     │ PK (所有)   │ FK → Item   │ FK → Item    │ FK → Item    │
│ customer_code    │ PART/SET    │ —           │ FK → Cust    │ PK reference │
│ supplier_code    │ RAW/MAT     │ PK+FK       │ FK → Vend    │ —            │
│ supplier_name    │ —           │ 全文本      │ 孤立(自由)   │ —            │
│ category         │ 必填        │ —           │ —            │ —            │
│ material_class   │ 必填        │ —           │ —            │ —            │
└──────────────────┴─────────────┴─────────────┴──────────────┴──────────────┘
```

---

## 三、無效/冗余欄位識別與清理建議

### 3.1 識別結果

| # | 欄位 | 所在表格 | 判定依據 | 風險等級 | 建議動作 |
|---|------|---------|---------|---------|---------|
| I1 | `POInTransit.supplier_name` | POInTransit | 自由文本，無 FK 約束；與 SupplierRuleMaster.supplier_name 業務含義重複但獨立存放 | 🔴 P1 | 改為 FK → `supplier_code`，移除自由文本 |
| I2 | `ItemMaster.customer_id`（對 RAW 物料） | ItemMaster | 語義衝突：RAW 物料記錄的是供應商，但字段名意為客戶 | 🔴 P1 | 拆分為 `supplier_code` + `customer_code`，依 material_class 分別必填 |
| I3 | `SupplierRuleMaster.supplier_name` 無唯一校驗 | SupplierRuleMaster | 同義異名風險：`'INEOS'` vs `'INEOS Styrolution'` vs `'Ineos'` | 🟡 P2 | 新增 `supplier_code` 作為唯一識別，name 僅作顯示 |
| I4 | `alt_sku` 缺乏 FK 約束與循環引用檢查 | ItemMaster | 替代品號若指向不存在或自引用的 SKU 無驗證 | 🟡 P2 | 新增 validate 函數：檢查 SKU 存在性、防止自引用、防止循環引用 |
| I5 | `ColorMixingLog.colorant_sku` 與 `base_resin_sku` 無 RAW 類別強制驗證 | ColorMixingLog | 可錄入 PART/SET 類 SKU 作為色母/色粉 | 🟡 P2 | 新增 validate 函數：強制兩個 SKU 均為 RAW 類別 |

### 3.2 待評估欄位（暫不清除）

| 欄位 | 理由 |
|------|------|
| `ItemMaster.alt_sku` | 僅 2/10 筆 demo 資料使用，但業務上確實存在替代關係場景（如 `A01-210-251` ↔ `R1-2355`）。建議保留但加強驗證 |
| `ProductMoldBOM.remarks` | 驗證備註，屬於輔助資訊，非核心業務字段 |
| `YieldMaster.notes` | 良率備註，業務有意義 |
| `MaterialClass.description` | 分類說明，非冗余 |

---

## 四、優化實施方案

### 4.1 階段一：資料模型修正（核心，需執行資料遷移）

#### 4.1.1 `types.ts` 修改摘要

```typescript
// ItemMaster 修改
export interface ItemMaster {
  sku: string;                           // 品號 (PK)
  alt_sku?: string | null;               // 替代品號
  supplier_code: string;                 // 新增：供應商代碼（RAW/MAT 必填）
  customer_code: string;                 // 新增：客戶代碼（PART/COMP/SET 必填）
  category: string;                      // 產品種類
  color?: string;                        // 外觀顏色
  unit: string;                          // 計量單位
  description?: string;                  // 說明備註
  material_class?: MaterialClassCode | null;
  material_class_label?: string | null;
}

// SupplierRuleMaster 修改
export interface SupplierRuleMaster {
  rm_sku: string;                        // 原料品號 (PK/FK)
  supplier_code: string;                 // 新增：供應商代碼（唯一識別）
  supplier_name: string;                 // 供應商名稱（顯示用）
  lead_time_days: number;
  moq_kg: number;
  safety_stock_kg: number;
  max_storage_capacity_kg?: number;
  unit_price_usd?: number;
  unit_price_twd?: number;
}

// POInTransit 修改
export interface POInTransit {
  po_number: string;
  rm_sku: string;
  in_transit_qty_kg: number;
  eta_date: string;
  actual_arrival_date?: string | null;
  supplier_code: string;                 // 修改：從 supplier_name 改為 supplier_code (FK)
  status: 'ordered' | 'shipping' | ...;
  eta_variance_days?: number | null;
}
```

#### 4.1.2 Demo 資料遷移規則

| 原 data | 新字段 | 映射規則 |
|---------|--------|---------|
| RAW `customer_id='INEOS'` | `supplier_code='V-INEOS'` + `customer_code=''` | RAW 物料：原 customer_id → supplier_code |
| SET `customer_id='MDX'` | `supplier_code=''` + `customer_code='C-MDX'` | SET 物料：原 customer_id → customer_code |
| MAT `customer_id='廠內'` | `supplier_code='V-INTERNAL'` + `customer_code=''` | MAT 物料：原 customer_id → supplier_code |

### 4.2 階段二：業務驗證邏輯強化

新增 `validateItemMasterRecord()` 函數：
```typescript
// 校验规则
if (material_class === 'RAW' || material_class === 'MAT') {
  require: supplier_code ≠ ''
  forbid: customer_code ≠ ''    // RAW/MAT 不应有关联客户
} else if (material_class === 'PART' || material_class === 'COMP' || material_class === 'SET') {
  require: customer_code ≠ ''
  forbid: supplier_code ≠ ''    // 成品/零件不应有关联供应商（通过 BOM 间接关联）
}
// alt_sku 校验
if (alt_sku) {
  forbid: alt_sku === sku       // 禁止自引用
  check: alt_sku 存在于 item_master 中
}
```

### 4.3 階段三：fieldMeta.ts 更新

```typescript
// ITEM_MASTER_META 变更
{ key: 'supplier_code', label: '供應商代碼', editability: 3, inputType: 'text',
  required: true, maxLength: 20,
  validate: (v, row) => {
    const cls = row['material_class'];
    if ((cls === 'RAW' || cls === 'MAT') && !v) return 'RAW/MAT 物料必須填寫供應商代碼';
    if ((cls === 'PART' || cls === 'COMP' || cls === 'SET') && v) return '此字段僅適用於 RAW/MAT 物料';
    return null;
  }
},
{ key: 'customer_code', label: '客戶代碼', editability: 3, inputType: 'text',
  required: true, maxLength: 20,
  validate: (v, row) => {
    const cls = row['material_class'];
    if ((cls === 'PART' || cls === 'COMP' || cls === 'SET') && !v) return 'PART/COMP/SET 物料必須填寫客戶代碼';
    if ((cls === 'RAW' || cls === 'MAT') && v) return '此字段僅適用於 PART/COMP/SET 物料';
    return null;
  }
},
// 移除 customer_id 字段
```

### 4.4 階段四：dataExchange.ts 遷移兼容

- Excel 匯入：舊版 `.xlsx` 中 `客戶代碼` 欄位映射至新字段時依 material_class 分流
- 匯出：`item_master` sheet 新增 `供應商代碼` / `客戶代碼` 兩欄

---

## 五、執行計畫

| 階段 | 任務 | 影響檔案 | 驗證方式 |
|------|------|---------|---------|
| P1 | 新增 `supplier_code` / `customer_code` 類型定義 | types.ts | tsc --noEmit |
| P1 | 資料遷移（demo data） | seedData.ts | 手動審查輸出 |
| P1 | fieldMeta 更新（替換 customer_id） | fieldMeta.ts | DataTablesView 渲染測試 |
| P2 | POInTransit.supplier_name → supplier_code FK | types.ts / fieldMeta.ts / dataExchange.ts | 匯出/匯入測試 |
| P2 | alt_sku 循環引用驗證 | materialClassValidation.ts | 單元測試 |
| P2 | ColorMixingLog RAW 類別強制驗證 | materialClassValidation.ts | 單元測試 |
| P3 | 舊版 customer_id 遷移函數 | dataExchange.ts | 匯入測試 |

---

## 六、風險評估

| 風險 | 等級 | 緩解措施 |
|------|:----:|---------|
| 遷移時 demo 資料被覆蓋 | 中 | 先備份 localStorage，再執行遷移腳本 |
| 現有業務習慣（customer_id 兼作 supplier）需改變 | 高 | UI 提示文案明確區分兩欄位用途 |
| dataExchange.xlsx 匯出格式變動影響外部使用者 | 低 | 保留舊版 `客戶代碼` 欄位作為 alias（可選） |
| SupplierRuleMaster 無 FK 到 ItemMaster（現有設計） | 低 | 現有設計已是 rm_sku FK 到 item_master，不變 |

---

*診斷報告生成：Trae AI Agent · 2026-08-22*
*下一步：待確認實施範圍與優先順序*
