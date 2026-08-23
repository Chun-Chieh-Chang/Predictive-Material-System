# 料事如神（PMS）開發進度與後續計畫

> 版號：`V-20260823-22`　|　更新日期：2026-08-23　|　下次啟動時自動閱讀

---

## 一、已完成功能清單（Commit 基準）

### 版本 `V-20260823-22`（最新 — UI/UX 雙主題視覺全面標準化版）

#### 核心運算引擎 (4 大引擎)
| 項目 | 狀態 | 說明 |
|------|------|------|
| MRP 三階計算引擎 | ✅ | `mrpEngine.ts`：FG Net Req → BOM 爆炸 → 採購決策、分批到貨建議、虛擬預扣 |
| WIP 日動態推估公式計算器 | ✅ | `wipEngine.ts`：$WIP(t) = WIP(t-1) + P(t) - S(t)$，含夜班 12h 無人挑選時序差補償 |
| 訂單全鏈路物料緊張度診斷引擎 | ✅ | `orderTensionEngine.ts`：6 大供應鏈環節瓶頸掃描、4 級緊張度告警與應變 SOP |
| 全數據鏈路模擬與孤兒數據排查器 | ✅ | `dataIntegrityScanner.ts` & `dataPipelineSimulation.ts`：4 大業務場景穿透與 10 大主檔關聯校驗 |

#### 業務賦能與視覺化看板 (11 大模組)
| 視圖模組 | 檔案 | 狀態 | 說明 |
|---------|------|------|------|
| 出貨排程可行性審查看板 | `ShipScheduleClearanceView.tsx` | ✅ | 專為每週二出貨會議設計，良品+WIP折算、三色放行燈號、What-If 滑桿 |
| 決策戰情室 | `DashboardView.tsx` | ✅ | 歷史預測偏差分析 (Forecast vs Actual)、供需透明度備料客觀背書、MRP 全局告警 |
| 訂單物料緊張追蹤看板 | `OrderTensionTrackerView.tsx` | ✅ | 逐筆訂單 6 大環節瓶頸診斷、全文檢索、RCA 與應變 SOP |
| 3階 MRP 推導器 | `MrpCalculatorView.tsx` | ✅ | 單品/全品 MRP 推導、分批進貨建議 (防 8,000 萬爆倉) |
| 參數策略設定 | `SystemSettingsView.tsx` | ✅ | 虛擬預扣開關、分批進貨開關、損耗率天花板防呆 |
| 無損資料中心 | `DataExchangeView.tsx` | ✅ | 全數據鏈路深度模擬診斷面板、Excel/JSON 匯出入 |
| 專業術語辭典 | `GlossaryView.tsx` | ✅ | 獨立專頁 7 大分類術語檢索 |
| 物料分類體系 | `MaterialClassManagementView.tsx` | ✅ | 五層樹狀分類管理 (RAW/MAT/PART/COMP/SET) |
| 10大主檔維護 | `DataTablesView.tsx` | ✅ | 10 張主檔 CRUD 與 3 級變更管制 |
| 備份與復原設定 | `BackupSettingsView.tsx` | ✅ | 自動排程備份與 JSON 備份還原 |
| PRD 規格文件 | `PrdDocView.tsx` | ✅ | 完整系統規格文件與 Roadmap 檢視 |

#### UI/UX 雙主題視覺全面標準化 (CAPA-009)
| 項目 | 狀態 | 說明 |
|------|------|------|
| 全專案卡片容器雙主題 Token 標準化 | ✅ | 10 大核心視圖外層卡片統一 `bg-white dark:bg-slate-900`，內層瓦片統一 `bg-slate-50 dark:bg-slate-950/70` |
| 淺色主題底色溫和分離 | ✅ | `--bg-workbench: #EBF0F5`（調整自 `#F1F5F9`），與純白卡片建立溫潤柔和景深層次 |
| 側邊欄預設收合 | ✅ | `Sidebar.tsx` 4 大導航群組預設收合（`expandedGroups` 初始值 `false`），提供極簡入場視野 |
| 移除暴力 CSS 注入 | ✅ | 徹底移除全部 `lightModeOverrides` 行內覆蓋，回歸原生 Tailwind 雙主題 class |
| 嚴謹對比度校驗器升級 | ✅ | `.impeccable/scripts/contrast-check.mjs` 實裝 Token/AST 級掃描，100% 通過自動化校驗 |
| 4 大 MECE 核心情境導航 | ✅ | 頂部 Navbar 與側邊欄統一為決策戰情 / 物料推導 / 數據中心 / 系統支援 4 大門戶 |

---

## 二、待辦事項（按優先順序）

### 🔴 P0 — 高優先度（影響正確性）

#### T-01：H-01/H-02/H-03 校驗接入 DataTablesView handleSave
**現狀：** `validateRmSkuAsRaw()` / `validateYieldSku()` / `validateSupplierRmSku()` 已定義於 `materialClassValidation.ts`，但 `DataTablesView.tsx` 的 `handleSave` 流程中未呼叫。

**實作位置：** `src/components/DataTablesView.tsx` → `validateRowData()` 或 `handleSave()`
（待 MRP 完整整合後重新啟用）

**實作邏輯：**
（待 MRP 完整整合後重新啟用——原程式碼已移除）
```typescript
// if (field.key === 'rm_sku' && meta.key === 'product_mold_bom') {
//   const result = validateRmSkuAsRaw(String(val), db.item_master);
//   if (!result.valid) errors[field.key] = result.hint;
// }
// ...
```

**驗證方式（FT-01~FT-03）：**
- 新增 product_mold_bom，rm_sku 選取 PART 類料號 → Toast 錯誤阻擋
- 新增 yield_master，sku 選取 RAW 類料號 → Toast 錯誤阻擋
- 新增 supplier_rule_master，rm_sku 選取 MAT 類料號 → Toast 錯誤阻擋

---

#### T-02：M-05 BOM 有效期校驗接入 handleSave
**現狀：** `checkBomValidityOverlap()` 已於 2026-08-22 移除（未接入保存流程，待 MRP 完整整合後重新評估）。

**實作位置：** `src/components/DataTablesView.tsx` → `handleSave()`
（待 MRP 完整整合後重新啟用）

**實作邏輯：**
```typescript
// if (activeTable === 'product_mold_bom') {
//   const overlapResult = checkBomValidityOverlap(
//     db.product_mold_bom,
//     editRow as ProductMoldBOM,
//     originalRecord ? { sku: originalRecord.sku, mold_id: originalRecord.mold_id } : undefined
//   );
//   if (overlapResult.hasOverlap) {
//     errors['valid_from'] = `與以下 BOM 有效期重疊：${overlapResult.overlappingIds.join(', ')}`;
//     return;
//   }
// }
```

**驗證方式（FT-05）：** 新增 valid_to=2026-09-01 的 BOM entry，再新增 valid_from 與之重疊的 entry → 阻擋。

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
| SSOT | 單一資料來源，LocalStorage 為唯一真實源頭 |
| H-01 | `product_mold_bom.rm_sku` 僅接受 RAW 類 |
| H-02 | `yield_master.sku` 僅接受 PART / COMP / SET 類 |
| H-03 | `supplier_rule_master.rm_sku` 僅接受 RAW 類 |
| M-05 | 同一 sku+mold_id 不允許有效日期重疊 |
| 分類路徑 | SET 可包含直接 PART 領出組裝，或經 COMP 入庫後再領出組裝 |
| Storage 上限 | localStorage 10MB，inventory_wip_snapshot 需定期歸檔 |
| 多標籤同步 | storage event + debounce 30ms |

---

## 五、當前 Commit 記錄（最近 10 筆）

| Commit | 說明 |
|--------|------|
| `8fa4560` | docs: 修正 SET 分類描述，明確支援直接 PART 一次組裝路徑 |
| `73e57c8` | fix: 全域水平展開盤點 - 修正8大→10大殘留表述、清除unused import |
| `78d547f` | fix: Navbar主檔標題修正為10大主檔維護 |
| `63edce9` | feat: 欄位架構盤點實作 - H-01~H-03 FK分類校驗、M-01~M-05 欄位擴充、Sorting Yield Log 表結構 |
| `2f0b5d9` | feat: 五層物料分類體系 - MaterialClass 架構、分類管理畫面 |
| `8fe614e` | feat: 最小字體規範 ≥14px |
| `c913db0` | feat: 字體改為 Apple San Francisco 系統字體 |
| `9a97f28` | feat: PRD Rich 頁面改為淺藍漸層卡 |
| `354d6ee` | fix: PRD Rich 頁面色彩對比度修復 |
| `fa64ebc` | docs: 修訂 PRD 規格書 |

---

*本檔案由 AI 自動維護，下次啟動開發時優先閱讀。*
*最後更新：2026-08-21 V-20260821-21*
