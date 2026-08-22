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

## V-20260822-01 — 卡片文字可讀性對比度全面修復 + Bug 調查報告

**狀態：** ✅ 修復完成 / 待驗收
**TypeScript 編譯：** 0 錯誤 / 0 警告
**Build：** ✓ built in 5.05s

#### 本次完成

**CAPA-004（Sidebar Active 對比度）**
- 修正 `bg-sky-600/15` → `bg-sky-600`，對比度從 ~1.05:1 → 7.84:1
- 新建 `docs/UI-Contrast-Standards.md` 全局設計規範

**CAPA-005（卡片文字可讀性）— 兩階段修復**

| 階段 | 方案 | 結果 |
|------|------|------|
| v1 | 擴展 `index.css` light mode 覆蓋規則（+9 元素類型、indigo/sky 色系） | ⚠️ 仍不完整 |
| v2 | 組件級 `<style>` 注入（`.light .text-white { !important }`） | ✅ 徹底解決 |

**根本原因（深度分析）**：
1. Tailwind v4 `where()` 偽類權重與 CSS 覆蓋規則競爭，行為不穩定
2. ThemeContext 使用 `class="light"` 而非 `data-theme`，初期選擇器匹配失敗
3. 無自動化對比度檢測 → 無 pre-commit hook → 無 CI 質量檢查
4. 開發者主要驗證暗色模式，淺色模式未被系統性測試

**調查報告**：`docs/PMS-INV-20260822-01-ContrastBugInvestigation.md`

**修改檔案**：
- `src/index.css` — 全面擴展 light mode 覆蓋規則
- `src/components/SystemSettingsView.tsx` — 注入 `.light` 優先級樣式
- `src/components/MrpCalculatorView.tsx` — 注入 `.light` 優先級樣式
- `docs/CAPA-005-ContrastFix.md` — 更新報告
- `docs/UI-Contrast-Standards.md` — 新增第 7 章 CAPA 追蹤
- `docs/PMS-INV-20260822-01-ContrastBugInvestigation.md` — 新編調查報告

#### 驗證結果
- [x] TypeScript 編譯通過
- [x] Production build 成功
- [x] JS bundle 包含正確選擇器（已驗證）
- [ ] 手動視覺審核（需開發者瀏覽器確認）
- [ ] 淺色模式跨瀏覽器兼容性測試

---

## V-20260822-02 — 術語辭典右側按鈕被裁切修復 + CAPA-006

**狀態：** ✅ 修復完成 / 待驗收
**TypeScript 編譯：** 0 錯誤 / 0 警告
**Build：** ✓ built in 5.03s

#### 問題
GlossaryPanel 分類標籤列最右側按鈕（系統功能...）被面板右邊緣裁切，無法點擊。

#### 根本原因（MECE 分析）
1. 內層 flex 容器無 `min-w-max` → Chrome 壓縮行寬而非觸發 parent 滾動
2. `scrollbar-none` class 未定義於 index.css → 無效，無法隱藏滾動條
3. `py-1.,` Tailwind typo → 按鈕 padding 使用瀏覽器默認值

#### 修復
- `src/components/GlossaryPanel.tsx`：flex 行加 `min-w-max`，修復 `py-1.,` typo
- `src/index.css`：新增 `.scrollbar-none` class 定義

#### CAPA-006 報告
`docs/CAPA-006-LayoutOverflowFix.md`

#### 修改檔案
- `src/components/GlossaryPanel.tsx` — min-w-max + py-1., typo 修復
- `src/index.css` — 新增 .scrollbar-none CSS 規則
- `docs/CAPA-006-LayoutOverflowFix.md` — 新編 CAPA 報告

#### 驗證結果
- [x] TypeScript 編譯通過
- [x] Production build 成功
- [ ] 手動視覺審核（375px/768px/1024px 多斷點確認）
- [ ] 跨瀏覽器測試（Chrome/Firefox/Safari）

---

## V-20260822-03 — 全域字體規範統一（最小 13px + 級距標準化）

**狀態：** ✅ 修復完成
**TypeScript 編譯：** 0 錯誤 / 0 警告
**Build：** ✓ built in 5.30s

#### 問題
1. `html` 16px vs `body` 15px 不一致（基準差異）
2. `text-[10px]` / `text-[11px]` 自訂像素未受保護，渲染為 10-11px（低於 13px 最小值）
3. `text-xs` 為 14px、`text-base` 為 16px，級距過大且與 html base 衝突
4. `body font-family` 重複宣告
5. 無全域行高標準 class

#### 根本原因
全局 index.css 的字體覆蓋規則不完整，缺少 `text-[10px]` 和 `text-[11px]` 的強制映射；基礎 html/body font-size 不一致。

#### 修復
- `html { font-size }` 16px → **15px**（與 body 統一）
- `body { font-family }` 重複宣告 → **inherit**
- `.text-xs` 14px → **13px**（新全域最小標準）
- `.text-[10px]` 14px → **13px**（強制映射至最小值）
- `.text-[11px]` **新增** → **14px**
- `.text-sm` line-height 1.45rem → **1.5rem**
- `.text-base` 16px → **15px**（與 html base 一致）
- 新增 `.leading-standard` class（1.6 line-height）

#### 字級標準級距（v2.0）
| Class | 大小 | 行高 | 用途 |
|-------|------|------|------|
| text-xs / text-[10px] | 13px | 1.4rem | 徽章、輔助說明 |
| text-[11px] | 14px | 繼承 | 次要資訊 |
| text-sm | 14.5px | 1.5rem | 表單標籤、說明文字 |
| text-base | 15px | 1.6rem | 正文段落 |

#### 修改檔案
- `src/index.css` — 字體規範全面重整
- `docs/PMS-Typography-Standards.md` — 新編全域字體規範文件

#### 驗證結果
- [x] TypeScript 編譯通過
- [x] Production build 成功
- [ ] 多斷點視覺審核
- [ ] 多瀏覽器兼容性確認

---

## V-20260822-04 — 原料主檔編碼規則全面診斷

**狀態：** ✅ 診斷完成 / 待實施
**報告：** `docs/PMS-INV-20260822-02-MasterFileAudit.md`

#### 核心發現
1. **`customer_id` 雙重語義衝突**：RAW 物料（INEOS/Avient/台化/廠內）實際記錄的是供應商，但字段名意為客戶
2. **無 `supplier_code` 字段**：全系統無標準化供應商代碼，僅有自由文本 `supplier_name`
3. **`POInTransit.supplier_name` 孤立**：自由文本無 FK 約束，與 SupplierRuleMaster 資料獨立
4. **`alt_sku` 缺乏驗證**：無自引用、循環引用、不存在 SKU 的校驗
5. **`ColorMixingLog` 無 RAW 類別強制驗證**：可錄入非 RAW 類 SKU

#### 識別出 5 項問題
| 編號 | 問題 | 嚴重度 |
|------|------|--------|
| I1 | POInTransit.supplier_name 孤立無 FK | 🔴 P1 |
| I2 | customer_id 雙重語義（RAW 存供應商） | 🔴 P1 |
| I3 | supplier_name 無唯一校驗 | 🟡 P2 |
| I4 | alt_sku 缺乏循環引用檢查 | 🟡 P2 |
| I5 | ColorMixingLog 無 RAW 類別強制驗證 | 🟡 P2 |

#### 建議方案
- 新增 `supplier_code` + `customer_code` 欄位拆分雙重語義
- POInTransit.supplier_name → supplier_code FK
- SupplierRuleMaster 新增 supplier_code 唯一識別
- 新增 validateItemMasterRecord() 函數強制分類校驗

---

---

## V-20260822-05 — 程式碼與檔案整體優化作業（死碼清理 + useMemo 最佳化 + 文檔同步）

**狀態：** ✅ 修復完成
**TypeScript 編譯：** 0 錯誤 / 0 警告
**Build：** ✓ built in 4.97s

#### 本次完成

**死碼清理（手術刀式，零功能 Regression）**

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/types.ts` | 移除 3 個未使用 Storage Key | `MATERIAL_CLASSES_STORAGE_KEY` / `SORTING_YIELD_LOG_STORAGE_KEY` / `COLOR_MIXING_LOG_STORAGE_KEY` |
| `src/utils/materialClassValidation.ts` | 移除 6 個未使用函數 | `validateSkuClass`、`validateRmSkuAsRaw`、`validateYieldSku`、`validateSupplierRmSku`、`computeEtaVarianceDays`、`checkBomValidityOverlap`、`migrateItemMasterClasses` |
| `src/utils/backupService.ts` | 移除 1 個未使用函數 | `resetBackupSessionFlag` |
| `src/utils/mrpEngine.ts` | 移除無用別名 | `export const calculateMRPForSku = calculateMRPForSKU` |
| `src/components/MrpCalculatorView.tsx` | import 修正 | `calculateMRPForSku` → `calculateMRPForSKU` |

**BOM 字元清除**
- `src/components/DashboardView.tsx`：移除開頭 38 個 U+FEFF BOM 字元（防 TypeScript 編譯器誤判）

**useMemo 最佳化（避免 MRP 重複全量計算）**
- `src/App.tsx`：`calculateAllMRP()` 呼叫改用 `useMemo(() => ..., [db, systemParams])` 包裹，新增 `useMemo` import
- `src/components/DashboardView.tsx`：同上模式套用
- `src/components/SystemSettingsView.tsx`：同上模式套用

**配置文件更新**
- `.gitignore`：新增 `sync.ffs_db`、`metadata.json`、`docs/*.mec-report.json`、`docs/*.json`

**文檔同步更新**
- `docs/DevelopmentStatus.md`：H-01/H-02/H-03 狀態更新為「已移除待MORP整合後重新評估」
- `docs/FieldArchitectureAudit_Report.md`：移除 `migrateItemMasterClasses()` 引用
- `docs/TraceabilityVerificationReport.md`：DES-01/02/03 嚴重度從 🔴高降為 🟡中；M-05 根本原因更新
- `docs/ColorMaterialProcessSpec.md`：`validateRmSkuAsRaw` 引用更新為「已於2026-08-22移除」

#### 資安盤點結果
- ✅ 無硬編碼 API 金鑰或敏感憑證
- ✅ `.env.example` 僅為佔位符，無實際值
- ✅ 所有業務數據存於 LocalStorage，不涉及外部傳輸
- ✅ 可安全推送至 GitHub 遠端倉庫

#### 驗證結果
- [x] TypeScript 編譯通過（0 錯誤）
- [x] Production build 成功（4.97s）
- [x] 業務邏輯零破壞（死碼均為未導入函數/Storage key）

---

*DEV_LOG.md © 2026 Wesley Chang @Mouldex · 最後更新：2026-08-22*
