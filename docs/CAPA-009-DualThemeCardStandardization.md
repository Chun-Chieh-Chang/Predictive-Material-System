# CAPA-009 報告：全量雙主題卡片配色標準化與暴力CSS注入清除 (Dual-Theme Card Standardization & CSS Injection Removal)

> **編號**：CAPA-009  
> **日期**：2026-08-23  
> **責任人**：Antigravity (AI Senior Architect)  
> **關聯 Commit**：`bce28fa` / `2ecbe7b`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] 淺色模式（Light Mode）下，`ShipScheduleClearanceView`（出貨船期與通關）與 `OrderTensionTrackerView`（訂單緊張度追蹤）等頁面的頂部 Header Banner 出現深黑底暗字、紫黑底暗字及右側背景截斷色偏問題，文字幾乎完全無法閱讀。
- [✗] `MrpCalculatorView` 與 `SystemSettingsView` 中存在 `dangerouslySetInnerHTML` 暴力 CSS 覆蓋（`lightModeOverrides`），破壞 Tailwind 標準層疊上下文。
- [✗] 10 大核心視圖的卡片容器未統一採用雙主題（Light/Dark）Token 標準。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：淺色模式下多個視圖的卡片容器出現黑底黑字、文字不可讀。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] **硬編碼深色背景/漸變**：多個視圖使用寫死的 `bg-gradient-to-r from-slate-900...` 或未加 `dark:` 前綴的 `bg-slate-950`，在淺色模式下與全域淺色文字規則嚴重衝突，造成黑底黑字。
- [✗] **暴力內聯CSS覆蓋 (`lightModeOverrides`)**：在 `MrpCalculatorView` 與 `SystemSettingsView` 中使用 `dangerouslySetInnerHTML` 注入暴力 CSS 覆蓋，破壞了 Tailwind 的標準層疊上下文與雙主題規範。
- [✓] 全面重構為標準雙主題 Token 系統。

【流程層面】
- [✗] 各視圖開發時缺乏統一的卡片容器設計規範，各自採用不同的背景/文字組合。
- [✓] 建立全域卡片容器雙主題 Token 規範（外層: `bg-white dark:bg-slate-900`、內層: `bg-slate-50 dark:bg-slate-950/70`）。

【工具層面】
- [✗] 校驗腳本依賴粗略正則，未能捕捉組件內部未做深淺色分流的容器。
- [✓] 升級 `contrast-check.mjs` 為 Token/AST 級掃描能力。

【測試驗證層面】
- [✗] 先前僅在深色模式下確認視覺效果，未在淺色模式下執行端到端目視校驗。
- [✓] 透過 Browser Subagent 分別在 Light 與 Dark Mode 下實測全頁面，截圖存證。

【文檔層面】
- [✗] `docs/DESIGN.md` 中的設計 Token 值與實際代碼存在不一致。
- [✓] 同步更新 `docs/DESIGN.md` 中的 `--bg-workbench` token 值至 `#EBF0F5`。

【環境層面】
- [✓] 純前端 CSS 層面問題，不涉及環境依賴。

---

## 3. 矯正措施

- [✓] **全專案 10 大核心視圖卡片容器雙主題 Token 標準化**：
  - 外層卡片：`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs`
  - 內層子區塊：`bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4`
  - 標題文字：`text-slate-900 dark:text-white font-bold`
  - 副標/內文：`text-slate-600 dark:text-slate-400`
- [✓] **徹底移除所有暴力 CSS 注入**：清除 `MrpCalculatorView` 與 `SystemSettingsView` 中的 `lightModeOverrides` + `dangerouslySetInnerHTML`，回歸原生 Tailwind 雙主題 class。
- [✓] **淺色主題工作台底色微調**：`--bg-workbench: #F1F5F9` → `#EBF0F5`（與純白卡片建立 1.15:1 溫和景深層次）。
- [✓] **側邊欄群組預設收合**：`expandedGroups` 初始值改為 `false`，介面保持極簡。
- [✓] **敏感資料資安清理**：`git rm --cached rawdata/`，`.gitignore` 新增 `rawdata/` 整目錄排除。

---

## 4. 預防措施與自進化沉澱

- [✓] 升級 `contrast-check.mjs` 為 Token/AST 級掃描，防禦「硬編碼深色漸變」、「未加 dark: 前綴的深色容器」與「暴力樣式注入」。
- [✓] 建立全域卡片容器設計 Token 規範，供後續新視圖開發遵循。
- [✓] 修改全域 CSS 時強制執行雙主題並行視覺驗證。

---

## 5. 驗證依據

- [✓] TypeScript 編譯：`tsc --noEmit` 0 錯誤
- [✓] Production Build：Vite 3.69s 構建成功
- [✓] 對比度校驗：`contrast-check.mjs` 100% 通過（0 缺陷）
- [✓] 瀏覽器雙主題實測：Light/Dark Mode 全頁面截圖確認 Console 零錯誤
- [✓] Git Commit 基準：`bce28fa` / `2ecbe7b`
