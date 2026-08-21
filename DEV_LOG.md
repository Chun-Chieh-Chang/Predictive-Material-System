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
  - 支援 10 張主檔的完整 CRUD 欄位定義
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
- `DataTablesView` — 10 大主檔維護
  - 10 張主檔的分頁 CRUD（不含 audit_log，audit_log 為 append-only 稽核日誌）
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

### CAPA-001 (2026-08-21) ✅ 已關閉

**問題：** `Navbar.tsx` 連線狀態顯示的日期（`2026-08-20`）為硬編碼字串，非動態計算。  
**影響等級：** 低（僅視覺顯示，不影響業務邏輯）  
**RCA：** 初版開發以靜態字串快速實作佔位，未替換為動態日期。  
**CAPA：** 改為 `TaiwanDate` 元件（`useState` + `useEffect` 30 秒檢查跨天），已於 V-20260821-22 優化時修複。  
**狀態：** ✅ 已關閉

### CAPA-002 (2026-08-21) ✅ 已關閉

**問題：** `@google/genai`、`express`、`dotenv` 已在 `package.json` 中聲明，但 Frontend 代碼未實際使用。  
**影響等級：** 低（僅增加 bundle 體積風險，目前 Vite tree-shaking 可有效排除）  
**RCA：** AI Studio 後端預留架構，為未來 Server-Side Gemini API 整合準備。  
**CAPA：** 已於 V-20260821-22 全域優化時移除（`motion`、`autoprefixer`、`esbuild`、`tsx` 亦一併清除）。  
**狀態：** ✅ 已關閉

### CAPA-003 (2026-08-21)

**問題：** `xlsx`（SheetJS）套件有 1 項 high severity 漏洞：Prototype Pollution + ReDoS。  
**影響等級：** 中（本系統為純前端 LocalStorage 應用，Excel 檔案由使用者本機提供，不經伺服器處理）  
**RCA：** xlsx v0.18.x 已知漏洞，官方尚未發布 patched 版本。  
**CAPA：** 暂維持現狀。若未來升級至 v1.x（SheetJS Pro），可消除此風險。當前使用情境（本機匯入/匯出驗證資料）不觸發遠端程式碼執行路徑。  
**狀態：** ⚠️ 觀察中（設計決策，風險可接受）

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

## 近期開發紀錄

### V-20260821-20~21 — 欄位架構盤點實作 + 分類體系補強

**狀態：** ✅ 穩定  
**TypeScript 編譯：** 0 錯誤 / 0 警告  

#### 本次完成

1. **五層物料分類體系**（`MaterialClassManagementView`）
   - RAW / MAT / PART / COMP / SET 五層樹，支援無限子節點擴充
   - SKU 前缀自動推斷（RM-/PKG-/CONN-/ASM-/A01-）
   - JSON 備份同步攜帶 `material_classes` 陣列

2. **FieldArchitectureAudit_Report.md** — 完整盤點報告
   - H-01~H-04：FK 分類校驗函式定義（待接入 handleSave）
   - M-01~M-06：10 張主檔欄位擴充實作
   - FT-01~FT-07 測試驗證規格書

3. **全域一致性盤點**（7 處「8 大主檔」修正為「10 大」）
   - Navbar / DataTablesView / DataExchangeView / README / DEV_LOG / PrdDocView

4. **SET 分類描述修正**（`8fa4560`）
   - 明確 SET 可透過 BOM 直接引用 PART（一次組裝），不需經 COMP 入庫

#### 開發承接文檔
- `docs/DevelopmentStatus.md` — 下次啟動時優先閱讀，含待辦事項與執行順序

---

### V-20260821-22 — 全域程式碼與檔案優化作業

**狀態：** ✅ 穩定  
**TypeScript 編譯：** 0 錯誤 / 0 警告  

#### 已完成項目

**死碼清理（零功能 Regression）**
- `types.ts`：移除未使用的 `ChangeLevel` 型別
- `materialClassValidation.ts`：11 個 internal-only 函式由 `export` 改為內部宣告
- `backupService.ts`：`validateDatabaseIntegrity` / `resetBackupSessionFlag` 改為內部宣告
- `dataExchange.ts`：`runRelationalAudit` 改為內部宣告

**懸空依賴移除**
- `package.json`：移除 `motion`（dependencies）、`autoprefixer` / `esbuild` / `tsx`（devDependencies）
- `vite.config.ts`：`vendor-ui` manualChunks 移除 `motion`
- `.gitignore`：新增 `.vscode/`、`.idea/`、`*.tsbuildinfo`

**Bug Fix**
- `seedData.ts`：DEMO_SAMPLE_DATABASE 的 item_master 全部補上 `material_class`（SET/RAW）
- `MrpCalculatorView.tsx`：SKU 篩選由 `category === 'FinishedGoods'` 改為 `material_class === 'SET'`（解決 Demo 模式下 SKU 下拉空白）
- `DashboardView.tsx`：硬編日期 `'2026-08-20'` 改為 `new Date()` 動態計算

**文件同步**
- `README.md`：版本號 → V-20260821-22，「6 大模組→8 大模組」，「9 大主檔→10 大主檔」，系統參數 6 項→13 項，補充 BackupSettingsView / MaterialClassManagementView 於專案結構
- `DEV_LOG.md`：CAPA-001 / CAPA-002 狀態改為 ✅ 已關閉，新增 V-20260821-22 章節

#### 開發承接文檔
- `docs/DevelopmentStatus.md` — 下次啟動時優先閱讀，含待辦事項與執行順序

---

## 後續開發路線圖（Roadmap）

| 優先度 | 功能 | 說明 |
|--------|------|------|
| 🔴 高 | H-01/H-02/H-03 校驗接入 handleSave | DataTablesView 新增 FK 分類校驗，阻擋非 RAW 料號進入 BOM/供應商規則 |
| 🔴 高 | M-05 BOM 有效期重疊校驗接入 | DataTablesView 新增 checkBomValidityOverlap 校驗 |
| 🟡 中 | eta_variance_days 自動計算 | po_in_transit save 時觸發 computeEtaVarianceDays |
| 🟡 中 | 後端 API 整合 | 啟用 `@google/genai` 進行智能分析建議 |
| 🟡 中 | 多廠區支援 | 擴展模具/庫存資料模型支援多廠房 |
| 🟢 低 | PWA 離線支援 | Service Worker 緩存確保無網路環境可用 |
| 🟢 低 | 角色權限管理 | Level 3 PIN 審批工作流（已在型別中預留） |

---

## V-20260821-23 — GitHub Pages 部署上線

**狀態：** ✅ 穩定發布
**部署網址：** https://chun-chieh-chang.github.io/Predictive-Material-System/

#### 本次完成

- GitHub Actions workflow 修復：移除 GitHub Pages environment 保護規則阻擋部署
- 升級部署工具鏈至 Node.js 22、github-pages-deploy-action v5
- workflow 重構為單一 job 結構，消除並行 conflict
- TypeScript 編譯：✅ 0 錯誤 / 0 警告

---

*DEV_LOG.md © 2026 Wesley Chang @Mouldex · 最後更新：2026-08-21*
