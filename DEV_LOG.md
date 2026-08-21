# DEV_LOG.md — 料事如神系統開發日誌

> **Predictive Material System (PMS)**  
> QCC 料事如神圈 · 射出成型智能備料與產能排程推估平台  
> 技術負責人：Wesley Chang @Mouldex

---

## 版本演進記錄

### V-20260820-12 (2026-08-20) — 首個完整基準版本

**狀態：** ✅ 穩定發布  
**TypeScript 編譯：** 0 錯誤 / 0 警告

#### 本版本完成功能清單

**[核心引擎]**
- `mrpEngine.ts` — 3 階 MRP 計算引擎
  - Phase 1：成品淨需求計算（FG 在庫 + WIP 良率折算）
  - Phase 2：BOM 爆炸 → 原料毛需求（克重 + 損耗率）
  - Phase 3：採購決策（淨需求 → 建議採購量 → 最晚下單日）
  - 多模具策略支援：`conservative_max_weight` / `primary_mold_only` / `lowest_weight`
  - 需求彙總模式：`additive` / `po_consume` / `actual_only` / `forecast_only`
  - `calculateAllMRP()`：全品一次性批次計算，用於 Dashboard 全局告警

**[資料管理]**
- `fieldMeta.ts` — 欄位元數據系統（3 級變更管制）
  - Level 1：低影響欄位（直接修改）
  - Level 2：中影響欄位（記錄審計日誌）
  - Level 3：高影響工程變更（必填原因 + 審計日誌）
  - 支援 9 張主檔的完整 CRUD 欄位定義
- `dataExchange.ts` — 無損資料交換引擎
  - JSON 匯出：完整資料庫序列化（含 audit_log）
  - JSON 匯入：結構驗證 + 型別轉換 + 防呆校驗
  - Excel 匯出：9 分頁工作簿（含資料規格字典分頁）
  - Excel 匯入：逐列驗證 + 錯誤彙整報告
  - `DATA_SPECIFICATION_DICTIONARY`：各權責單位填報規範

**[UI 介面 — 6 大功能模組]**
- `DashboardView` — 決策戰情室
  - 全局 MRP 告警列表（紅/橙/黃/紫/綠 5 色分級）
  - KPI 卡片：缺料品數、需補採購、超備呆滯、產能瓶頸
  - 快速跳轉：點擊警告直達對應 SKU MRP 計算器
- `MrpCalculatorView` — 3 階 MRP 推導器
  - SKU 選擇 + 版本號選擇
  - 逐階展示計算過程（成品缺口 → 原料毛需求 → 採購決策）
  - 多模具並排比較
- `SystemSettingsView` — 參數策略設定
  - 所有 `SystemParameters` 欄位的 UI 配置面板
  - 即時預覽參數變更對 MRP 的影響
  - 變更不回寫資料庫，僅保存至 `PARAMS_STORAGE_KEY` LocalStorage
- `DataTablesView` — 8 大主檔維護
  - 9 張主檔（含 audit_log 唯讀檢視）的分頁 CRUD
  - 新增/編輯/刪除 with 變更管制
  - 審計日誌分頁（Level 2/3 變更記錄）
- `DataExchangeView` — 無損資料中心
  - JSON / Excel 雙向匯出入 UI
  - 資料規格字典展示
  - 示範數據（DEMO_SAMPLE_DATABASE）快速載入
  - 空白資料庫（EMPTY_DATABASE）重置
- `PrdDocView` — PRD 規格辭典
  - 系統設計規格文件瀏覽

**[基礎架構]**
- `ThemeContext` — Light/Dark 雙主題（LocalStorage 持久化）
- `Navbar` — 頂部導覽列（6 頁籤 + 告警徽章 + 主題切換）
- Toast 通知系統（全局 success/error 訊息）
- LocalStorage 雙鍵持久化：`PMS_DATABASE_STATE_V1` / `PMS_SYSTEM_PARAMETERS_V1`
- 跨組件路由：`handleNavigateToMRP` / `handleNavigateToTables` / `handleNavigateToSettings`

#### 資料模型（9 大主檔 + 1 審計日誌）

```typescript
SystemDatabase {
  item_master: ItemMaster[]          // 料號基本主檔
  mold_master: MoldMaster[]          // 模具產能主檔
  product_mold_bom: ProductMoldBOM[] // 產品模具 BOM
  yield_master: YieldMaster[]        // 良率標準檔
  supplier_rule_master: SupplierRuleMaster[] // 採購供應商規則
  demand_forecast_log: DemandForecastLog[]   // 業務需求預測
  actual_order: ActualOrder[]        // 實際訂單
  inventory_wip_snapshot: InventoryWIPSnapshot[] // 庫存 WIP 快照
  po_in_transit: POInTransit[]       // 在途採購訂單
  audit_log: ChangeAuditEntry[]      // 變更審計日誌（唯讀）
}
```

#### SystemParameters 可配置參數（13 個）

| 參數鍵 | 預設值 | 說明 |
|--------|--------|------|
| `shortageAlertBufferDays` | 15 | 採購緊急警戒天數 |
| `overstockMultiplier` | 1.6 | 超備/呆滯倍數門檻 |
| `defaultWarehouseCapacityKg` | 12,000 | 全廠預設單項原料倉容上限 |
| `capacityBufferDays` | 0 | 產能瓶頸裕度天數 |
| `cavityAlertThresholdPercent` | 100% | 塞穴告警門檻 |
| `multiMoldStrategy` | `conservative_max_weight` | 多模備料原則 |
| `demandConsumptionMode` | `additive` | 需求彙總模式 |
| `dailyOperatingHours` | 24.0 | 每日有效工作時數 |
| `defaultSortingYield` | 0.98 | 預設全檢良率 |
| `defaultMfgScrapRate` | 0.03 | 預設成型損耗率 |
| `defaultProcurementLeadTimeDays` | 90 | 預設採購交期 |
| `defaultMoqKg` | 1,000 | 預設最小起訂量 |
| `safetyStockMultiplier` | 1.0 | 全廠安全庫存動態係數 |

---

## 已知問題 & CAPA 記錄

### CAPA-001 (2026-08-21)

**問題：** `Navbar.tsx` 連線狀態顯示的日期（`2026-08-20`）為硬編碼字串，非動態計算。  
**影響等級：** 低（僅視覺顯示，不影響業務邏輯）  
**RCA：** 初版開發以靜態字串快速實作佔位，未替換為動態日期。  
**CAPA：** 下一版本更新為 `new Date().toISOString().slice(0, 10)` 動態計算。  
**狀態：** ⚠️ 待辦（低優先度）

### CAPA-002 (2026-08-21)

**問題：** `@google/genai`、`express`、`dotenv` 已在 `package.json` 中聲明，但 Frontend 代碼未實際使用。  
**影響等級：** 低（僅增加 bundle 體積風險，目前 Vite tree-shaking 可有效排除）  
**RCA：** AI Studio 後端預留架構，為未來 Server-Side Gemini API 整合準備。  
**CAPA：** 保留，待後端功能啟用時引用。若確定不需要後端，下版清除。  
**狀態：** ⚠️ 觀察中（設計決策，非 Bug）

---

## 整體程式碼優化作業記錄

### 2026-08-21 — V-20260820-12 代碼庫清理優化

**執行人：** Antigravity AI (Wesley Chang @Mouldex)  
**類型：** 配置修正 + 文件同步 + Git 基準點建立

**變更清單：**
1. `package.json`：`name` 由 `"react-example"` → `"predictive-material-system"`
2. `package.json`：移除 `dependencies` 中重複的 `vite` 聲明（已在 `devDependencies` 正確定義）
3. `.gitignore`：補充 `bun.lock`、`*.local`、`.env.local`、`server.js`、`Thumbs.db`、`assets/.aistudio/`
4. `README.md`：全面重寫（從 AI Studio 通用範本 → 完整專案技術文件）
5. `DEV_LOG.md`：新建開發日誌（本檔案）
6. Git 初始化：`git init` + 首次 Commit 建立版本基準點

**驗證結果：**
- TypeScript 編譯：`npx tsc --noEmit` → ✅ 0 錯誤 / 0 警告
- 業務邏輯：未修改任何 `.tsx` / `.ts` 源碼，零破壞風險

---

## 後續開發路線圖（Roadmap）

| 優先度 | 功能 | 說明 |
|--------|------|------|
| 🔴 高 | 動態連線日期修正 | Navbar 連線狀態日期改為動態計算（CAPA-001） |
| 🟡 中 | 後端 API 整合 | 啟用 `@google/genai` 進行智能分析建議 |
| 🟡 中 | 多廠區支援 | 擴展模具/庫存資料模型支援多廠房 |
| 🟢 低 | PWA 離線支援 | Service Worker 緩存確保無網路環境可用 |
| 🟢 低 | 角色權限管理 | Level 3 PIN 審批工作流（已在型別中預留） |

---

*DEV_LOG.md © 2026 Wesley Chang @Mouldex · 最後更新：2026-08-21*
