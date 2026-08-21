# 料事如神（PMS）主檔欄位架構盤點與擴充需求評估報告

> 版號：`V-20260821-17`　|　評定日期：2026-08-21　|　評定者：工程團隊

---

## 一、前置需求梳理（擴充計畫需求清單）

### 1.1 Phase 1 核心功能需求

| # | 功能項目 | 業務場景 | 資料存取類型 | 優先級 | 技術約束 |
|---|----------|----------|-------------|--------|----------|
| F1-01 | 五層物料分類體系 | 原料/包材/零件/組件/SET 全品項分類歸屬 | 高頻讀、低频寫 | P0 | 無限子節點、JSON 備份攜帶、匯入自動推斷 |
| F1-02 | MRP 三階計算引擎 | FG→RM 需求推導、爆倉/缺料警示 | 中頻讀、中頻寫 | P0 | SSOT 原則、單穴克重不可手動改 |
| F1-03 | 變更稽核 L1/L2/L3 | 設計穴數/單穴克重等敏感欄位可追溯 | 高频寫（稽核）、低频讀 | P0 | Audit_Log append-only、Level 1 不記檔 |
| F1-04 | 自動化備份系統 | FSA API 每日寫入、LocalStorage 自動持久 | 低频寫 | P1 | UTC+8 時區、localStorage 365筆日誌上限 |
| F1-05 | 多模備料策略 | conservative_max_weight / primary_only / lowest_weight | 中頻讀 | P1 | 每產品可掛多模、單一 BOM entry |
| F1-06 | 即時預警機制 | 缺料/爆倉/產能瓶頸三維警示 | 中頻讀 | P1 | shortageAlertBufferDays、overstockMultiplier 可配置 |

### 1.2 Phase 2 ERP 整合需求（規劃中）

| # | 功能項目 | 資料存取場景 | 優先級 | 技術約束 |
|---|----------|-------------|--------|----------|
| F2-01 | Dingxin ERP Inventory 同步 | 高併發讀、批量寫、每日定時拉取 | P1 | SSOT 原則、No Double Key-in |
| F2-02 | Dingxin ERP PO In-Transit 同步 | 高併發讀、批量寫 | P1 | 與現有 po_in_transit 合併去重 |

### 1.3 Phase 3 自適應反饋需求（規劃中）

| # | 功能項目 | 資料存取場景 | 優先級 | 技術約束 |
|---|----------|-------------|--------|----------|
| F3-01 | Sorting 良率動態回饋閉環 | 批量寫（每批次）、趨勢讀 | P2 | 需保留歷史實際良率軌跡 |
| F3-02 | PWA 離線操作支援 | Service Worker 管理 | P3 | Cache-first 策略 |

---

## 二、現況盤點對比與問題清單

### 2.1 10 張主檔欄位總覽

| 表名 | 欄位數 | PK | FK 參考 | Editability 分佈 |
|------|--------|-----|---------|-----------------|
| item_master | 9 | sku | — | locked×1, 1×3, 3×3, computed×0 |
| mold_master | 7 | mold_id | — | locked×1, 1×2, 2×3, computed×1 |
| product_mold_bom | 9 | sku+mold_id | item_master(sku, rm_sku), mold_master(mold_id) | locked×2, 3×4, computed×1 |
| yield_master | 3 | sku | item_master(sku) | locked×1, 2×1 |
| supplier_rule_master | 7 | rm_sku | item_master(rm_sku) | locked×1, 1×1, 2×5 |
| demand_forecast_log | 9 | demand_id | item_master(sku) | locked×1, 1×4, 2×3 |
| actual_order | 7 | order_id | item_master(sku) | locked×1, 1×3, 2×2 |
| inventory_wip_snapshot | 5 | date+sku | item_master(sku) | locked×2, 2×3 |
| po_in_transit | 6 | po_number | item_master(rm_sku) | locked×1, 1×2, 2×2 |
| audit_log | 11 | id | — | N/A（append-only）|

**合計：73 欄位（含 2 個 computed 欄位）**

### 2.2 問題清單（經盤點驗證）

#### 🔴 HIGH — 結構性缺口（必須修復）

| ID | 問題描述 | 影響場景 | 驗證依據 |
|----|----------|----------|----------|
| **H-01** | `product_mold_bom.rm_sku` 無 RAW 類別校驗 — 可任意 FK 指向非原料 SKU | 階段二 MRP 毛需求計算錯誤 | 當前 fieldMeta 未限制 rm_sku 僅接受 RAW 類 |
| **H-02** | `yield_master.sku` 無 PART/SET 類別校驗 — 可填入 RAW 料號 | 階段一 FG Net Req 的 Effective WIP 計算錯誤 | 原料（RAW）無需 Sorting，不該有良率記錄 |
| **H-03** | `supplier_rule_master.rm_sku` 無 RAW 類別校驗 — 可填入非原料 SKU | 階段三 RM Net Req 採購計算錯誤 | 包材(MAT)/零件(PART)不需供應商採購規則 |
| **H-04** | `ItemMasterV0` 與 `ItemMaster` 雙介面並存 — TypeScript 型別歧義 | 遷移時誤用舊介面，material_class 字段丟失 | types.ts 第 25 行仍存在 V0 定義 |
| **H-05** | `inventory_wip_snapshot` 無歷史歸檔策略 — 10 年日快照約 3.6 億筆 | 超過 localStorage 10MB 上限，性能崩潰 | 假設 1000 SKU × 365 天 × 10 年 = 365M 行 |

#### 🟡 MEDIUM — 功能擴充缺口（建議補強）

| ID | 問題描述 | 影響場景 | 驗證依據 |
|----|----------|----------|----------|
| **M-01** | `po_in_transit` 缺少 `actual_arrival_date` 與 `eta_variance_days` | Phase 2 ERP 同步需回寫到貨日期；無法計算交期違約率 | 現有欄位僅有 ETA 預期值 |
| **M-02** | `demand_forecast_log.created_by` 為字串姓名無 ID | 變更稽核無法精確溯源到操作者帳號 | Audit_Log 記錄 reason 欄位無法區分不同業務員 |
| **M-03** | `mold_master` 缺少 `machine_type` 與 `production_line` 欄位 | 多模策略需按機型篩選；產能瓶頸預警需按線別統計 | 當前 location 欄位字串模糊 |
| **M-04** | `supplier_rule_master.unit_price_usd` 無 TWD 欄位 | 國內採購需台幣計價；匯率變動影響成本估算 | 目前只有 USD |
| **M-05** | `product_mold_bom` 缺少 `valid_from` / `valid_to` 有效期 | 模具更換時舊 BOM 仍生效，無時間範圍控制 | 當前 BOM entry 永遠有效 |
| **M-06** | 無 `sorting_actual_yield_log` 表 | Phase 3 動態回饋閉環無法實現 — 歷史實際良率無處存放 | 當前 yield_master 僅有 std_sorting_yield |

#### 🟢 LOW — 優化建議（未來迭代）

| ID | 問題描述 | 建議 |
|----|----------|------|
| **L-01** | `audit_log` 無 `user_id` 欄位 | 與 M-02 配套，精確稽核溯源 |
| **L-02** | `item_master.category` 與 `material_class` 語義重複 | category 改為「品類細節描述」，material_class 為業務分類主鍵 |
| **L-03** | `po_in_transit.status` 狀態機不完整 | 缺 `delayed`、`partial_arrived` 狀態 |
| **L-04** | `inventory_wip_snapshot.fg_ready_qty` 與 `wip_pending_qty` 無 min/max 校驗 | 可能录入負值 |

---

## 三、重設計方案（需啟動）

### 3.1 欄位增刪改詳細規格

#### H-04：移除 ItemMasterV0，統一使用 ItemMaster

```typescript
// 刪除：
// export interface ItemMasterV0 { ... }   ← 移除
// 保留升級版 ItemMaster（含 material_class 字段）
```

#### H-01/H-02/H-03：新增分類校驗工具函式

```typescript
// src/utils/materialClassValidation.ts 新增：
export function validateSkuClass(
  sku: string,
  expectedClasses: MaterialClassCode[],
  itemMaster: ItemMaster[]
): boolean
// 用法：
//   product_mold_bom.rm_sku → validateSkuClass(sku, ['RAW'], items)
//   yield_master.sku        → validateSkuClass(sku, ['PART','COMP','SET'], items)
//   supplier_rule_master.rm_sku → validateSkuClass(sku, ['RAW'], items)
```

#### M-01：po_in_transit 新增 2 欄位

| 欄位 | 型別 | Editability | 說明 |
|------|------|-------------|------|
| `actual_arrival_date` | `string \| null` (YYYY-MM-DD) | 2 | ERP 同步回寫到貨日期 |
| `eta_variance_days` | `number \| null` (computed) | computed | 實際到貨日 − ETA 預期間隔（可正可負） |

#### M-02：demand_forecast_log.created_by 改為 ID

| 欄位 | 變更 |
|------|------|
| `created_by` | 重命名為 `created_by_id`，型別改為 `string`（儲存帳號 ID，e.g. `usr_001`）|
| 新增 `created_by_name` | `string \| null`，顯示用姓名（便於 UI 展示，可選）|

#### M-03：mold_master 新增 2 欄位

| 欄位 | 型別 | Editability | 說明 |
|------|------|-------------|------|
| `machine_type` | `string \| null` | 1 | 成型機型號（e.g. ` Engel 200T`）|
| `production_line` | `string \| null` | 1 | 產線編號（e.g. `LINE-A`）|

#### M-04：supplier_rule_master 新增 1 欄位

| 欄位 | 型別 | Editability | 說明 |
|------|------|-------------|------|
| `unit_price_twd` | `number \| undefined` | 2 | 台幣單價（當採購幣別為 TWD 時填寫）|

#### M-05：product_mold_bom 新增 2 欄位

| 欄位 | 型別 | Editability | 說明 |
|------|------|-------------|------|
| `valid_from` | `string` (YYYY-MM-DD) | 1 | BOM 生效起始日 |
| `valid_to` | `string \| null` (YYYY-MM-DD) | 1 | BOM 失效日（null = 至今有效）|

#### M-06：新增 sorting_actual_yield_log 表

```typescript
export interface SortingActualYieldLog {
  log_id: string;           // PK: SYL-{YYYYMMDD}-{SEQ}
  sku: string;              // FK → item_master.sku (PART/COMP/SET only)
  batch_no: string;         // 生產批號
  sorting_date: string;     // YYYY-MM-DD
  qty_sorted: number;       // 全檢數量 PCS
  qty_passed: number;       // 合格數量 PCS
  actual_yield_rate: number; // computed: qty_passed / qty_sorted
  operator_id: string;      // 作業員 ID
  notes?: string | null;
  created_at: string;       // ISO timestamp
}
```

**索引建議：** `(sku, sorting_date)` COMPOSITE INDEX

### 3.2 資料遷移計畫

#### 遷移步驟

```
步驟 1: 全量備份
  - 執行 localStorage 全量匯出（匯出按鈕）
  - 備份檔案命名：PMS_Backup_PreMigration_{date}.json

步驟 2: 型別相容遷移（H-04）
  - 讀取現有 item_master 資料
  - 若 material_class 為 null，執行 migrateItemMasterClasses() 自動對應
  - 更新 localStorage 中的 PMS_ITEM_MASTER key

步驟 3: po_in_transit 欄位擴展（M-01）
  - 現有記錄：actual_arrival_date = null，eta_variance_days = null
  - 无需資料轉換，僅新增欄位

步驟 4: demand_forecast_log 欄位重命名（M-02）
  - 對每筆記錄：created_by_id = created_by，created_by_name = null
  - 刪除舊 created_by 欄位

步驟 5: 寫入新 key
  - PMS_SORTING_YIELD_LOG_V1 = []（空陣列，待 Phase 3 填充）
  - PMS_MATERIAL_CLASSES_V1 已由 MaterialClassManagementView 建立
```

#### 數據一致性校驗

| 校驗項目 | 方法 | 通過標準 |
|----------|------|----------|
| item_master SKU 不重複 | 匯出後 `new Set(skus).size === items.length` | 100% |
| product_mold_bom.rm_sku 皆為 RAW | 校驗函式 `validateSkuClass` | 0 violations |
| yield_master.sku 皆為 PART/COMP/SET | 同上 | 0 violations |
| audit_log append-only 不丢失 | 遷移前後 hash 比對 | SHA-256 match |

#### 回滾方案

```
若遷移失敗：
  1. 停用 MaterialClassManagementView 入口（navbar 隱藏）
  2. 恢復 localStorage 備份資料（重新匯入 PreMigration 備份檔）
  3. 清除 PMS_MATERIAL_CLASSES_V1、PMS_SORTING_YIELD_LOG_V1 等新的 key
```

### 3.3 相容性對策

| 面向 | 對策 | 過渡期時間 |
|------|------|-----------|
| 舊版匯出 JSON（無 material_class 欄位）| 匯入時自動執行 `migrateItemMasterClasses()` 依 category 推斷分類 | 立即生效 |
| 舊版匯出 JSON（無 sorting_yield_log）| 系統初始化時自動建立空陣列 | 立即生效 |
| 瀏覽器快取舊版 schema | 每次載入檢查 `localStorage.__SCHEMA_VERSION__`，若低於最新版本則提示使用者匯出備份再清空 | 首次啟動偵測 |
| 多標籤頁並行操作 | 使用 `storage` event 監聽跨標籤同步，30ms debounce | 立即生效 |

---

## 四、測試驗證標準

### 4.1 功能測試（覆蓋全部擴充需求）

| 測試編號 | 測試項目 | 輸入 | 預期輸出 | 通過門檻 |
|----------|----------|------|----------|----------|
| FT-01 | H-01 校驗：rm_sku 非 RAW 被拒 | 新增 product_mold_bom，rm_sku = PART 類料號 | Toast 錯誤：「原料料號必須屬於 RAW 類」 | 阻擋新增 |
| FT-02 | H-02 校驗：yield_master SKU 非 PART/SET 被拒 | 新增 yield_master，sku = RAW 類料號 | Toast 錯誤：「Sorting 良率僅適用於零件/組件/SET 類」 | 阻擋新增 |
| FT-03 | H-03 校驗：supplier_rule rm_sku 非 RAW 被拒 | 新增 supplier_rule，rm_sku = MAT 類料號 | Toast 錯誤：「供應商規則僅適用於原料類料號」 | 阻擋新增 |
| FT-04 | M-01 到貨日期回填 | 手動新增 po_in_transit，填寫 actual_arrival_date | eta_variance_days 自動計算 | 數值正確 |
| FT-05 | M-05 BOM 有效期 | 新增 BOM entry valid_to=2026-09-01 | 該日期後 MRP 不再引用此 BOM | 邏輯正確 |
| FT-06 | H-04 舊資料遷移 | 匯入不含 material_class 的舊 JSON | 系統自動對應 RAW/MAT/PART/COMP/SET | 遷移後無 null |
| FT-07 | 五層分類樹匯出 | 匯出 JSON | material_classes 陣列完整（5 筆頂層） | JSON 可解析 |

### 4.2 相容性測試

| 測試編號 | 測試項目 | 預期結果 |
|----------|----------|----------|
| CT-01 | Chrome 130+ 讀取舊版備份檔 | 正常載入，無 console error |
| CT-02 | Edge 130+ 讀取舊版備份檔 | 同上 |
| CT-03 | Firefox 133+ 讀取舊版備備份檔 | 同上 |
| CT-04 | Safari 18+ 讀取舊版備份檔 | 同上 |
| CT-05 | 新增 material_classes key 後舊 tab 重新整理 | 分類數據不被覆蓋 |

### 4.3 效能測試

| 測試編號 | 測試項目 | 通過門檻 |
|----------|----------|----------|
| PT-01 | 1000 SKU × 365 天 inventory_wip_snapshot 載入 | < 2s（分批渲染） |
| PT-02 | MRP 三階計算（100 SKU Forecast） | < 500ms |
| PT-03 | 分類樹 200 節點 RERENDER | < 100ms |
| PT-04 | localStorage 寫入 1MB 資料 | < 100ms |

### 4.4 一致性測試

| 測試編號 | 測試項目 | 通過標準 |
|----------|----------|----------|
| IC-01 | 遷移前後 item_master 筆數 | 完全相同 |
| IC-02 | 遷移前後 audit_log SHA-256 | match |
| IC-03 | 遷移後 all rm_sku 皆可查證為 RAW 類 | 0 不符 |
| IC-04 | 遷移後 all yield_master.sku 皆可查證為 PART/COMP/SET | 0 不符 |

---

## 五、風險識別與控管措施

| 風險 ID | 風險描述 | 可能性 | 影響度 | 控管措施 |
|---------|----------|--------|--------|----------|
| R-01 | 舊版備份 JSON 結構 incompatible | 高 | 中 | 強制升級提示 + 半自動遷移 script |
| R-02 | Sorting_yield_log 資料遺漏 | 低 | 中 | Phase 3 啟動前手動回填最近 90 天 |
| R-03 | BOM 有效期衝突（兩筆同時有效）| 低 | 低 | 新增時校驗 valid_from～valid_to 範圍 |
| R-04 | localStorage 10MB 上限飽和 | 中 | 高 | 啟用 FSA API 後自動切換到磁碟備份 |
| R-05 | 跨標籤頁 concurrent edit 競速條件 | 低 | 中 | storage event + 版本號 optimitic lock |

---

## 六、結論與實施建議

### 評估結論

**需要啟動重新設計**：部分欄位（H-01/H-02/H-03 校驗邏輯、M-06 sorting_yield_log 新表）必須實作，但現有資料模型結構無需大改。

### 分階段實施順序

| 階段 | 內容 | 預估變更規模 |
|------|------|-------------|
| **Stage 1（本任務）** | H-04（移除 V0）、H-01~H-03（校驗工具函式）、fieldMeta 新增分類下拉 | 輕量，~200 行 |
| **Stage 2（本次同步）** | M-01~M-05（欄位擴充）、M-06（新表）| 中型，~400 行 |
| **Stage 3（Phase 3 啟動時）** | Sorting yield 回饋 UI、實際良率錄入畫面 | 中型，~300 行 |
| **Stage 4（Phase 2 規劃）** | Dingxin API 整合、自動同步排程 | 大型，需後端服務 |

### 立即行動項目

1. ✅ 本報告已完成
2. ⬜ Stage 1+2 欄位擴充實作（本任務範圍）
3. ⬜ 遷移腳本執行 + 資料驗證
4. ⬜ 相容性測試（四瀏覽器）
5. ⬜ Stage 3 Phase 3 啟動時實作 Sorting Yield Log UI
