# CAPA-010 報告：深底色與飽和色彩色按鈕字體對比度退化 (White Text Preservation)

> **編號**：CAPA-010  
> **日期**：2026-08-23  
> **責任人**：Antigravity (AI Senior Architect)  
> **關聯 Commit**：`9021dc3`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述 (Problem Statement)

在淺色模式 (Light Mode) 下，系統中部分採用深底色或高飽和度色彩背景的實心操作按鈕與膠囊切換鈕（如：`DataExchangeView` 中的綠色範本按鈕 `bg-emerald-600`、藍色 JSON 備份按鈕 `bg-blue-600`、紫色模擬按鈕 `from-purple-600`、`SystemSettingsView` 中的藍色標籤膠囊 `bg-sky-600` 等），文字意外呈現深黑色（`#0f172a`），造成嚴重的視覺對比度退化，無法清楚辨識按鈕文字。

---

## 2. 根因分析 (Root Cause Analysis - 5 Whys)

1. **為什麼深底色按鈕上的文字會變成深黑色？**  
   因為在 Light Mode 下，元素計算樣式被 `color: #0f172a !important` 覆蓋。
2. **為什麼按鈕明確寫了 `text-white` 還會被覆蓋成黑色？**  
   因為 `src/index.css` 包含全域規則：  
   `html:not(.dark) *.text-white { color: #0f172a !important; }`。
3. **為什麼會有這樣一條全域 text-white 覆蓋規則？**  
   先前為了修復「在深色模式組件中硬編碼的 `text-white` 搬移到淺色模式白底卡片時產生白字白底」的問題，設置了全域防白字保護。
4. **為什麼全域防白字保護會產生副作用 (Regression)？**  
   覆蓋選擇器範圍過寬（包含了 `button`, `span`, `p`, `div`），沒有區分「淺色白底容器」與「深色/彩色實心按鈕容器」。
5. **為什麼自動化測試沒有在第一時間攔截？**  
   `.impeccable/scripts/contrast-check.mjs` 僅檢測了「白底容器內是否遺漏深色字體」，未包含「深色/彩色按鈕內是否被錯誤覆蓋成深色字體」的反向邊界檢查。

---

## 3. 矯正措施 (Corrective Actions - 已完成)

1. **精準隔離全域覆蓋**：  
   從 `html:not(.dark) *.text-white` 中徹底移除 `button`, `span`, `div`, `p` 的無差別黑字覆蓋，僅保留卡片中安全標題（`h1`~`h6`）、`td`/`th`、`code`、`input` 等特定情境。
2. **實心與漸變按鈕白字專屬保護 (Solid & Gradient Button White Text Protection)**：  
   在 `src/index.css` 明確宣告實心與漸變按鈕（`.bg-emerald-600`, `.bg-blue-600`, `.bg-sky-600`, `.bg-purple-600`, `.bg-indigo-600`, `.bg-red-600`, `.bg-amber-600`, `[class*="bg-gradient-"]`, `[class*="from-purple-"]`, `.btn-primary` 等）強制保證純白字體：
   ```css
   html:not(.dark) .bg-emerald-600,
   html:not(.dark) .bg-emerald-600 *,
   html:not(.dark) .bg-blue-600,
   html:not(.dark) .bg-blue-600 *,
   html:not(.dark) .bg-sky-600,
   html:not(.dark) .bg-sky-600 *,
   html:not(.dark) .bg-purple-600,
   html:not(.dark) .bg-purple-600 *,
   html:not(.dark) [class*="bg-gradient-"],
   html:not(.dark) [class*="bg-gradient-"] *,
   html:not(.dark) .btn-primary,
   html:not(.dark) .btn-primary * {
     color: #ffffff !important;
   }
   ```

---

## 4. 預防措施與自進化沉澱 (Preventive Actions & Tool Self-Evolution)

1. **升級自動化校驗器 (`contrast-check.mjs`)**：  
   加入「反向對比度防呆規則」：檢測到任何深色實心背景（如 `bg-*-600`, `bg-*-700`, `from-*-600` 等）時，強制其子節點字體必須是 `#ffffff` 或 `text-white`，禁止被淺色主題黑字規則覆蓋。
2. **寫入全域知識庫 (`.impeccable/kb/issues.yaml`)**：  
   登錄為 `KB-004: 淺色主題下過寬的 text-white 覆蓋導致實心按鈕文字對比度失效`，作為未來 AI 迭代時的防禦性先驗知識。

---

## 5. 驗證依據 (Evidence of Verification)

- **TypeScript 編譯**：`tsc --noEmit` 0 錯誤
- **Production Build**：Vite 3.53s 構建成功
- **對比度校驗**：`.impeccable/scripts/contrast-check.mjs` 100% 通過
- **Git Commit**：`9021dc3`
