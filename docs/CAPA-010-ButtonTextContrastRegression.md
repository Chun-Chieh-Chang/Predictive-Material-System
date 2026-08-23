# CAPA-010 報告：深底色與飽和色彩色按鈕字體對比度退化 (White Text Preservation)

> **編號**：CAPA-010  
> **日期**：2026-08-23  
> **責任人**：Antigravity (AI Senior Architect)  
> **關聯 Commit**：`9021dc3`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] 淺色模式下深底色按鈕字體退化：`DataExchangeView` 中的綠色範本按鈕 `bg-emerald-600`、藍色 JSON 備份按鈕 `bg-blue-600`、紫色模擬按鈕 `from-purple-600` 文字意外呈現深黑色（`#0f172a`）。
- [✗] 標籤切換膠囊對比度不足：`SystemSettingsView` 中的藍色標籤膠囊 `bg-sky-600` 文字被覆蓋成黑色，無法辨識。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：全域 CSS 覆蓋過寬引發次生退化（Secondary Regression）。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] 選擇器層級過寬：`src/index.css` 為了防止白底白字，設置了全域規則 `html:not(.dark) *.text-white { color: #0f172a !important; }`，此規則具備 `!important` 權重，暴力覆蓋了包含在按鈕內部的 `span`、`svg`、`div` 與按鈕本體。
- [✓] 已修正為白名單保護機制，實心按鈕強制定向注入 `#ffffff !important`。

【流程層面】
- [✗] 副作用防禦覆蓋不足：在執行「淺色主題白底黑字標準化」時，未採用「白名單限定」思維，而是採用了「黑名單全域覆蓋」思維，未能在修改前精準預判對 Primary Button 的退化風險。
- [✓] 建立修改全域 CSS 時強制檢查 Primary Button 的 SOP 流程。

【工具層面】
- [✗] 校驗工具單向檢測盲區：既有的 `.impeccable/scripts/contrast-check.mjs` 只檢測了「白底容器中是否殘留亮色文字」，沒有反向檢查「深色/實心按鈕中是否誤用了深色文字」。
- [✓] 已升級 `contrast-check.mjs` 實裝實心按鈕白色文字保證檢測規則。

【測試驗證層面】
- [✗] 視覺回歸驗證漏網：在進行淺色主題回歸時，主要聚焦於大面積的表格與卡片容器，忽略了各視圖中局部 Primary Action 按鈕與 Tab 膠囊的文字對比度。
- [✓] 將按鈕文字對比度納入日常預檢與自動化測試清單。

【文檔層面】
- [✗] UI 色彩規範缺少實心按鈕專項定義：在 `UI-Contrast-Standards.md` 中詳細記錄了卡片與文字的對比度，但缺乏對「實心色彩按鈕 (Solid Accent Buttons) 強制純白文字」的明確規範。
- [✓] 已更新設計規範文件，補齊實心按鈕白色文字標準。

【環境層面】
- [✗] 雙主題樣式隔離性不足：Light Mode 與 Dark Mode 之間依賴全域樣式覆蓋，而非完全封裝的 CSS Token 映射，導致部分全局 CSS 規則跨界污染。
- [✓] 透過精準 scoped 選擇器實現雙主題樣式完全隔離。

---

## 3. 矯正措施

- [✓] 精準隔離全域覆蓋：從 `html:not(.dark) *.text-white` 中徹底移除 `button`, `span`, `div`, `p` 的無差別黑字覆蓋，僅保留卡片中安全標題等特定情境。
- [✓] 實心與漸變按鈕白字專屬保護：在 `src/index.css` 明確宣告實心與漸變按鈕強制保證純白字體 `#ffffff !important`。

---

## 4. 預防措施與自進化沉澱

- [✓] 升級自動化校驗器：`contrast-check.mjs` 加入「實心按鈕白色文字保證檢測」防呆規則。
- [✓] 寫入全域知識庫：登錄至 `.impeccable/kb/issues.yaml`（KB-004）作為未來 AI 迭代先驗防禦。
- [✓] 更新設計標準規範：`UI-Contrast-Standards.md` 補齊實心色彩按鈕白色文字法則。

---

## 5. 驗證依據

- [✓] TypeScript 編譯：`tsc --noEmit` 0 錯誤
- [✓] Production Build：Vite 3.53s 構建成功
- [✓] 對比度校驗：`.impeccable/scripts/contrast-check.mjs` 100% 通過
- [✓] Git Commit 基準：`9021dc3`


