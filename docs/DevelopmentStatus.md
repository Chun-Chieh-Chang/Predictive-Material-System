# 料事如神（PMS）開發進度與後續計畫

> 版號：`V-20260821-23`　|　建立日期：2026-08-21　|　下次啟動時自動閱讀

---

## 一、已完成功能清單（Commit 基準）

### 版本 `8fa4560`（最新）

#### 核心引擎
| 項目 | 狀態 | 說明 |
|------|------|------|
| MRP 三階計算引擎 | ✅ | `mrpEngine.ts`：FG Net Req → BOM 爆炸 → 採購決策 |
| SystemParameters 配置 | ✅ | 13 個參數，即時預覽 MRP 影響 |

#### 資料模型（10 張主檔）
| 表名 | 擴充欄位 | 狀態 |
|------|----------|------|
| `item_master` | `material_class` + `material_class_label` | ✅ |
| `mold_master` | `machine_type` + `production_line`（M-03）| ✅ |
| `product_mold_bom` | `valid_from` + `valid_to`（M-05）| ✅ |
| `yield_master` | — | ✅ |
| `supplier_rule_master` | `unit_price_twd`（M-04）| ✅ |
| `demand_forecast_log` | `created_by_id` + `created_by_name`（M-02）| ✅ |
| `inventory_wip_snapshot` | — | ✅ |
| `po_in_transit` | `actual_arrival_date` + `eta_variance_days`（M-01）| ✅ |
| `sorting_actual_yield_log` | **全新表**（M-06）| ✅ 結構就緒，UI 待 Phase 3 |
| `material_classes` | **全新表**（五層分類體系）| ✅ |
| `audit_log` | — | ✅ |

#### 分類體系
| 項目 | 狀態 |
|------|------|
| 五層分類類型 `MaterialClassCode` | ✅ |
| `DEFAULT_MATERIAL_CLASSES` 5 筆頂層 | ✅ |
| `MaterialClassManagementView` UI | ✅ |
| SKU 前綴推斷規則 `inferClassFromSku()` | ✅ |
| 匯入驗證 `validateImportRows()` | ✅ |
| 遷移函式 `migrateItemMasterClasses()` | ✅ |

#### 架構盤點修正（FieldArchitectureAudit_Report.md）
| ID | 內容 | 狀態 |
|----|------|------|
| H-04 | 移除 `ItemMasterV0`，統一使用 `ItemMaster` | ✅ |
| H-01~H-03 | 驗證函式定義 `validateSkuClass` / `validateRmSkuAsRaw` / `validateYieldSku` / `validateSupplierRmSku` | ✅ **函式已定義，尚未接入 handleSave** |
| M-01 | `po_in_transit` 新增到貨日期欄位 | ✅ |
| M-02 | `demand_forecast_log` 遷移邏輯（App.tsx）| ✅ |
| M-03~M-05 | fieldMeta 欄位擴充 | ✅ |
| M-06 | `sorting_actual_yield_log` 表結構 | ✅ |

#### UI / 文件一致性
| 項目 | 狀態 |
|------|------|
| Navbar 「10 大主檔維護」| ✅ |
| DataTablesView 標題 + 分類篩選下拉 | ✅ |
| DataExchangeView 標題 | ✅ |
| PrdDocView §6 五層分類 + §7 Roadmap | ✅ |
| README.md 全域一致性 | ✅ |
| SET 描述修正（直接 PART 組裝路徑合法）| ✅ |

---

## 二、待辦事項（按優先順序）

### 🔴 P0 — 高優先度（影響正確性）

#### T-01：H-01/H-02/H-03 校驗接入 DataTablesView handleSave
**現狀：** `validateRmSkuAsRaw()` / `validateYieldSku()` / `validateSupplierRmSku()` 已定義於 `materialClassValidation.ts`，但 `DataTablesView.tsx` 的 `handleSave` 流程中未呼叫。

**實作位置：** `src/components/DataTablesView.tsx` → `validateRowData()` 或 `handleSave()`

**實作邏輯：**
```typescript
// 在 validateRowData() 中，當欄位為 fk_select 且對應產品類型的 SKu 需驗證分類時：
if (field.key === 'rm_sku' && meta.key === 'product_mold_bom') {
  const result = validateRmSkuAsRaw(String(val), db.item_master);
  if (!result.valid) errors[field.key] = result.hint;
}
if (field.key === 'sku' && meta.key === 'yield_master') {
  const result = validateYieldSku(String(val), db.item_master);
  if (!result.valid) errors[field.key] = result.hint;
}
if (field.key === 'rm_sku' && meta.key === 'supplier_rule_master') {
  const result = validateSupplierRmSku(String(val), db.item_master);
  if (!result.valid) errors[field.key] = result.hint;
}
```

**驗證方式（FT-01~FT-03）：**
- 新增 product_mold_bom，rm_sku 選取 PART 類料號 → Toast 錯誤阻擋
- 新增 yield_master，sku 選取 RAW 類料號 → Toast 錯誤阻擋
- 新增 supplier_rule_master，rm_sku 選取 MAT 類料號 → Toast 錯誤阻擋

---

#### T-02：M-05 BOM 有效期校驗接入 handleSave
**現狀：** `checkBomValidityOverlap()` 已定義，但未接入保存流程。

**實作位置：** `src/components/DataTablesView.tsx` → `handleSave()`

**實作邏輯：**
```typescript
if (activeTable === 'product_mold_bom') {
  const overlapResult = checkBomValidityOverlap(
    db.product_mold_bom,
    editRow as ProductMoldBOM,
    originalRecord ? { sku: originalRecord.sku, mold_id: originalRecord.mold_id } : undefined
  );
  if (overlapResult.hasOverlap) {
    errors['valid_from'] = `與以下 BOM 有效期重疊：${overlapResult.overlappingIds.join(', ')}`;
    return;
  }
}
```

**驗證方式（FT-05）：** 新增 valid_to=2026-09-01 的 BOM entry，再新增 valid_from 與之重疊的 entry → 阻擋。

---

### 🟡 P1 — 中優先度（功能完整性）

#### T-03：po_in_transit `eta_variance_days` 自動計算
**現狀：** fieldMeta 已定義 `eta_variance_days` 為 `computed`，但 save 時未觸發計算。

**實作位置：** `src/components/DataTablesView.tsx` → `commitSave()` 或 `handleSave()`

**實作邏輯：**
```typescript
if (activeTable === 'po_in_transit') {
  const updatedRow = {
    ...row,
    eta_variance_days: computeEtaVarianceDays(row.eta_date, row.actual_arrival_date),
  };
}
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
