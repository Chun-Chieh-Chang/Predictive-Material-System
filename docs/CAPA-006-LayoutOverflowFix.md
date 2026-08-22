# CAPA-006 — 介面水平滾動遮擋問題矯正與預防措施

**編號：** CAPA-006  
**類型：** 矯正措施 + 預防措施  
**嚴重度：** P2 — UI 可用性缺陷（右側按鈕被裁切）  
**日期：** 2026-08-22  
**狀態：** 修復中

---

## 1. 問題描述

### 1.1 現象
開啟「專業術語辭典」面板後，最右側分類標籤按鈕（系統功能...）被面板右邊緣裁切，無法點擊且部分文字不可見。

### 1.2 影響範圍
- **觸發條件**：面板寬度 < 分類標籤總寬度（任何斷點下均可能發生）
- **受影響組件**：`GlossaryPanel.tsx` 分類標籤列
- **用戶體驗**：無法切換至最後幾個分類，需手動橫向滑動才能看到

### 1.3 歷史同類問題（MECE 回顧）

| CAPA 編號 | 日期 | 問題類型 | 根本原因 | 是否已閉合 |
|-----------|------|---------|---------|-----------|
| CAPA-004 | 2026-08-22 | Sidebar active 狀態對比度 | CSS 覆蓋規則不完整 | ✅ 已關閉 |
| CAPA-005 | 2026-08-22 | 卡片文字淺色模式不可見 | Tailwind v4 where() 權重競爭 + 選擇器失配 | ✅ 已關閉 |
| CAPA-006 | 2026-08-22 | 右側按鈕被裁切 | flex 容器無 min-w-max 導致壓縮而非滾動 | 🔄 修復中 |

---

## 2. 根本原因分析（RCA）

### 2.1 直接原因

```
┌─────────────────────────────────────────────────────────────────┐
│  根本原因：Three-Layer Failure                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: CSS 選擇器缺陷                                          │
│  ─────────────────────────────                                   │
│  • 內層 flex 容器無 min-w-max / min-width                       │
│  → Chrome 會壓縮 flex 行寬度而非觸發 parent 滾動                  │
│  → 按鈕被裁切而非可滾動                                           │
│                                                                  │
│  Layer 2: CSS Class 未定義                                       │
│  ─────────────────────────────                                   │
│  • scrollbar-none class 未被定義於 index.css                     │
│  → 意圖隱藏滾動條但無效，實際行為依賴瀏覽器默認                   │
│                                                                  │
│  Layer 3: Tailwind Class Typo                                    │
│  ─────────────────────────────                                   │
│  • py-1., 是無效 Tailwind class（應為 py-1.5）                   │
│  → 該 button 的 padding 使用瀏覽器默認值而非設計規範               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 流程漏洞

| 漏洞 | 說明 | MECE 維度歸屬 |
|------|------|--------------|
| 無自動化滾動邊界檢查 | CI/CD 無工具檢測 overflow 遮擋 | 工具層面 |
| 無響應式 UI 測試 | 手動測試未覆蓋不同斷點下的按鈕可見性 | 測試驗證層面 |
| 無預設 min-w-max 規範 | 開發者慣性省略滾動邊界約束 | 流程層面 |
| Tailwind typo 未被攔截 | 無 lint 規則檢查無效 class | 工具層面 |
| 無多視口截圖比對 | 無視覺回歸測試捕捉裁切問題 | 測試驗證層面 |

### 2.3 為什麼此前多次發生而未解決

1. **CAPA-004/005 的預防措施未延伸到布局層**：只關注了色彩對比度，未建立通用的 UI 布局檢查規範
2. **MECE 拆解遺漏「測試驗證層面」**：未考慮響應式測試用例
3. **pre-commit hook 缺少 UI 檢查**：目前僅有 tsc + MECE，無 CSS class 有效性檢查
4. **No ESLint/Stylelint**：無法在編碼階段攔截 `py-1.,` 此類 typo

---

## 3. 矯正措施

### 3.1 已實施修復

**檔案：[src/components/GlossaryPanel.tsx](file:///d:/Self-developed_Apps/Predictive-Material-System/src/components/GlossaryPanel.tsx)**

```diff
  {/* Category Tabs */}
- <div className="px-5 pb-3 overflow-x-auto scrollbar-none">
-   <div className="flex gap-1.5">
+ <div className="px-5 pb-3 overflow-x-auto scrollbar-none">
+   <div className="flex gap-1.5 min-w-max">
    <button
      onClick={() => setActiveCategory('all')}
-     className={`px-3 py-1.,  rounded-md text-xs font-semibold ...
+     className={`px-3 py-1.5 rounded-md text-xs font-semibold ...
```

**變更說明：**
| 修改 | 原因 |
|------|------|
| `min-w-max` | 強制 flex 行保持其自然寬度，觸發 parent `overflow-x-auto` 滾動而非壓縮 |
| `py-1.,` → `py-1.5` | 修復無效 Tailwind class，確保按鈕高度一致 |

**檔案：[src/index.css](file:///d:/Self-developed_Apps/Predictive-Material-System/src/index.css)**

新增 `.scrollbar-none` class 定義：
```css
.scrollbar-none {
  -ms-overflow-style: none;       /* IE/Edge */
  scrollbar-width: none;          /* Firefox */
}
.scrollbar-none::-webkit-scrollbar {
  display: none;                  /* Chrome/Safari/Opera */
}
```

### 3.2 其他組件審查結果

| 組件 | 行號 | overflow-x-auto 內容 | 風險 | 動作 |
|------|------|---------------------|------|------|
| SystemSettingsView | 968 | `<table w-full>` | ✅ 無風險 | 無需修改 |
| DataTablesView | 490 | `<table w-full>` | ✅ 無風險 | 無需修改 |
| DataTablesView | 578 | `<table w-full>` | ✅ 無風險 | 無需修改 |
| DashboardView | 1220 | `<table w-full>` | ✅ 無風險 | 無需修改 |
| DashboardView | 1377 | `<table w-full>` | ✅ 無風險 | 無需修改 |
| PrdDocView | 464 | `<pre>` 程式碼塊 | ✅ 無風險 | 無需修改 |

**結論**：所有其他 `overflow-x-auto` 容器均包含 `<table w-full>` 或 `<pre>`，表格元素不會被 flex 壓縮，無此問題。唯一需要修復的是 GlossaryPanel 的 flex 標籤行。

---

## 4. 預防措施

### 4.1 全局 UI Layout 檢核規範

新增至 [docs/UI-Contrast-Standards.md](file:///d:/Self-developed_Apps/Predictive-Material-System/docs/UI-Contrast-Standards.md)（待擴充）：

```markdown
## UI Layout 完整性規範

### 水平滾動容器
任何使用 `overflow-x-auto` 的水平滾動容器必須滿足：
1. 內層 flex 行必須有 `min-w-max` 或等效的 `min-width: max-content`
2. 必須定義對應的 scrollbar 樣式（`scrollbar-none` / `scrollbar-thin` / 全局 `::-webkit-scrollbar`）
3. 不得使用無效的 Tailwind class（如 `py-1.,`）

### 響應式邊界檢查
在以下斷點下確認所有可點擊元素完整可見：
- 320px (小手機)
- 375px (主流手機)
- 768px (平板)
- 1024px (桌面小窗)
```

### 4.2 ESLint 規則建議（待實施）

```javascript
// .eslintrc.cjs（未來規劃）
{
  rules: {
    // 阻止使用無效 Tailwind class
    // 需配合 tailwindcss-eslint-plugin 或 stylelint
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/classnames-order': 'error',
  }
}
```

### 4.3 CI Pipeline 增強

`.github/workflows/deploy.yml` 新增視覺檢查階段（待實施）：

```yaml
- name: Layout boundary check
  run: |
    # 檢查所有 overflow-x-auto 容器的 min-w-max 約束
    grep -rn "overflow-x-auto" src/components/ --include="*.tsx" | \
      grep -v "min-w-max\|w-full\|whitespace-pre" && exit 1 || true
```

### 4.4 開發階段必檢清單

在 [docs/DevelopmentStatus.md](file:///d:/Self-developed_Apps/Predictive-Material-System/docs/DevelopmentStatus.md) 新增「上線前檢查清單」：

```markdown
## UI Layout 檢查（每版本必檢）

- [ ] 所有 `overflow-x-auto` 容器內層 flex 均有 `min-w-max`
- [ ] 所有滾動容器 scrollbar 樣式已定義（`.scrollbar-none` / `.scrollbar-sm`）
- [ ] 無無效 Tailwind class（檢查 `py-1.,` 此類 typo）
- [ ] 375px 寬度下所有按鈕可完整點擊
- [ ] 1024px 寬度下無水平滾動需求
```

---

## 5. 驗證結果

### 5.1 編譯驗證

| 檢查項 | 結果 |
|--------|------|
| TypeScript `tsc --noEmit` | ✅ 0 錯誤 / 0 警告 |
| Production Build | ✅ built in 5.03s |
| CSS `.scrollbar-none` 存在 | ✅ 已確認 |
| `min-w-max` 已注入 | ✅ 已確認 |
| `py-1.,` typo 已移除 | ✅ 已確認 |

### 5.2 手動測試矩阵（待開發者執行）

| 場景 | 預設結果 | 實際結果 | 狀態 |
|------|---------|---------|------|
| 375px 寬面板，全部標籤可見 | 可正常滾動 | 待驗證 | ⏳ |
| 480px 寬面板，標籤部分溢出 | 顯示滾動指示 | 待驗證 | ⏳ |
| 640px (md) 斷點，標籤全部可見 | 無需滾動 | 待驗證 | ⏳ |
| 1024px (lg) 斷點，寬面板 | 無滾動 | 待驗證 | ⏳ |
| 中文標籤 vs 英文標籤長度差異 | 一致性可滾動 | 待驗證 | ⏳ |
| 深色/淺色模式切換 | 滾動行為一致 | 待驗證 | ⏳ |

### 5.3 回歸風險評估

| 風險 | 等級 | 緩解措施 |
|------|------|---------|
| `min-w-max` 導致小螢幕下滾動條過早出現 | 低 | 面板已有 `max-w-lg/md:max-w-xl/lg:max-w-2xl` 限制，正常桌面寬度不會觸發 |
| `scrollbar-none` 影響其他滾動區域 | 無 | 僅應用於 GlossaryPanel tabs 容器，其他滾動區域保持全局樣式 |
| 修復影響現有分類按鈕互動 | 無 | 純 CSS 變更，不影響 JavaScript 邏輯 |

---

## 6. CAPA 體系改進記錄

本次問題暴露出 CAPA 體系的三個缺口，已納入後續改進：

| 缺口 | 改進動作 | 相關 CAPA |
|------|---------|----------|
| 無水平滾動布局檢查規範 | 新增 UI Layout 檢核規範（第 4.1 節） | CAPA-006 |
| 無無效 Tailwind class 攔截 | 建議配置 ESLint + tailwindcss plugin | CAPA-006 |
| MECE 拆解頻繁遺漏「測試驗證層」 | 已建立 MECE 模板庫（mec-template-library.json），強制六維檢查 | PMS-MEC-20260822-01 |

---

## 7. 驗收標準

| 項目 | 標準 | 負責方 |
|------|------|--------|
| 矯正措施 | 所有 6 個分類標籤在 ≤375px 面板寬度下可通過橫向滾動完整訪問 | 開發者 |
| 預防措施 | UI Layout 規範已記錄於文檔，CI 加入基礎檢查 | 技術負責人 |
| 驗證 | 開發者於 Chrome/Firefox/Safari 於 375px/768px/1024px 寬度完成手動測試 | 開發者 |
| 閉合 | 所有驗收項目通過後標記為 ✅ 已關閉 | 技術負責人 |

---

*CAPA-006 報告生成：Trae AI Agent · 2026-08-22*
