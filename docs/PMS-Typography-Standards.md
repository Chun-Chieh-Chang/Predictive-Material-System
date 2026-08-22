# PMS 全域字體規範 v2.0

**版本：** 2.0  
**生效日期：** 2026-08-22  
**檔案位置：** `src/index.css`（核心定義）

---

## 1. 全局基礎設定

| 屬性 | 數值 | 說明 |
|------|------|------|
| `html font-size` | `15px` | 統一基準，消除與 body 的舊有差異（原 16px vs 15px） |
| `body font-size` | `15px` | 與 html 保持一致 |
| `body line-height` | `1.6` | 標準行高 |
| `font-family` | `inherit`（body 繼承 html） | 避免重複宣告，減少 CSS 冗餘 |
| **全域最小字體** | **`13px`** | 符合 WCAG AA 標準，任何元素不得低於此值 |

### 1.1 字體族優先順序

```
-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue',
'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif
```

- 英語優先使用系統原生字體
- 中文優先使用蘋方 → 思源黑體 → 正黑體

### 1.2 等寬字體族

```
'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono',
'Courier New', ui-monospace, monospace
```

---

## 2. 字級標準級距（4 階梯度）

| Class | 自訂 pixel | 計算值 (rem) | 行高 | 用途 |
|-------|-----------|-------------|------|------|
| `text-xs` | 13px | 0.867rem | 1.4rem | 表單標籤、輔助說明、徽章文字 |
| `text-[10px]` | 13px（強制最小） | 0.867rem | — | 等同 text-xs，歷史 custom px 統一收口 |
| `text-[11px]` | 14px | 0.933rem | — | 等同 text-xs 標準，歷史 custom px 統一收口 |
| `text-sm` | 14.5px | 0.967rem | 1.5rem | 次要文字、表單說明、欄位標籤 |
| `text-base` | 15px | 1rem | 1.6rem | 正文、段落、主要內容 |
| `text-lg` | 17.5px（Tailwind 默認） | 1.167rem | 1.7rem | 標題、強調文字 |
| `text-xl` | 20px（Tailwind 默認） | 1.333rem | 1.8rem | 區塊標題 |

> **原則：** 所有 `text-[10px]` 和 `text-[11px]` 自訂尺寸均被全域 CSS 強制映射至最小 13px。後續開發請直接使用 `text-xs` 或 `text-sm`。

---

## 3. 字重標準

| Class | 數值 | 用途 |
|-------|------|------|
| `font-normal` | 400 | 正文、段落 |
| `font-medium` | 500 | 按鈕文字、表單標籤、次要標題 |
| `font-semibold` | 600 | 區塊標題、強調文字、標籤 |
| `font-bold` | 700 | 數字、KPI、警示文字、徽章 |

### 3.1 禁用字重

| 字重 | 說明 |
|------|------|
| `font-extrabold` (800) | 專案內未使用，不引入 |
| `font-black` (900) | 專案內未使用，不引入 |

---

## 4. 行高標準

| 用途 | Line-height |
|------|------------|
| `text-xs` / `text-[10px]` | `1.4rem` |
| `text-[11px]` | 繼承父元素（約 `1.45rem`） |
| `text-sm` | `1.5rem` |
| `text-base` | `1.6rem` |
| 標題（h1-h4） | `1.3`（緊湊） |
| `.leading-standard` | `1.6`（通用） |

### 4.1 特殊行高場景

| 場景 | 建議 class |
|------|-----------|
| 字數少的標籤/徽章 | `leading-none` 或 `leading-tight` |
| 多行說明文字 | `leading-relaxed`（1.75） |
| 一般正文段落 | 無（預設 `1.6`） |

---

## 5. 字距標準

| 用途 | Class | 說明 |
|------|-------|------|
| 一般文字 | 無 | 預設 tracking |
| 次級標籤 | `tracking-wider` (+0.025em) | 選項類別、副標題 |
| 全大寫標籤 | `tracking-widest` (+0.1em) | 分類標頭（如「FK/SKU 基礎」） |

---

## 6. 歷史問題與修復記錄

### 6.1 問題清單（修復前）

| # | 問題 | 影響範圍 | 嚴重度 | 狀態 |
|---|------|---------|--------|------|
| F1 | `html` 16px vs `body` 15px 不一致 | 整體頁面基準 | P2 | ✅ 已修復（均為 15px） |
| F2 | `text-[10px]` 自訂像素渲染為 10px（低於 13px 最小值） | 100+ 處 | P1 | ✅ 已修復（CSS 強制 13px） |
| F3 | `text-[11px]` 自訂像素渲染為 11px（低於 13px 最小值） | 100+ 處 | P1 | ✅ 已修復（CSS 強制 14px） |
| F4 | `text-xs` 為 14px 但 `text-sm` 為 14.5px，級距過小 | 全局 | P2 | ✅ 已調整（13px / 14.5px） |
| F5 | `text-base` 為 16px 但 html 為 16px，導致双重放大 | 全局 | P3 | ✅ 已統一為 15px |
| F6 | `body font-family` 重複宣告 | index.css | P3 | ✅ 改用 `inherit` |
| F7 | 無全域 `leading-standard` class | 全局 | P3 | ✅ 已新增 |

### 6.2 各組件使用統計（字級分布）

| 組件 | text-[10px] 數量 | text-[11px] 數量 | text-xs | text-sm |
|------|:---:|:---:|:---:|:---:|
| DashboardView.tsx | ~0 | ~50 | — | ~20 |
| SystemSettingsView.tsx | ~12 | ~14 | ~1 | ~10 |
| BackupSettingsView.tsx | ~8 | ~10 | ~0 | ~5 |
| DataTablesView.tsx | ~4 | ~0 | ~1 | ~3 |
| DataExchangeView.tsx | ~9 | ~3 | ~0 | ~4 |
| GlossaryPanel.tsx | ~3 | ~5 | ~2 | ~2 |
| Sidebar.tsx | ~6 | ~0 | ~0 | ~1 |
| Navbar.tsx | ~0 | ~1 | ~0 | ~0 |
| **合計** | **~42** | **~83** | **~4** | **~45** |

> **注意：** 上述 custom px 數量為靜態掃描近似值，實際值以編譯後 CSS 為準。現已全部透過 index.css 強制映射至標準級距。

---

## 7. 新開發規範

### 7.1 字級選擇決策樹

```
需要顯示文字？
  ├─ 標題/大數字 → text-xl / text-lg
  ├─ 正文段落 → text-base（無 class）
  ├─ 次要說明/表單標籤 → text-sm（14.5px）
  ├─ 輔助文字/徽章 → text-xs（13px）
  └─ 極細輔助資訊 → text-xs（不要使用 text-[10px]）
```

### 7.2 禁止事項

```tsx
// ❌ 禁止：使用自訂像素字級（會繞過全域規範）
<span className="text-[10px]">...</span>
<span className="text-[11px]">...</span>
<div style={{ fontSize: '12px' }}>...</div>

// ✅ 正確：使用標準 Tailwind class
<span className="text-xs">...</span>
<p className="text-sm">...</p>
```

### 7.3 建議事項

```tsx
// ✅ 長段說明文字搭配 standard line-height
<p className="text-sm leading-standard text-slate-600">...</p>

// ✅ 徽章/標籤搭配 tight line-height
<span className="text-xs font-bold leading-none">OK</span>

// ✅ 全大寫分類標頭搭配 tracking-widest
<div className="text-xs font-bold uppercase tracking-widest">
  FK / SKU 基礎
</div>
```

---

## 8. 相關 CAPA

| CAPA 編號 | 主題 | 關聯 |
|-----------|------|------|
| CAPA-004 | Sidebar Active 狀態對比度矯正 | 同次修復期間一併處理 |
| CAPA-005 | 卡片文字可讀性對比度全面修復 | 同次修復期間一併處理 |
| CAPA-006 | 術語辭典右側按鈕被裁切 | 同次修復期間一併處理 |

---

*本規範由料事如神系統開發團隊制定，最後更新：2026-08-22*
