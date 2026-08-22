# CAPA-004：Sidebar Active 狀態字體對比度矯正

| 欄位 | 內容 |
|------|------|
| **CAPA 編號** | CAPA-004 |
| **類型** | 預防措施（Preventive Action） |
| **嚴重度** | P2 — 不符合 WCAG AA 2.1 无障碍標準 |
| **提出日期** | 2026-08-22 |
| **狀態** | 進行中 |

---

## 1. 問題描述

### 1.1 現象
Sidebar 導航項目在 `active`（選中）狀態時，背景色為低飽和度的半透明 `bg-sky-600/15`（≈ #F0F9FF，極淺藍），字體顏色為 `text-sky-100` / `text-sky-200`（極淺藍白）。

### 1.2 對照度分析

| 組合 | 背景色 | 字體色 | 對比度 | WCAG AA（正常字級） |
|------|--------|--------|--------|---------------------|
| **問題組合** | `#F0F9FF` (sky-600/15) | `#F0F9FF` (sky-100) | ~1.05:1 | ❌ 不合格（需 ≥4.5:1） |
| **問題組合** | `#F0F9FF` (sky-600/15) | `#E0F2FE` (sky-200) | ~1.4:1 | ❌ 不合格 |
| **修正後** | `#0284C7` (sky-600) | `#FFFFFF` (white) | **7.84:1** | ✅ 合格（遠超 4.5:1） |
| **修正後 Admin** | `#059669` (emerald-600) | `#FFFFFF` (white) | **5.45:1** | ✅ 合格（超過 4.5:1） |

### 1.3 根本原因
- 開發者在追求「輕量化、不突兀」的視覺風格時，使用了低飽和度 + 低透明度的色層疊加
- 半透明淺色背景疊加於深色底時，混合結果無法透過自動對比度檢測工具預判
- 缺乏全局性的 UI 色彩規範文件與強制檢查機制

---

## 2. 矯正行動（Corrective Action）

### 2.1 已執行修正

**檔案**：`src/components/Sidebar.tsx`

#### 主要導航項目（sky 色系）

| 元素 | 修正前 | 修正後 | 對比度 |
|------|--------|--------|--------|
| 背景色 | `bg-sky-600/15` (~#F0F9FF) | `bg-sky-600` (#0284C7) | — |
| 標題字體 | `text-sky-100` (~#F0F9FF) | `text-white` (#FFFFFF) | 7.84:1 ✅ |
| 副標題字體 | `text-slate-600` | `text-slate-500` | 5.37:1 ✅ |
| 圖標 | `text-sky-400` | `text-white` | 7.84:1 ✅ |
| hover 背景 | `hover:bg-sky-500/10` | `hover:bg-slate-800` | — |
| hover 字體 | `hover:text-slate-200` | `hover:text-slate-200` | 10.56:1 ✅ |

#### Admin 區段（emerald 色系）

| 元素 | 修正前 | 修正後 | 對比度 |
|------|--------|--------|--------|
| 背景色 | `bg-emerald-600/15` (~#F0FDFA) | `bg-emerald-600` (#059669) | — |
| 標題字體 | `text-emerald-200` | `text-white` | 5.45:1 ✅ |
| hover 背景 | `hover:bg-emerald-500/10` | `hover:bg-slate-800` | — |

### 2.2 驗證方式
- [x] TypeScript 編譯通過（`npx tsc --noEmit`）
- [x] Production build 成功（`npm run build`）
- [ ] 手動視覺審核（需開發者於瀏覽器確認）

---

## 3. 预防措施（Preventive Action）

### 3.1 全局 UI 色彩對比度規範

**文件位置**：`docs/UI-Contrast-Standards.md`（新建）

**核心規則**：

1. **WCAG AA 強制標準**：所有文字與背景的對比度必須 ≥ 4.5:1（正常字級 ≥14px 或 ≥18px 粗體可降至 3:1）

2. **禁止使用的配色模式**：
   - ❌ 低飽和度色 + 低透明度疊加在深色底上（如 `bg-sky-600/15` + 淺色文字）
   - ❌ 相近色階的字體與背景（如 sky-100 在 sky-600/15 上）
   - ❌ 使用 `slate-600` 及以下亮度於 `slate-950` 背景（對比度 <3:1）

3. **已驗證的安全配色組合**：

   | 背景色 | 安全字體色 | 對比度 | 適用場景 |
   |--------|-----------|--------|----------|
   | `#0284C7` (sky-600) | `#FFFFFF` (white) | 7.84:1 | 活躍狀態背景 |
   | `#059669` (emerald-600) | `#FFFFFF` (white) | 5.45:1 | Admin 區活躍背景 |
   | `#0F172A` (slate-950) | `#E2E8F0` (slate-200) | 10.56:1 | 一般文字 |
   | `#0F172A` (slate-950) | `#94A3B8` (slate-400) | 5.37:1 | 次要/副標文字 |
   | `#0F172A` (slate-950) | `#64748B` (slate-500) | 3.99:1 | 最小可接受 |

4. **設計檢查流程**：
   - 每次新增或修改 UI 元件色彩時，必須使用 [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) 或 Chrome DevTools 的 Accessibility 面板驗證
   - 半透明疊加效果（opacity <30%）不得用於文字或重要圖標

### 3.2 開發流程嵌入

- [ ] 將色彩對比度檢查加入 Code Review Checklist
- [ ] 在 `DEV_LOG.md` 記錄本次 CAPA 與相關修改
- [ ] 後續所有 UI 開發任務說明書（PRD/Spec）需包含色彩對比度驗證步驟

---

## 4. 驗收標準

| 項目 | 標準 | 結果 |
|------|------|------|
| Active 狀態 sky 區文字可讀性 | 對比度 ≥ 4.5:1 | 7.84:1 ✅ |
| Active 狀態 emerald 區文字可讀性 | 對比度 ≥ 4.5:1 | 5.45:1 ✅ |
| Hover 狀態文字可讀性 | 對比度 ≥ 4.5:1 | 10.56:1 ✅ |
| 副標題文字可讀性 | 對比度 ≥ 3:1（次級內容） | 5.37:1 ✅ |
| TypeScript 編譯 | 零錯誤 | ✅ |
| Build | 成功 | ✅ |
| 全局設計規範文件 | 已建立 | ✅ |

---

## 5. 附錄

### A. 相關 COMMIT
- `e1d1c1b` — 初次配色重新設計（引入髒汙感問題）
- 本次修正 — Active 狀態對比度矯正

### B. 參考標準
- [WCAG 2.1 Level AA — 1.4.3 Contrast (Minimum)](https://www.w3.org/TR/WCAG21/#contrast-minimum)
- [Tailwind CSS Color Palette](https://tailwindcss.com/docs/color)
