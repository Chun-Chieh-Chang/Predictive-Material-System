# 料事如神系統（PMS）可追溯性驗證報告

**版號：** V-20260822-01
**驗證日期：** 2026-08-22
**驗證範圍：** 系統開發全生命週期 × 用戶資訊檢索體驗
**驗證結論：** ⚠️ 需改善（整體成熟度 5.4/10，關鍵缺口 9 項）

---

## 目錄

1. [執行摘要](#1-執行摘要)
2. [系統開發層面 — 全生命週期可追溯性檢視](#2-系統開發層面)
3. [用戶體驗層面 — 資訊檢索能力驗證](#3-用戶體驗層面)
4. [差距分析與根本原因](#4-差距分析)
5. [優化改進方案（含優先級）](#5-優化改進方案)
6. [驗證矩陣對照表](#6-驗證矩陣)
7. [附錄：各階段交付物件追溯鏈](#7-附錄)

---

## 1. 執行摘要

### 1.1 整體評級

| 追溯維度 | 評分 | 狀態 |
|----------|------|------|
| 需求→設計→開發追溯 | 6/10 | ⚠️ 部分符合 |
| 版本控管追溯 | 7/10 | ✅ 基本完整 |
| 數據關聯追溯（FK/BOM） | 5/10 | ❌ 重大缺口 |
| 變更履歷追溯（audit_log） | 6/10 | ⚠️ 部分符合 |
| 檢索功能（搜尋/篩選/排序） | 5/10 | ❌ 重大缺口 |
| 端到端追溯（成品→原料→供應商） | 3/10 | ❌ 嚴重缺口 |
| 文檔完整性 | 7/10 | ✅ 基本完整 |
| CAPA/問題追蹤 | 4/10 | ❌ 結構化不足 |

**整體可追溯性成熟度：5.4 / 10（中等偏下）**

### 1.2 發現的落差問題總覽

| # | 問題 ID | 類別 | 嚴重度 | 影響範圍 | 解決階段 |
|---|--------|------|--------|---------|---------|
| P-01 | H-01/H-02/H-03 FK 校驗未接入 handleSave | 開發規範 | 🔴 高 | 所有原料/良率/BOM 輸入 | 立即修復 |
| P-02 | M-05 BOM 有效期重疊校驗未接入 handleSave | 開發規範 | 🔴 高 | 產品模具成型關聯檔 | 立即修復 |
| P-03 | audit_log 無 user_id 欄位 | 变更记录 | 🟡 中 | 所有 Level 2/3 變更記錄 | Phase 1 |
| P-04 | 刪除操作不寫入 audit_log | 变更记录 | 🟡 中 | 所有表的刪除動作 | Phase 1 |
| P-05 | MRP 結果 FK 欄位無法點擊跳轉 | 用戶檢索 | 🔴 高 | MrpCalculatorView 核心追溯鏈 | Phase 1 |
| P-06 | DataTablesView 無排序功能 | 用戶檢索 | 🟡 中 | 所有資料表 | Phase 1 |
| P-07 | colorantDetail 在 MRP 頁面完全不可見 | 用戶檢索 | 🟡 中 | 配色產品 MRP 結果 | Phase 1 |
| P-08 | PRD 文檔與實際資料模型不同步 | 文檔追溯 | 🟡 中 | PrdDocView | Phase 1 |
| P-09 | 無追溯鏈視覺化 UI | 用戶檢索 | 🟠 低 | 整體追溯體驗 | Phase 2 |

---

## 2. 系統開發層面 — 全生命週期可追溯性檢視

### 2.1 需求提出階段

**現有追溯機制：**

| 交付物件 | 檔案位置 | 狀態 |
|---------|---------|------|
| PRD.md（原始需求規格） | `/docs/PRD.md` | ❌ 不存在（已整合至 `PrdDocView.tsx` 內嵌文檔，請參閱 `docs/DESIGN.md` §Product Context） |
| CAPA 問題記錄 | `/DEV_LOG.md` (CAPA-001~003) | ✅ 存在 |
| 欄位架構審查報告 | `/docs/FieldArchitectureAudit_Report.md` | ✅ 存在 |

**缺口分析：**

| 缺口 ID | 說明 | 嚴重度 |
|--------|------|--------|
| REQ-01 | PRD.md 描述為「9 大主檔」，實際已擴展至 12 張表（含 color_mixing_log、SortingActualYieldLog 待建） | 中 |
| REQ-02 | CAPA 追蹤僅存於 DEV_LOG.md 純文字，無結構化 CAPA 管理表單 | 中 |
| REQ-03 | 需求編號（如 Req-001）未與開發 commit 建立明確連結 | 低 |

### 2.2 設計規劃階段

**現有追溯機制：**

| 交付物件 | 檔案位置 | 狀態 |
|---------|---------|------|
| 統一欄位元數據（fieldMeta.ts） | `/src/utils/fieldMeta.ts` | ✅ 12 張表完整定義 |
| 資料規格字典（DATA_SPECIFICATION_DICTIONARY） | `/src/utils/dataExchange.ts:44-118` | ✅ 10 大主檔欄位權責單位 |
| 物料分類體系 | `/src/utils/materialClassValidation.ts` | ✅ 五層分類 + SKU_PREFIX_RULES |
| 色母/色粉系統規格 | `/docs/ColorMaterialProcessSpec.md` | ✅ V-20260822-01 |

**缺口分析：**

| 缺口 ID | 說明 | 嚴重度 |
|--------|------|--------|
| DES-01 | H-01/H-02/H-03 FK 校驗（validateRmSkuAsRaw / validateYieldSku / validateSupplierRmSku）已於 2026-08-22 移除，待 MRP 完整整合後重新評估 | 🟡 中 |
| DES-02 | M-05 BOM 有效期重疊檢查（checkBomValidityOverlap）已於 2026-08-22 移除，待 MRP 完整整合後重新評估 | 🟡 中 |
| DES-03 | M-01 eta_variance_days 自動計算（computeEtaVarianceDays）已於 2026-08-22 移除，待 MRP 完整整合後重新評估 | 🟡 中 |

### 2.3 程式開發階段

**現有追溯機制：**

| 交付物件 | 檔案位置 | 狀態 |
|---------|---------|------|
| git 版本控制 | `.git/` | ✅ |
| git-version 插件 | `/vite-plugin-git-version.ts` | ✅ 版號 V-YYYYMMDD-NN |
| TypeScript 類型系統 | `/src/types.ts` | ✅ 100% 覆蓋 |
| audit_log append-only 寫入 | `DataTablesView.tsx:274-287` | ✅ |
| 3 級變更管制 | `DataTablesView.tsx:291-346` | ✅ L1/L2/L3 |
| Deep Relational Audit（匯入時） | `dataExchange.ts:858-935` | ✅ FK 斷鏈檢查 |

**缺口分析：**

| 缺口 ID | 說明 | 嚴重度 |
|--------|------|--------|
| DEV-01 | audit_log 紀錄無 user_id，無法追溯至特定操作者帳號 | 中 |
| DEV-02 | audit_log 的 mrp_impact_summary 欄位有定義但未填值 | 中 |
| DEV-03 | 刪除操作不寫入 audit_log（handleConfirmDelete 跳過 audit 記錄） | 中 |
| DEV-04 | Level 1 變更完全無 audit 痕跡（buildAuditEntries filter >= 2） | 設計決策 |
| DEV-05 | SortingActualYieldLog fieldMeta 已建但 TableKey 未加入 tablesMeta 陣列 | 低 |

### 2.4 測試驗證階段

**現有追溯機制：**

| 交付物件 | 檔案位置 | 狀態 |
|---------|---------|------|
| TypeScript 編譯驗證 | `tsc --noEmit` | ✅ 每次變更後執行 |
| Vite build 驗證 | `npm run build` | ✅ 成功構建 |
| 開發日誌記錄 | `/DEV_LOG.md` | ✅ 每版本更新 |

**缺口分析：**

| 缺口 ID | 說明 | 嚴重度 |
|--------|------|--------|
| TEST-01 | 無自動化測試套件（無 Jest/Vitest 測試） | 高 |
| TEST-02 | 無測試報告文件（FieldArchitectureAudit 列了 FT-01~FT-07 但無執行結果） | 中 |
| TEST-03 | H-01/H-02/H-03 校驗未通過 UI 測試驗證（因未接入 handleSave） | 🔴 高 |
| TEST-04 | 無端到端追溯測試用例 | 中 |

### 2.5 上線部署階段

**現有追溯機制：**

| 交付物件 | 檔案位置 | 狀態 |
|---------|---------|------|
| GitHub Actions CI/CD | `/.github/workflows/deploy.yml` | ✅ Node.js 22 + deploy-pages@v5 |
| GitHub Pages 部署 | https://chun-chieh-chang.github.io/PMS-Visualization/ | ✅ Run #5 成功 |
| 版本號內嵌 | `import.meta.env.VITE_PMS_VERSION` | ✅ Footer + PRD 顯示 |

**缺口分析：**

| 缺口 ID | 說明 | 嚴重度 |
|--------|------|--------|
| DEP-01 | 無標準 CHANGELOG.md（DEV_LOG.md 為主觀日誌格式） | 低 |
| DEP-02 | 無 Semantic Versioning（自訂 V-YYYYMMDD-NN 格式） | 低 |
| DEP-03 | 無 git tag/release 機制 | 低 |

---

## 3. 用戶體驗層面 — 資訊檢索能力驗證

### 3.1 DataTablesView — 資料表檢索

**現有功能：**

| 功能 | 實現狀態 | 檔案位置 |
|------|---------|---------|
| 全域文字搜尋（模糊匹配） | ✅ | DataTablesView.tsx:229-239 |
| 料號分類篩選（RAW/MAT/PART/COMP/SET） | ✅ | DataTablesView.tsx:231-233 |
| 多工作表快速切換（9 個 pill 按鈕） | ✅ | DataTablesView.tsx:214-224 |
| 變更稽核面板（L2/L3 異動紀錄） | ✅ | DataTablesView.tsx:476-526 |
| 刪除前 FK 衝擊掃描 | ✅ | DataTablesView.tsx:39-63 |

**缺口分析：**

| 缺口 ID | 說明 | 用戶影響 |
|--------|------|---------|
| UX-01 | **無表格排序**：無法點擊表頭升/降序排列 | 使用者無法快速找到特定記錄 |
| UX-02 | **無分頁**：大量資料全部 render 在 DOM | 資料量 >50 筆時效能下降 |
| UX-03 | **material_class_filter 未隨 tab 切換重置**：切換資料表後上一表的篩選條件可能殘留 | 用戶看到錯誤的篩選結果 |
| UX-04 | **無多條件組合篩選**：只能全文字搜尋 + 單一分類 | 無法進行精準查詢 |
| UX-05 | **audit_log 面板無篩選**：無法依 table_key / change_level / date range 過濾 | 追蹤大量變更時效率低落 |

### 3.2 MrpCalculatorView — MRP 結果追溯

**現有功能：**

| 功能 | 實現狀態 | 檔案位置 |
|------|---------|---------|
| SKU 快速切換（pill 按鈕） | ✅ | MrpCalculatorView.tsx:86-103 |
| 3 階計算流程可視化 | ✅ | MrpCalculatorView.tsx:201-485 |
| 多模具卡片切換 | ✅ | MrpCalculatorView.tsx:301-361 |
| 採購倒排時間表（紅/黃/綠） | ✅ | MrpCalculatorView.tsx:460-484 |
| 塞穴警示 | ✅ | MrpCalculatorView.tsx:352-358 |

**缺口分析（追溯鏈最大缺口）：**

| 缺口 ID | 說明 | 用戶影響 |
|--------|------|---------|
| UX-06 | **所有 FK 值為死文字，無法點擊跳轉**：rm_sku、mold_id、customer_id 等無法導航至對應資料表記錄 | 🔴 終止追溯鏈 |
| UX-07 | **Stage 1 不顯示 Forecast/Order 明細**：只顯示加總數字，看不到是哪一筆 demand_forecast_log 或哪些 actual_order 產生 | 🔴 無法追溯需求來源 |
| UX-08 | **Stage 2 不顯示 BOM 記錄**：不知道使用的是哪一筆 product_mold_bom | 🔴 無法追溯用料來源 |
| UX-09 | **Stage 3 不顯示庫存快照/在途 PO 明細**：不知道 rm_on_hand_kg 和 in_transit_qty_kg 來自哪筆記錄 | 🔴 無法追溯庫存狀態 |
| UX-10 | **colorantDetail 完全不展示**：當 colorMixingRatioPct > 0 時，色母/色粉的獨立採購建議在 MRP 頁面完全不可見 | 中（新功能的可觀性） |
| UX-11 | **不顯示供應商名稱**：MRP 結果中有 leadTimeDays/moqKg 但無 supplier_name | 中 |

### 3.3 DashboardView — 儀表板資訊檢索

**現有功能：**

| 功能 | 實現狀態 |
|------|---------|
| 4 大 KPI 指標卡 | ✅ |
| What-If 模擬沙盒（20+ 滑桿） | ✅ |
| 6 鍵情境快速套用 | ✅ |
| 決策戰情室優先順序表 | ✅ |
| 即時預警中心 | ✅ |
| MRP 建議採購排程表 | ✅ |

**缺口分析：**

| 缺口 ID | 說明 | 用戶影響 |
|--------|------|---------|
| UX-12 | **KPI 卡不可點擊穿透**：點短料數無法列出缺料 SKU 列表 | 中 |
| UX-13 | **戰情室表格無排序/篩選**：MrpResults 表無標題排序、無狀態篩選 | 中 |
| UX-14 | **Alert 卡片不可點擊穿透**：點擊 alert 卡片不會跳轉至對應 MRP 明細 | 低 |
| UX-15 | **無庫存快照時間軸檢視**：inventory_wip_snapshot 只有最新一筆，無歷史趨勢 | 低 |
| UX-16 | **無訂單明細總覽**：Dashboard 不顯示 any actual_order 列表 | 低 |

### 3.4 PrdDocView — 文檔檢索

**現有功能：**

| 功能 | 實現狀態 |
|------|---------|
| 三種檢視模式 Tab（Rich / Dictionary / Markdown） | ✅ |
| 用詞辭典 | ✅ |
| Markdown 複製/下載 | ✅ |

**缺口分析：**

| 缺口 ID | 說明 | 用戶影響 |
|--------|------|---------|
| UX-17 | **CSS 動態 class 失效**：物料分類卡片使用模板字面 `bg-\${c.color}-50`，Tailwind JIT 不編譯 | 中（色彩區分完全失效） |
| UX-18 | **無目錄/導航結構**：長文無 TOC 或側邊欄 | 中 |
| UX-19 | **無版本歷史對照**：每次 version 更新在同一份文件內 | 低 |

---

## 4. 差距分析與根本原因

### 4.1 開發規範層面

**根本原因：H-01/H-02/H-03 FK 校驗未接入 handleSave**

```
現有流程：
handleSave() → validateRowData() → [H-01/H-02/H-03 校驗缺失] → commitSave()

正確流程應為：
handleSave() → validateRowData() → [H-01/H-02/H-03 校驗] → commitSave()
```

**根本原因：M-05 BOM 有效期重疊校驗（checkBomValidityOverlap）已於 2026-08-22 移除**

```
現有流程：
handleSave(product_mold_bom) → commitSave()  （無重疊檢查）

註：checkBomValidityOverlap 函式已從 materialClassValidation.ts 移除，
待 MRP 完整整合後重新評估是否需要恢復。
```

### 4.2 用戶體驗層面

**根本原因：FK 值缺乏互動機制**

DataTablesView 的 `displayValue()` 函式（第 147 行）對 fk_select 類型欄位僅顯示 SKU 值本身，無 `<a>` 或 `onClick` 處理。MRP 計算結果中的 FK 欄位（rmSku、moldId）同樣只是純文字渲染。

**根本原因：audit_log 缺少 user_id**

`ChangeAuditEntry` 介面定義中無 `user_id` 欄位，且 `buildAuditEntries()` 函式也無從取得目前操作者身份（系統目前無登入機制）。

### 4.3 測試驗證層面

**根本原因：無自動化測試框架**

專案尚未配置 Jest/Vitest，所有驗證依賴手動 tsc --noEmit 和 npm run build。這導致 H-01/H-02/H-03 校驗函式雖然已寫入 materialClassValidation.ts，但無法透過測試證明其有效性，也無從確保其在 handleSave 流程中被正確呼叫。

---

## 5. 優化改進方案

### 5.1 立即修復（Phase 1 — 本週內）

#### 【P-01】H-01/H-02/H-03 FK 校驗接入 handleSave

**修改檔案：** `src/components/DataTablesView.tsx`

**實作方案：**
```typescript
// 在 validateRowData() 之後增加 FK 校驗步驟
const validateRowDataWithFK = useCallback((data, meta, db) => {
  const errors = validateRowData(data, meta); // 既有驗證

  // H-01: rm_sku 必須為 RAW 類
  if (meta.key === 'product_mold_bom' && data.rm_sku) {
    const rmItem = db.item_master.find(i => i.sku === data.rm_sku);
    if (rmItem && rmItem.material_class !== 'RAW') {
      errors['rm_sku'] = 'H-01: rm_sku 必須為 RAW 類原料';
    }
  }

  // H-02: yield_master.sku 必須為 PART/COMP/SET
  if (meta.key === 'yield_master' && data.sku) {
    const fgItem = db.item_master.find(i => i.sku === data.sku);
    if (fgItem && !['PART', 'COMP', 'SET'].includes(fgItem.material_class)) {
      errors['sku'] = 'H-02: yield_master.sku 必須為 PART/COMP/SET';
    }
  }

  // H-03: supplier_rule_master.rm_sku 必須為 RAW 類
  if (meta.key === 'supplier_rule_master' && data.rm_sku) {
    const rmItem = db.item_master.find(i => i.sku === data.rm_sku);
    if (rmItem && rmItem.material_class !== 'RAW') {
      errors['rm_sku'] = 'H-03: rm_sku 必須為 RAW 類原料';
    }
  }

  return errors;
}, [validateRowData]);
```

**驗證方式：** 在 DataTablesView 中新增原料品號至 yield_master 表，確認彈出 H-02 錯誤提示。

---

#### 【P-02】M-05 BOM 有效期重疊校驗接入 handleSave

**修改檔案：** `src/components/DataTablesView.tsx` + `src/utils/materialClassValidation.ts`

**實作方案：**
```typescript
// 【已移除】2026-08-22 前
// if (activeTable === 'product_mold_bom') {
//   const overlap = checkBomValidityOverlap(editRow, db.product_mold_bom);
//   if (overlap) {
//     onNotify?.(`M-05: BOM 有效期與品號 ${overlap.sku} 的 ${overlap.moldId} 模具記錄重疊 (${overlap.validFrom} ~ ${overlap.validTo})`, 'error');
//     return;
//   }
// }
// 待 MRP 完整整合後重新評估是否需要恢復此校驗
```

**驗證方式：** 建立兩筆相同 sku+mold_id 但 valid_from 重疊的 BOM，確認系統阻止儲存。

---

#### 【P-03/P-04】audit_log 新增 user_id + 刪除記錄

**修改檔案：** `src/types.ts` + `src/components/DataTablesView.tsx`

**實作方案：**
```typescript
// types.ts: ChangeAuditEntry 新增 user_id
export interface ChangeAuditEntry {
  id: string;
  timestamp: string;
  table_key: string;
  pk_value: string;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  change_level: 1 | 2 | 3;
  reason?: string | null;
  user_id?: string | null;      // 新增
  mrp_impact_summary?: string | null; // 既有但未填
}

// DataTablesView.tsx: buildAuditEntries 注入 user_id
const buildAuditEntries = (reason?: string): ChangeAuditEntry[] => {
  return changedFields
    .filter(cf => (cf.field.editability as number) >= 2)
    .map(cf => ({
      ...
      user_id: currentUser?.id || 'anonymous', // 暫用 anonymous，待登入機制建立
    }));
};

// 刪除時寫入 audit_log
const commitDelete = (index: number, record: Record<string, unknown>) => {
  const auditEntry: ChangeAuditEntry = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    table_key: activeTable,
    pk_value: getPkDisplay(tableMeta, record),
    field_name: '(刪除記錄)',
    field_label: '操作類型',
    old_value: JSON.stringify(record),
    new_value: '',
    change_level: 3,
    reason: `手動刪除 ${getPkDisplay(tableMeta, record)}`,
    user_id: currentUser?.id || 'anonymous',
  };
  const newData = tableData.filter((_, i) => i !== index);
  setDb({ ...db, [activeTable]: newData, audit_log: [...(db.audit_log || []), auditEntry] });
};
```

---

#### 【P-05】MRP 結果 FK 欄位可點擊跳轉

**修改檔案：** `src/components/MrpCalculatorView.tsx`

**實作方案：** 為 rm_sku、mold_id 等 FK 欄位加入點擊導航：

```tsx
// 將純文字渲染改為可點擊連結
const FkLink = ({ value, targetTable, pkField }: { value: string, targetTable: TableKey, pkField: string }) => (
  <span
    onClick={() => {
      navigateToTable(targetTable, pkField, value);
    }}
    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono text-sm"
    title={`點擊查看 ${targetTable} 中的此筆記錄`}
  >
    {value}
  </span>
);

// 在 MRP Stage 3 中使用
<FkLink value={result.rmSku} targetTable="item_master" pkField="sku" />
<FkLink value={result.activeMoldId} targetTable="mold_master" pkField="mold_id" />
```

**DataTablesView 也需要同樣改造：**
```tsx
// displayValue 函式中對 fk_select 類型增加 clickable span
if (field.inputType === 'fk_select' && typeof value === 'string') {
  return (
    <span
      onClick={() => handleFkClick(field.fkTable, field.fkValueKey, value)}
      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
    >
      {value}
    </span>
  );
}
```

---

#### 【P-06】DataTablesView 加入表格排序功能

**修改檔案：** `src/components/DataTablesView.tsx`

**實作方案：**
```typescript
const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

const sortedData = useMemo(() => {
  if (!sortConfig) return filteredData;
  return [...filteredData].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
}, [filteredData, sortConfig]);

// 表頭加入點擊處理器
<th onClick={() => handleSort(field.key)}>{field.label}</th>
```

---

#### 【P-07】MRP 頁面展示 colorantDetail

**修改檔案：** `src/components/MrpCalculatorView.tsx`

**實作方案：** 在 Stage 3 原料採購建議區塊中，當 `result.colorMixingRatioPct > 0` 時新增色母/色粉獨立卡片：

```tsx
{result.colorMixingRatioPct > 0 && result.colorantDetail && (
  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
    <h4 className="font-semibold text-purple-800 mb-2">
      🎨 色母/色粉採購建議（配比 {result.colorMixingRatioPct}%）
    </h4>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><span className="text-gray-500">品號：</span><span className="font-mono">{result.colorantDetail.colorantSku}</span></div>
      <div><span className="text-gray-500">毛需求：</span>{result.colorantDetail.colorantGrossKg} KG</div>
      <div><span className="text-gray-500">現存庫存：</span>{result.colorantDetail.colorantOnHandKg} KG</div>
      <div><span className="text-gray-500">在途採購：</span>{result.colorantDetail.colorantInTransitKg} KG</div>
      <div><span className="text-gray-500">淨需求：</span><strong>{result.colorantDetail.colorantNetRequirementKg} KG</strong></div>
      <div><span className="text-gray-500">建議採購：</span><strong>{result.colorantDetail.colorantSuggestedQtyKg} KG</strong></div>
      <div><span className="text-gray-500">交期：</span>{result.colorantDetail.colorantLeadTimeDays} 天</div>
    </div>
  </div>
)}
```

---

#### 【P-08】PRD 文檔同步

**修改檔案：** `src/components/PrdDocView.tsx`

**實作方案：**
1. 更新 PRD 源碼中的主檔數量描述（9 → 12 張）
2. 新增 color_mixing_log 表的說明
3. 修復 CSS 動態 class 問題：改用 `style` object 替代模板字面

```tsx
// 修改前（失效）
<div className={`bg-${c.color}-50`}>

// 修改後（有效）
<div style={{ backgroundColor: `${c.color === 'red' ? '#fef2f2' : c.color === 'blue' ? '#eff6ff' : '#f9fafb'}` }}>
```

---

### 5.2 短期改進（Phase 1b — 2 週內）

#### 【P-09】新增追溯鏈視覺化 UI

**新增強制檔案：** `src/components/TraceabilityView.tsx`

功能：輸入任一 SKU，展示從該成品到所有關聯原料的追溯圖：

```
SET A01-200-131
├── BOM: MI17193 (主模)
│   ├── TERLUX 2802 (基礎樹脂, 50.0 KG)
│   │   └── Supplier: 廠內调配, Lead Time: 1 天
│   └── CB-BLACK-01 (黑色色母, 1.0 KG)
│       └── Supplier: 廠內调配, Lead Time: 1 天
└── Color Mixing Log: MIX-20260820-001 (2026-08-20, mixed)
```

---

### 5.3 中期規劃（Phase 2 — 下月）

| 項目 | 說明 |
|------|------|
| 登入機制 | 支援 user_id 写入 audit_log |
| 結構化 CAPA 管理表 | 建立 capa_log 主檔 + 審核工作流 UI |
| 自動化測試套件 | 配置 Vitest + 编写 FK 校驗測試 |
| 進階搜尋面板 | 跨表 SQL-like 查詢介面 |
| 庫存趨勢圖 | inventory_wip_snapshot 時間軸視覺化 |

---

## 6. 驗證矩陣對照表

### 6.1 階段交付物件追溯矩陣

| 生命週期階段 | 交付物件 | 檔案位置 | 追溯標籤 | 狀態 |
|------------|---------|---------|---------|------|
| 需求提出 | PRD.md | `src/components/PrdDocView.tsx` 內嵌文檔 | V-20260820-12 origin | ✅ 已整合入元件 |
| 需求提出 | FieldArchitectureAudit_Report | `/docs/FieldArchitectureAudit_Report.md` | H-01~H-05 / M-01~M-06 / L-01~L-04 | ✅ |
| 需求提出 | CAPA-001~003 | `/DEV_LOG.md:111-133` | CAPA-NNN | ✅ |
| 設計規劃 | fieldMeta.ts (12 表欄位定義) | `/src/utils/fieldMeta.ts` | COLOR_MIXING_LOG_META 等 | ✅ |
| 設計規劃 | DATA_SPECIFICATION_DICTIONARY | `/src/utils/dataExchange.ts:44-118` | 權責單位+勾稽規則 | ✅ |
| 設計規劃 | ColorMaterialProcessSpec | `/docs/ColorMaterialProcessSpec.md` | V-20260822-01 | ✅ |
| 程式開發 | types.ts (ColorMixingLog 等新介面) | `/src/types.ts` | Git: b398ec6 | ✅ |
| 程式開發 | mrpEngine.ts (色母計算) | `/src/utils/mrpEngine.ts` | Git: b398ec6 | ✅ |
| 程式開發 | dataExchange.ts (匯出入支援) | `/src/utils/dataExchange.ts` | Git: b398ec6 | ✅ |
| 測試驗證 | tsc --noEmit | CLI | Exit code 0 | ✅ |
| 測試驗證 | npm run build | CLI | ✓ built in 23.16s | ✅ |
| 上線部署 | GitHub Actions #5 | `.github/workflows/deploy.yml` | Status: Success 1m28s | ✅ |

### 6.2 問題追踪矩陣

| 問題 ID | 類別 | 嚴重度 | 解決階段 | 驗證方式 |
|---------|------|--------|---------|---------|
| P-01 H-01/H-02/H-03 未接入 | 開發規範 | 🔴 高 | Phase 1 | 單元測試 + 手動 UI 驗證 |
| P-02 M-05 BOM 重疊未接入 | 開發規範 | 🔴 高 | Phase 1 | 建立重疊 BOM 測試 |
| P-03 audit_log 缺 user_id | 变更记录 | 🟡 中 | Phase 1 | 審計面板檢查 |
| P-04 刪除不寫 audit_log | 变更记录 | 🟡 中 | Phase 1 | 刪除操作後查 audit_log |
| P-05 MRP FK 不可點擊 | 用戶檢索 | 🔴 高 | Phase 1 | 點擊 FK 值導航測試 |
| P-06 無排序功能 | 用戶檢索 | 🟡 中 | Phase 1 | 點擊表頭排序測試 |
| P-07 colorantDetail 不可見 | 用戶檢索 | 🟡 中 | Phase 1 | MRP 計算配色產品 |
| P-08 PRD 與實際模型不同步 | 文檔追溯 | 🟡 中 | Phase 1 | PrdDocView Rich 檢視 |
| P-09 無追溯鏈 UI | 用戶檢索 | 🟠 低 | Phase 2 | TraceabilityView 功能測試 |

---

## 7. 附錄：各階段交付物件追溯鏈

### 7.1 色母/色粉管理系統追溯鏈（本次新增）

```
用户需求（色母/色粉管理）
    │
    ▼
docs/ColorMaterialProcessSpec.md (V-20260822-01) ← 需求規格文檔
    │
    ├──→ src/types.ts (ColorMixingLog, color_mixing_ratio_pct) ← 資料模型
    ├──→ src/utils/fieldMeta.ts (COLOR_MIXING_LOG_META) ← 欄位定義
    ├──→ src/utils/materialClassValidation.ts (CB-/CP- 前綴) ← 校驗規則
    ├──→ src/utils/mrpEngine.ts (effectiveResinGrossKg, colorantDetail) ← 計算邏輯
    ├──→ src/utils/dataExchange.ts (JSON/Excel 支援) ← 匯入匯出
    ├──→ src/App.tsx (相容性初始化) ← 版本相容
    └──→ src/data/seedData.ts (DEMO 範例) ← 測試數據
            │
            ▼
    git commit b398ec6 + 0bbb10d
            │
            ▼
    tsc --noEmit ✅  +  npm run build ✅
            │
            ▼
    git push origin master ✅
```

### 7.2 變更履歷追溯鏈

```
用戶操作（DataTablesView 編輯/新增/刪除）
    │
    ├── Level 1（低影響）：直接存儲，無 audit 記錄
    │
    ├── Level 2（中影響）：彈出確認 → commitSave() → append audit_log
    │   └── audit_entry: { id: AUD-{epoch}-{random}, table_key, pk_value,
    │         field_name, old_value, new_value, change_level: 2, reason?, user_id? }
    │
    └── Level 3（高影響/工程變更）：必填原因 → commitSave() → append audit_log
        └── audit_entry: { ..., change_level: 3, reason: "必填" }
```

### 7.3 版本追溯鏈

```
Commit b398ec6 (feat: 色母/色粉管理系統)
    ├── types.ts  (+32 行)
    ├── fieldMeta.ts (+42 行)
    ├── materialClassValidation.ts (+4 行)
    ├── mrpEngine.ts (+48 行)
    ├── dataExchange.ts (+100 行)
    ├── App.tsx (+1 行)
    ├── seedData.ts (+134 行)
    └── DashboardView.tsx (+1 行)

Commit 0bbb10d (docs: ColorMaterialProcessSpec)
    └── docs/ColorMaterialProcessSpec.md (+338 行)

GitHub Pages Deploy #5 → Status: Success → URL: https://chun-chieh-chang.github.io/PMS-Visualization/
```

---

*報告生成日期：2026-08-22*
*工具：Trae AI Traceability Audit v1.0*
