# 料事如神（PMS）開發進度與後續計畫

> 版號：以 `src/utils/version.ts` (SSOT) 為準，pre-commit 自動同步　|　更新日期：2026-08-25　|　狀態：✅ 15 大核心業務目標 100% 達成，V2-Intranet 內網部署落地，Anti-Placebo 數據鏈誠實化完成

---

## 一、已完成功能清單（Commit 基準）

### 版本 `Anti-Placebo 數據鏈誠實化`（最新功能基準 — 詳見 DEV_LOG.md V-20260825 段落）

#### 本版本重點變更
| 項目 | 說明 |
|------|------|
| 全域預設備胎全數拔除 | 物料屬性（良率/損耗率/MOQ/交期/安全庫存）一律以主檔個別值為準，`mrpEngine` / `orderTensionEngine` / `ShipScheduleClearanceView` 共 10 處 fallback 移除 |
| 主檔缺值即拒算並警示 | 缺值品號不列入計算，速覽表/缺料分析顯示 ⚠️ 並精確指出缺哪個欄位（`calcError` + `data_integrity` 警示類型） |
| 多模具策略假選項修復 | `conservative_max_weight` 改為純最大單穴克重比較，三種策略行為互異 |
| 無 BOM 訂單誠實標記 | SET-BREATH-CIR-01 / SET-IV-EXT-01 不再以 DEFAULT_MOLD/RAW-RESIN 假參數編造診斷，改標記「尚未建立成型 BOM」 |
| 完整性掃描新增 missing_field | item_master 掃描段統一把關 RAW 三欄與成品良率完整性 |

#### V2-Intranet 內網部署（本日稍早落地）
| 項目 | 說明 |
|------|------|
| PowerShell 5.1 檔案服務後端 | `server/`：零依賴 HttpListener + 樂觀鎖 (404/409) + 滾動快照 |
| 共用資料適配器 | `dataStoreAdapter.ts`：loadSharedData/saveSharedData，App 接線雙模式（local/intranet） |
| 部署管線 | GitHub Actions artifact 部署（gh-pages 通道已移除） |

#### 核心運算引擎 (5 大引擎)
| 項目 | 狀態 | 說明 |
|------|------|------|
| 三向需求交叉比對與偏差分析引擎 | ✅ | `demandAnalysisEngine.ts`：Forecast vs Actual vs 歷史同期三向比對、Bias% 運算、三色警示燈 |
| 3 階 MRP 推導核心引擎 | ✅ | `mrpEngine.ts`：FG Net Req → BOM 展開 → 採購決策、分批到貨建議、虛擬預扣，支援計算公式明細展開 |
| WIP 日動態推估公式計算器 | ✅ | `wipEngine.ts`：$WIP(t) = WIP(t-1) + P(t) - S(t)$，含夜班 12h 無人挑選時序差補償，涵蓋 PART/COMP/SET |
| 訂單缺料分析引擎 | ✅ | `orderTensionEngine.ts`：6 大供應鏈環節瓶頸掃描、缺料告警與處置建議 |
| 資料關聯完整性與模擬器 | ✅ | `dataIntegrityScanner.ts` & `dataPipelineSimulation.ts`：8 大核心主檔關聯校驗與資料健康防呆 |

#### 業務與視覺化看板 (13 大模組)
| 視圖模組 | 檔案 | 狀態 | 說明 |
|---------|------|------|------|
| 業務工作台 | `SalesWorkbenchView.tsx` | ✅ | 業務入口：客戶/品號快速查詢、預測偏差比對、交期確認 |
| 生管採購工作台 | `ProcurementWorkbenchView.tsx` | ✅ | 生管採購入口：最晚下單日倒數、3階MRP推導、模具產能與資料表維護 |
| 物料需求總覽 | `DashboardView.tsx` | ✅ | 三向需求交叉比對看板、客戶預測偏差分析 (Bias%)、全局告警 |
| 3階 MRP 推導器 | `MrpCalculatorView.tsx` | ✅ | 單品/全品 MRP 推導、計算公式明細、採購排程時間軸與最晚下單日倒數 |
| 出貨排程可行性審查看板 | `ShipScheduleClearanceView.tsx` | ✅ | 專為每週二出貨會議設計，良品+在製品 WIP 待驗折算、三色放行燈號、情境模擬 |
| 訂單缺料分析看板 | `OrderTensionTrackerView.tsx` | ✅ | 逐筆訂單 6 大環節瓶頸診斷、全文檢索、缺料原因與處置建議 |
| 資料表維護 | `DataTablesView.tsx` | ✅ | 8 大核心主檔 CRUD、3 級變更管制與外鍵關聯影響即時掃描 |
| 名詞術語說明 | `GlossaryView.tsx` | ✅ | 7 大分類專有名詞檢索 + 主檔案全欄位定義庫 (90+ 欄位) |
| 參數策略設定 | `SystemSettingsView.tsx` | ✅ | 4 種需求沖銷模式切換、虛擬預扣開關、損耗率天花板防呆；物料屬性一律以主檔為準（缺值拒算，無全域預設） |
| 資料匯入匯出 | `DataExchangeView.tsx` | ✅ | 智慧雙模切換 (Demo ↔ Prod)、Excel/JSON 雙向匯出入、資料關聯模擬 |
| 物料分類體系 | `MaterialClassManagementView.tsx` | ✅ | 五層樹狀分類管理 (RAW/MAT/PART/COMP/SET) |
| 系統規格與驗收 | `PrdDocView.tsx` | ✅ | 15 大核心可驗收目標 (OBJ-01 ~ OBJ-15) 規格與驗收總表 |
| 備份與復原設定 | `BackupSettingsView.tsx` | ✅ | 自動排程備份與 JSON 備份還原 |

#### 8 大核心主檔與架構優化成果
| 項目 | 狀態 | 說明 |
|------|------|------|
| 主檔架構 3NF 高內聚精簡 | ✅ | 從 11 張表格縮減為 7 張核心營運主檔，良率標準與採購規則直合於品號主檔，色料配比直合於成型 BOM |
| 10+ 冗餘無運算欄位剔除 | ✅ | 移除 `material_class_label`, `valid_from`, `valid_to`, `created_by_id` 等非必要欄位，大幅減輕現場填報負擔 |
| 90+ 主檔全欄位定義字典 | ✅ | `masterFieldDictionary.ts` 全面落地於辭典視圖與資料中心，消除跨部門語義衝突 |
| 全自動門禁與代碼建置無痛編譯 | ✅ | Vite Build 通過（0 錯誤 / 0 警告），數學驗證腳本 100% PASS |
| CAPA 閉環體系與自進化藍圖 | ✅ | CAPA-001~015 全覆蓋，發布 IMPL-PLAN-002 自進化有機體實施計畫 |

---

## 二、待辦事項（按優先順序）

### 🔴 P0 — 高優先度（影響正確性）

#### T-01：H-01 分類限制（rm_sku 僅接受 RAW 類）
**現狀：** 原 `validateRmSkuAsRaw()` 等校驗函式已於 2026-08-22 移除。目前 `rm_sku` 採 fk_select 下拉（來源 item_master），但**未過濾物料分類**；完整性掃描亦僅驗證存在性、未驗證類別。
**待重新評估：** 於 fieldMeta fk_select 加入分類過濾，或於掃描器新增 H-01 類別檢查。

---

#### T-02：M-05 BOM 有效期校驗
**現狀：** `checkBomValidityOverlap()` 已於 2026-08-22 移除；V2.0 Plan B 已廢除 valid_from/valid_to 欄位，本項**已隨架構演進作廢**。

---

### 🟡 P1 — 中優先度（功能完整性）

#### T-03：po_in_transit `eta_variance_days` 自動計算
**現狀：** fieldMeta 已定義 `eta_variance_days` 為 `computed`，`computeEtaVarianceDays()` 已於 2026-08-22 移除（save 時未觸發計算）。

**實作位置：** `src/components/DataTablesView.tsx` → `commitSave()` 或 `handleSave()`

**實作邏輯：**
```typescript
// if (activeTable === 'po_in_transit') {
//   const updatedRow = {
//     ...row,
//     eta_variance_days: computeEtaVarianceDays(row.eta_date, row.actual_arrival_date),
//   };
// }
```

---

#### T-04：demand_forecast_log 舊資料遷移測試（FT-06）
**現狀：** App.tsx 已有 `created_by` → `created_by_id` 遷移邏輯。
**待確認：** 執行現有儲存的 localStorage 資料後，檢查 `demand_forecast_log` 是否正確遷移。

---

#### T-05：sorting_actual_yield_log UI（Phase 3 準備）
**現狀：** 表結構、fieldMeta 都已建立，LocalStorage key `PMS_SORTING_YIELD_LOG_V1` 已註冊。
**待做：** 在 DataTablesView 中 `sorting_actual_yield_log` 分頁即可使用（無需額外工作）。

---

### 🟢 P2 — 低優先度（優化）

#### T-06：Navbar 連線日期動態化（CAPA-001）
**現狀：** `Navbar.tsx` 中日期為硬編碼字串。
**修改：** `new Date().toLocaleDateString('zh-TW')` 或 ISO 格式。

---

#### T-07：H-05 風險緩解 — inventory_wip_snapshot 歸檔策略
**現狀：** 報告指出 10 年日快照（3.6 億筆）會超過 localStorage 10MB 上限。
**對策：** 啟用 FSA API（Phase 2）後自動切換為伺服器存儲；目前為規劃階段。

---

#### T-08：L-03 po_in_transit.status 狀態機擴充
**現狀：** fieldMeta 已新增 `delayed` / `partial_arrived` 選項（盤點時確認）。
**待確認：** 檢查是否需要加入 UI 篩選或顏色標記。

---

## 三、下次啟動時的建議執行順序

```
1. 閱讀本檔案 + docs/FieldArchitectureAudit_Report.md
2. 執行 T-01（H-01/H-02/H-03 接入 handleSave）← 最高優先
3. 執行 T-02（M-05 BOM 重疊校驗接入）
4. 執行 T-03（eta_variance_days 自動計算）
5. 執行 T-04（驗證 M-02 遷移是否正確）
6. 執行 lint + build 驗證
7. Commit
```

---

## 四、技術約束备忘錄

| 約束 | 說明 |
|------|------|
| SSOT | 單一資料來源，LocalStorage / 內網共用檔案（V2-Intranet）為真實源頭 |
| H-01 | `product_mold_bom.rm_sku` 僅接受 RAW 類（目前僅 UI 下拉隱性約束，掃描器類別檢查待補，見 T-01） |
| Anti-Placebo | 物料屬性缺值時引擎拒絕計算並警示，禁止全域預設頂替 |
| 分類路徑 | SET 可包含直接 PART 領出組裝，或經 COMP 入庫後再領出組裝 |
| Storage 上限 | localStorage 10MB，inventory_wip_snapshot 需定期歸檔 |
| 多標籤同步 | storage event + debounce 30ms |

---

## 五、當前 Commit 記錄（最近 10 筆）

| Commit | 說明 |
|--------|------|
| `56f0139` | feat(mrp): 預估多版本管理補齊 — 版本選擇器＋版本衝擊分析＋最新版判定修正＋交叉比對多版本防護；規格書改獨立全版面頁（?page=spec） |
| `e2a2503` | feat(spec): 數據邏輯規格書 v3.1 — 備料/交期互動流程圖（ISO 5807 符號）＋入門導覽＋章節摺疊，新增系統分頁 SSOT 即時連動 |
| `cfdada8` | docs(audit): 文件二次稽核補齊 — 7大主檔矛盾修正、戰情舊稱對齊、MECE 狀態實況化 |
| `4e0f1b1` | chore(cleanup): 全專案程式碼與檔案優化 — 死檔清除、文件 SSOT 對齊、MECE 收斂 |
| `eb5d79e` | fix(ux): 資料管線站點懸停卡片延遲隱藏（250ms 緩衝）消除快速移動閃爍 |
| `48cafbc` | fix(ux): 匯出按鈕圖標統一朝上（Download→Upload），與匯入向下構成雙向語意一致 |
| `c5b6337` | fix(deploy): GitHub Pages 靜態託管誤判內網模式 — Content-Type 判別降級本機模式並新增 favicon |
| `c2116cd` | docs(version): 版號標籤對齊版號 SSOT 實際值（Anti-Placebo = V-20260825-12） |
| `3c64b9e` | docs(sync): 現狀文件對齊 Anti-Placebo 與 V2-Intranet 變更，倉庫殘留清理與 MECE 單鎖檔統一 (V-20260825-37) |
| `597c990` | refactor(integrity): Anti-Placebo 數據鏈誠實化 — 拔除全域預設備胎、缺值拒算警示、多模具策略假選項修復 (V-20260825-36) |

---

## 六、2026-08-26 進度摘要（V-20260826-37 ～ 40）

| 主題 | 內容 |
|------|------|
| 數據邏輯規格書 v3.1 | 備料補貨／交期估算兩大主軸互動流程圖（ISO 5807 標準符號、六種邊線路由零穿越）＋五欄式參數定義表＋統一核心鏈路整合分析；入門導覽（餐廳比喻＋術語浮窗＋FAQ）；19 章預設摺疊 |
| 獨立全版面頁 | 「數據邏輯規格書」改 `?page=spec` 獨立頁開啟（無導航干擾、100dvh 響應式），SSOT postMessage 即時同步全域參數與七大資料表筆數 |
| 預估多版本管理 | MRP 版本下拉選擇器＋版本衝擊分析（現版 vs 前一版）；最新版判定改 `created_at`→`version_no` 降序；需求交叉比對同期別僅採計最新版（修復重複累加失真） |
| 待人工驗證 | 真人 UX 測試（3 名非業務測試者，檢核清單見 DEV_LOG V-20260826-38）、跨瀏覽器／手機實機視覺確認 |

---

*本檔案由 AI 自動維護，下次啟動開發時優先閱讀。*
*最後更新：2026-08-26*
