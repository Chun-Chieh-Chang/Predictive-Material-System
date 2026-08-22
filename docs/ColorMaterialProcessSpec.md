# 色母/色粉管理系統規劃與修訂文件

**版本：** V-20260822-01  
**日期：** 2026-08-22  
**狀態：** 已完成

---

## 一、背景與目標

針對零件射出成型製程中，部分產品需預先將「色母」或「色粉」與基礎樹脂混合後才能進行射出成型的特殊製程需求，本系統進行以下全面性規劃與修訂：

1. 將色母（Masterbatch）與色粉（Color Powder）正式歸入 RAW 原料類別
2. 建立色母/色粉混合製程紀錄追蹤機制
3. 調整 MRP 引擎計算邏輯以支援配色比例
4. 補全匯入/匯出功能以支援新數據結構

---

## 二、原料分類修訂

### 2.1 色母與色粉屬性定義

| 屬性 | 說明 |
|------|------|
| **Material Class** | RAW（原料） |
| **SKU 前綴** | 色母：`CB-`（Color Batch）；色粉：`CP-`（Color Powder） |
| **單位** | KG |
| **歸類範例** | `CB-BLACK-01`（黑色色母）、`CP-RED-01`（紅色色粉） |

### 2.2 SKU_PREFIX_RULES 修訂

`src/utils/materialClassValidation.ts` 中 `SKU_PREFIX_RULES` 已更新：

```typescript
export const SKU_PREFIX_RULES: Record<MaterialClassCode, string[]> = {
  RAW:  ['RM-', 'RAW-', 'MABS-', 'PP-', 'PVC-', 'PE-', 'CB-', 'CP-', 'COLOR-'],
  MAT:  ['PKG-', 'MAT-', 'LABEL-', 'BAG-', 'BOX-'],
  PART: ['PT-', 'PART-', 'CONN-', 'VALVE-', 'FITTING-'],
  COMP: ['ASM-', 'COMP-', 'SUB-'],
  SET:  ['SET-', 'SKU-', 'A01-', 'B02-', 'C09-'],
};
```

### 2.3 H-01 FK 校驗擴充

`validateRmSkuAsRaw` 函式（已於 2026-08-22 移除）曾接受色母（CB-）與色粉（CP-）前綴的 SKU，允許其作為 BOM 的 `rm_sku`。SKU_PREFIX_RULES.RAW 仍保留 `CB-`、`CP-`、`COLOR-` 前綴規範。

---

## 三、系統欄位修訂

### 3.1 ProductMoldBOM — 新增 `color_mixing_ratio_pct`

| 欄位名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `color_mixing_ratio_pct` | `number \| null` | 選填 | 色母/色粉添加配比百分比。0 或 null 表示純原料無配色；例如 `2.0` 表示添加 2% 色母 |

**欄位行為規則：**
- 範圍限制：0 ~ 50%
- 輸入格式：小數（如 `2.0` 代表 2%）
- 格式顯示：自動轉為百分比字串（如 `2.0%`）
- 當 `color_mixing_ratio_pct > 0` 時，MRP 計算會自動拆分基礎樹脂與色母/色粉的需求量

### 3.2 新增 ColorMixingLog 表（色母/色粉混合製程紀錄檔）

| 欄位名稱 | 型別 | 必填 | 說明 |
|---------|------|------|------|
| `mix_log_id` | `string` | 是（PK） | 紀錄唯一識別碼 |
| `batch_no` | `string \| null` | 選填 | 混合批次號 |
| `mixing_date` | `string` | 是 | 混合日期（YYYY-MM-DD） |
| `operator_id` | `string` | 是 | 混合作業員 ID |
| `base_resin_sku` | `string` | 是（FK） | 基礎樹脂品號 → `item_master.sku`（RAW 類） |
| `base_resin_kg` | `number` | 是 | 基礎樹脂用量（KG） |
| `colorant_sku` | `string` | 是（FK） | 色母/色粉品號 → `item_master.sku`（RAW 類） |
| `colorant_kg` | `number` | 是 | 色母/色粉用量（KG） |
| `mixing_ratio_pct` | `number` | 計算值 | 混合配比 `%` = `(colorant_kg / base_resin_kg) * 100` |
| `total_batch_kg` | `number` | 計算值 | 混合後總重量 KG = `base_resin_kg + colorant_kg` |
| `mold_id` | `string \| null` | 選填（FK） | 對應成型模具編號 → `mold_master.mold_id` |
| `sku` | `string \| null` | 選填（FK） | 對應 SET 品號 → `item_master.sku` |
| `process_tag` | `'mixed' \| 'pre_mix' \| 'direct'` | 是 | 製程標籤（見下方說明） |
| `notes` | `string \| null` | 選填 | 備註 |
| `created_at` | `string` | 是 | 建立時間（ISO 8601） |

**製程標籤（process_tag）說明：**

| 標籤值 | 說明 | 適用場景 |
|--------|------|---------|
| `mixed` | 🔄 預先混合 | 色母/色粉先與樹脂均勻混合，再投入射出成型機 |
| `pre_mix` | 🧪 預混樣品 | 試模或小批量測試用預混樣品 |
| `direct` | ➡️ 直接成型 | 色母滴注或色粉噴灑於成型機料筒，非預混製程 |

### 3.3 SystemDatabase — 新增欄位

```typescript
export interface SystemDatabase {
  // ... 既有欄位 ...
  color_mixing_log: ColorMixingLog[]; // 色母/色粉混合製程紀錄（可為空陣列）
}
```

### 3.4 MRPCalculationResult — 新增欄位

```typescript
export interface MRPCalculationResult {
  // ... 既有欄位 ...
  colorMixingRatioPct: number;  // 色母/色粉配比 (%)（0 = 純原料）
  colorantDetail?: {            // 色母/色粉詳細需求分析（mixingRatioPct > 0 時才有值）
    colorantSku: string;
    colorantGrossKg: number;
    colorantOnHandKg: number;
    colorantInTransitKg: number;
    colorantNetRequirementKg: number;
    colorantSuggestedQtyKg: number;
    colorantLeadTimeDays: number;
  } | null;
}
```

---

## 四、MRP 引擎計算邏輯修訂

### 4.1 配色原料需求計算公式

當 BOM 層級 `color_mixing_ratio_pct > 0` 時：

```
總毛需求（rmGrossRequirementKg）= 依標準損耗率調整後之原料需求

有效基礎樹脂毛需求 = rmGrossRequirementKg / (1 + color_mixing_ratio_pct / 100)
色母/色粉毛需求     = rmGrossRequirementKg - 有效基礎樹脂毛需求
```

**範例：** 某產品毛需求 51.0 KG，色母配比 2.0%：
- 有效基礎樹脂毛需求 = 51.0 / 1.02 = 50.0 KG（TERLUX 2802）
- 色母毛需求 = 51.0 - 50.0 = 1.0 KG（CB-BLACK-01）

### 4.2 色母/色粉庫存與採購決策

`colorantDetail` 物件自動包含：
- 當前庫存（`colorantOnHandKg`）
- 在途採購量（`colorantInTransitKg`）
- 淨需求（`colorantNetRequirementKg`）
- 建議採購量（`colorantSuggestedQtyKg`，含 MOQ 圓整）
- 交期天數（`colorantLeadTimeDays`）

### 4.3 計算流程圖

```
成品淨需求（PCS）
    │
    ▼
原料毛需求（KG）─── color_mixing_ratio_pct > 0? ──┐
    │                                            │
    ├─ No ──→ 直接計算 RM 淨需求 ──→ 採購決策       │
    │                                          │
    └─ Yes ──→ 拆分計算：                       │
         ├─ 有效樹脂毛需求 = total / (1 + ratio/100)
         ├─ 色母毛需求 = total - 有效樹脂毛需求
         ├─ 分別計算 resin 淨需求
         └─ 分別計算 colorant 淨需求
                    │
                    ▼
              獨立採購決策（各自 MOQ、Lead Time）
```

---

## 五、業務流程說明

### 5.1 完整製程鏈路

```
┌─────────────────────────────────────────────────────────────────────┐
│  階段 1：BOM 設定（工程部門）                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  1. 在「產品模具成型關聯檔」建立 BOM 記錄                            │
│  2. 若原料為色母/色粉，填寫 color_mixing_ratio_pct（配比 %）          │
│  3. 系統自動識別：rm_sku 前綴為 CB-/CP- 時，標記為配色原料           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  階段 2：MRP 計算（資材部門）                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  1. MRP 引擎讀取 BOM 的 color_mixing_ratio_pct                     │
│  2. 自動拆分基礎樹脂與色母/色粉的毛需求                              │
│  3. 分別核算庫存、在途、安全庫存                                     │
│  4. 產生獨立採購建議（各原料自有 Lead Time 與 MOQ）                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  階段 3：原料領用與核銷（倉庫/製造部門）                               │
│  ─────────────────────────────────────────────────────────────────  │
│  1. 基礎樹脂（RM-XXX）：正常領用核銷流程                             │
│  2. 色母/色粉（CB-/CP-）：正常領用核銷流程                           │
│  3. 兩者庫存各自獨立扣減，數據追蹤不混淆                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  階段 4：混合製程紀錄（製造部門）                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  1. 每批次混合作業完成後，填入「色母/色粉混合製程紀錄檔」             │
│  2. 必填項目：基礎樹脂品號、用量、色母/色粉品號、用量、製程標籤        │
│  3. 系統自動計算：混合配比%、混合後總重量                             │
│  4. 可選填：對應模具編號、對應 SET 品號、作業員 ID、備註              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  階段 5：射出成型（製造部門）                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  1. 使用已混合完成的原料投入成型機                                    │
│  2. 成品良率仍依原有 Yield Master 標準核算                           │
│  3. 混合紀錄可追溯至對應成品批次                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 數據追溯鏈

```
成品訂單（actual_order）
    │
    ▼
MRP 計算結果（MRPCalculationResult）─── colorantDetail ──→ 色母/色粉採購建議
    │
    ▼
產品模具成型 BOM（product_mold_bom）─── color_mixing_ratio_pct ──→ 配色比例
    │
    ▼
色母/色粉混合製程紀錄（color_mixing_log）
    ├── base_resin_sku → 基礎樹脂庫存變動
    ├── colorant_sku  → 色母/色粉庫存變動
    ├── mixing_ratio_pct → 實際配比（與 BOM 可交叉比對）
    └── mold_id / sku → 追溯至具體成品批次
```

---

## 六、匯入/匯出支援

### 6.1 JSON 匯出

- `exportToJSON()` 自動包含 `color_mixing_log` 陣列（因 `SystemDatabase` 已內建）
- `product_mold_bom` 匯出時帶入 `color_mixing_ratio_pct` 欄位

### 6.2 JSON 匯入

- `importFromJSON()` 支援解析 `color_mixing_log` 陣列
- `product_mold_bom` 匯入時自動讀取 `color_mixing_ratio_pct`（可選欄位，遺漏時設為 null）

### 6.3 Excel 匯出（11 個工作表）

| 工作表名稱 | 說明 |
|-----------|------|
| 料號基本主檔 | 含 CB-/CP- 色母/色粉原料 |
| 模具與產能主檔 | — |
| 產品模具成型關聯檔 | **新增「色母/色粉配比(%)」欄位** |
| Sorting 良率標準檔 | — |
| 採購與供應商規則檔 | — |
| 業務預估需求檔 | — |
| 實際訂單檔 | — |
| 庫存與待驗快照檔 | — |
| 在途採購訂單檔 | — |
| **色母色粉混合製程紀錄** | **新增工作表（Sheet 10）** |
| 變更稽核日誌(唯讀) | — |

### 6.4 Excel 匯入

- 「產品模具成型關聯檔」工作表：支援讀取「色母/色粉配比(%)」欄位
- 「色母色粉混合製程紀錄」工作表：完整支援 12 欄位匯入

---

## 七、DEMO 範例資料

### 7.1 色母/色粉原料範例

| SKU | 物料類別 | 分類 | 單位 | 說明 |
|-----|---------|------|------|------|
| `CB-BLACK-01` | RAW | 黑色色母 | KG | 高濃度黑色色母粒，添加比例 2~3% |
| `CB-WHITE-01` | RAW | 白色色母 | KG | 高濃度白色色母粒 |
| `CP-RED-01` | RAW | 紅色色粉 | KG | 紅色色粉，添加比例 0.3~0.8% |
| `CP-BLUE-01` | RAW | 藍色色粉 | KG | 藍色色粉 |

### 7.2 配色 BOM 範例

| 品號 | 模具編號 | 原料品號 | 配比(%) | 生效起始日 |
|------|---------|---------|--------|-----------|
| `A01-200-131` | `MI17193` | `CB-BLACK-01` | 2.0 | 2025-06-01 |

### 7.3 混合製程紀錄範例

| 紀錄 ID | 基礎樹脂 | 樹脂用量(KG) | 色母/色粉 | 用量(KG) | 配比(%) | 製程標籤 |
|--------|---------|------------|----------|---------|--------|---------|
| `MIX-20260820-001` | TERLUX 2802 | 49.0 | CB-BLACK-01 | 1.0 | 2.04 | mixed |
| `MIX-20260818-002` | PP-5011 | 99.5 | CP-RED-01 | 0.5 | 0.50 | mixed |

---

## 八、檔案修改清單

| 檔案 | 修改內容 |
|------|---------|
| `src/types.ts` | 新增 `ColorMixingLog` 介面、`SystemDatabase.color_mixing_log`、`MRPCalculationResult.colorMixingRatioPct/colorantDetail`、`COLOR_MIXING_LOG_STORAGE_KEY` |
| `src/utils/fieldMeta.ts` | `PRODUCT_MOLD_BOM_META` 新增 `color_mixing_ratio_pct`；新增完整 `COLOR_MIXING_LOG_META` |
| `src/utils/materialClassValidation.ts` | `SKU_PREFIX_RULES.RAW` 加入 `CB-`, `CP-`, `COLOR-`（註：`validateRmSkuAsRaw` 函式已於 2026-08-22 移除） |
| `src/utils/mrpEngine.ts` | 新增色母計算邏輯（effectiveResinGrossKg、colorantDetail） |
| `src/utils/dataExchange.ts` | 支援 color_mixing_ratio_pct 匯出；新增 color_mixing_log JSON/Excel 匯出入；新增 Excel Sheet 10 |
| `src/App.tsx` | 相容性初始化 `color_mixing_log` 欄位 |
| `src/data/seedData.ts` | 新增 4 筆色母/色粉原料、1 筆配色 BOM、4 筆供應商規則、2 筆混合紀錄 |

---

## 九、技術約束與注意事項

1. **色母/色粉本身仍是 RAW 類**：不新增 MaterialClass，僅透過 SKU 前綴 `CB-`/`CP-` 區分
2. **color_mixing_ratio_pct 為 BOM 層級欄位**：同一產品不同模具可設不同配比
3. **混合製程紀錄為作業層級**：每筆紀錄對應一次實際混合作業，非 BOM 定義
4. **process_tag 三種選項**：`mixed`（預先混合）、`pre_mix`（預混樣品）、`direct`（直接成型，非預混）
5. **MRP 拆分計算**：當 `color_mixing_ratio_pct > 0` 時，基礎樹脂與色母/色粉各自獨立核算庫存與採購建議
6. **相容性**：舊版資料庫自動建立空 `color_mixing_log` 陣列，不影響既有功能

---

## 十、Git Commit 記錄

| Commit | 說明 |
|--------|------|
| `b398ec6` | feat: 色母/色粉管理系統完整規劃與實作 |

---

*本文檔由 Predictive-Material-System 開發團隊維護*
*最後更新：2026-08-22*
