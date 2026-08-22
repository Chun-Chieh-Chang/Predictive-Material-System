# UI 色彩對比度設計規範

> **強制性規則** — 所有團隊成員在開發及修訂任何 UI 元件時，必須遵守以下對比度規範。
> 違反本規範的 PR 將不予合併。

---

## 1. 標準依據

本規範基於 **WCAG 2.1 Level AA** 無障礙標準制定：

| 文字大小 | 最低對比度 | 適用場景 |
|----------|-----------|----------|
| 正常字級（<18px 或非粗體 ≥14px） | **4.5:1** | 主要導航、按鈕文字、標籤 |
| 大字幕（≥18px 粗體 或 ≥24px 常規） | **3:1** | 標題、Hero 文字 |

---

## 2. 禁止使用的配色模式

### ❌ 禁止 1：低飽和色 + 半透明疊加

```tsx
// 錯誤範例 — 產生灰濁、低對比效果
<div className="bg-sky-600/15 text-sky-100">
  物料分類體系
</div>
// 實際對比度：~1.05:1 ❌ 完全不可讀
```

**原因**：半透明淺色疊加於深色底時，混合結果的對比度無法直接從色階推斷，且常低於 WCAG 標準。

### ❌ 禁止 2：相近色階的文字與背景

```tsx
// 錯誤範例 — sky-200 文字在 sky-100 背景上
<div className="bg-sky-100 text-sky-200">
  內容
</div>
// 對比度：~1.2:1 ❌
```

### ❌ 禁止 3：暗色文字用於次要內容

```tsx
// 錯誤範例 — slate-600 在 slate-950 背景上對比度僅 2.47:1
<div className="bg-slate-950 text-slate-600">
  副標題
</div>
```

**建議**：次要文字最低使用 `slate-500`（對比度 3.99:1，符合次級內容 3:1 標準）。

---

## 3. 已驗證的安全配色組合

### 深色底（slate-950 #0F172A）場景

| 用途 | 背景色 | 字體色 | 對比度 | Tailwind Class |
|------|--------|--------|--------|----------------|
| 主要文字 | `#0F172A` | `#F1F5F9` | 13.57:1 | `bg-slate-950 text-slate-100` |
| 次要文字 | `#0F172A` | `#E2E8F0` | 10.56:1 | `bg-slate-950 text-slate-200` |
| 第三層文字 | `#0F172A` | `#94A3B8` | 5.37:1 | `bg-slate-950 text-slate-400` |
| 最小可接受 | `#0F172A` | `#64748B` | 3.99:1 | `bg-slate-950 text-slate-500` |
| **Active 背景** | `#0284C7` | `#FFFFFF` | **7.84:1** | `bg-sky-600 text-white` |
| **Active 背景 (綠)** | `#059669` | `#FFFFFF` | **5.45:1** | `bg-emerald-600 text-white` |

### 淺色底（white / slate-50）場景

| 用途 | 背景色 | 字體色 | 對比度 | Tailwind Class |
|------|--------|--------|--------|----------------|
| 主要文字 | `#FFFFFF` | `#0F172A` | 13.57:1 | `bg-white text-slate-900` |
| 次要文字 | `#FFFFFF` | `#475569` | 6.42:1 | `bg-white text-slate-700` |
| 第三層文字 | `#FFFFFF` | `#64748B` | 4.54:1 | `bg-white text-slate-600` |
| **Active 背景** | `#0284C7` | `#FFFFFF` | **7.84:1** | `bg-sky-600 text-white` |

---

## 4. 設計檢查流程

### 4.1 每次新增/修改 UI 元件時的檢查步驟

1. **識別文字-背景組合**：確認元件中所有文字與其直接背景的顏色搭配
2. **使用工具驗證**：
   - [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)（推薦）
   - Chrome DevTools → Accessibility → Elements → Contrast Ratio
   - 瀏覽器擴充功能：[axe DevTools](https://www.deque.com/axe/devtools/)
3. **記錄驗證結果**：在對應 PR 的說明中附上對比度數值
4. **未達標即修正**：低于 4.5:1 時，調整字體或背景色直至達標

### 4.2 半透明疊加效果的特別注意事項

當需要使用半透明效果（opacity <30%）時：
- 文字**不得**使用半透明背景 + 淺色文字的组合
- 應改用**完全不透明**的背景色
- 或確保文字顏色足夠深以維持對比度

---

## 5. 常見錯誤與修正範例

### 錯誤 1：追求「輕量化」導致對比度不足

```tsx
// ❌ 錯誤
isActive ? 'bg-sky-600/15 text-sky-200' : ...
// 對比度：<1.5:1，完全不可讀

// ✅ 正確
isActive ? 'bg-sky-600 text-white' : ...
// 對比度：7.84:1，符合 WCAG AA
```

### 錯誤 2：hover 狀態對比度比 default 更低

```tsx
// ❌ 錯誤 — hover 時變得更難讀
hover:'text-slate-600'  // 對比度從 5.37:1 降到 2.47:1

// ✅ 正確 — hover 時對比度提升或維持
hover:'text-slate-200'  // 對比度 10.56:1
```

### 錯誤 3：Badge/標籤文字與背景對比不足

```tsx
// ❌ 錯誤
'bg-red-500/20 text-red-400'  // 淺紅文字在浅紅背景上，對比度低

// ✅ 正確
'bg-red-500/20 text-red-300'  // 提高文字亮度以達到可讀對比
```

---

## 7. UI 布局完整性規範

### 7.1 水平滾動容器規則

任何使用 `overflow-x-auto` 的水平滾動容器必須滿足：

| 規則 | 原因 | 反例 |
|------|------|------|
| 內層 flex 行必須有 `min-w-max` | Chrome 會壓縮 flex 行而非觸發 parent 滾動 | `<div className="flex gap-1.5">`（無 min-w-max） |
| 必須定義對應的 scrollbar 樣式 | 避免瀏覽器默認滾動條破壞視覺設計 | `scrollbar-none` 未定義 |
| 不得使用無效 Tailwind class | 無效 class 被忽略，導致样式意外退回到默認值 | `py-1.,` 而非 `py-1.5` |

```tsx
// ❌ 錯誤：flex 行可壓縮，按鈕被裁切
<div className="overflow-x-auto scrollbar-none">
  <div className="flex gap-1.5">
    <button>全部 (57)</button>
    <button>系統功能...</button>  {/* 可能被裁切 */}
  </div>
</div>

// ✅ 正確：min-w-max 強制行寬不壓縮，觸發滾動
<div className="overflow-x-auto scrollbar-none">
  <div className="flex gap-1.5 min-w-max">
    <button>全部 (57)</button>
    <button>系統功能...</button>  {/* 可通過滾動訪問 */}
  </div>
</div>
```

### 7.2 響應式邊界檢查清單

每版上線前必須確認以下斷點下所有可點擊元素完整可見：

```
□ 320px  — 小手機（SE/舊款）
□ 375px  — 主流手機（iPhone 14/15）
□ 428px  — 大手機（Pro Max）
□ 768px  — 平板豎直
□ 1024px — 桌面小窗
□ 1280px — 標準桌面
```

### 7.3 `.scrollbar-none` CSS 定義（已全局註冊）

```css
/* src/index.css */
.scrollbar-none {
  -ms-overflow-style: none;       /* IE/Edge */
  scrollbar-width: none;          /* Firefox */
}
.scrollbar-none::-webkit-scrollbar {
  display: none;                  /* Chrome/Safari/Opera */
}
```

---

## 8. 相關 CAPA

| CAPA 編號 | 主題 | 狀態 |
|-----------|------|------|
| CAPA-004 | Sidebar Active 狀態對比度矯正 | 已修正 |
| CAPA-005 | 卡片文字可讀性對比度全面修復 | 已修正 |
| CAPA-006 | 術語辭典右側按鈕被裁切（水平滾動失效） | 已修正 |

---

*本規範由料事如神系統開發團隊制定，最後更新：2026-08-22*
