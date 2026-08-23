# CAPA-011 報告：通配屬性選擇器污染淺色卡片文字退化 (Wildcard Selector Card Contamination)

> **編號**：CAPA-011  
> **日期**：2026-08-23  
> **責任人**：Antigravity (AI Senior Architect)  
> **關聯 Commit**：待提交  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] 淺色模式下特定卡片文字泛白隱形：在 `DashboardView`（決策戰情室）中的「基準 vs 模擬 Δ 差異衝擊推演」卡片中，淺藍色容器（`bg-sky-50` / `bg-sky-100`）內部的標題與深色文字（如「建議發單採購量」、「預估採購總金額」、「最晚下單期限」）全部呈現純白色，在淺色背景上對比度嚴重不足，文字完全看不清。
- [✗] 改 A 錯 B 次生退化：先前為了解決「深底色按鈕需保持白字」而引入的全域 CSS 規則，意外誤傷了所有包含 `from-sky-` 或 `from-blue-` 的淺色卡片內部文字。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：全域 CSS 通配屬性選擇器（Wildcard Attribute Selector）引發改 A 錯 B。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] 選擇器過寬且匹配到 Dark Mode 類別：在 `src/index.css` 中編寫了 `html:not(.dark) [class*="from-sky-"] *` 與 `html:not(.dark) [class*="from-blue-"] *`。因 DOM 卡片標籤包含 `dark:from-blue-950/70`，子字串 `from-blue-` 在淺色模式（`html:not(.dark)`）下依然被該萬用字元選擇器命中，並將其內部所有子元素強制賦予 `#ffffff !important`。
- [✓] 矯正：徹底刪除 `[class*="from-..."] *` 萬用字元選擇器，將實心按鈕白色文字保證精確限定於 `button` 標籤與 `.btn-primary`。

【流程層面】
- [✗] 副作用防禦未窮盡所有 DOM 標籤：修改全域 CSS 時，僅驗證了按鈕本身變白，未同步全面掃描包含 `dark:from-*` 類別的卡片在淺色模式下的渲染表現。
- [✓] 建立修改全域 CSS 規則時強制檢查「淺色卡片與深色按鈕隔離性」的 SOP 流程。

【工具層面】
- [✗] 校驗工具未檢測「淺色容器內部被意外白字覆蓋」：既有的校驗器只關注 class 名稱本身，未模擬 DOM 繼承層級下 `!important` 規則引發的覆蓋污染。
- [✓] 升級 `.impeccable/scripts/contrast-check.mjs`，增加對通配屬性選擇器的靜態語法禁用檢查。

【測試驗證層面】
- [✗] 複雜組合卡片視覺回歸盲區：在驗證按鈕對比度時，漏掉了 Dashboard 底部帶有漸變 dark 類別的多層次推演卡片。
- [✓] 將「基準 vs 模擬 Δ 差異衝擊推演」卡片納入每次 UI 變更的必檢巡檢清單。

【文檔層面】
- [✗] 缺少全域 CSS 選擇器禁忌指引：文檔未明確警告「禁止在 Light Mode 中使用 `[class*="from-*"] *` 通配屬性選擇器」。
- [✓] 將「嚴禁通配屬性選擇器污染容器」寫入 `UI-Contrast-Standards.md`。

【環境層面】
- [✗] Tailwind 類別前綴在原生 CSS 中被子字串通配誤傷：Tailwind 的 `dark:from-blue-950` 在原生 CSS 屬性選擇器 `[class*="from-blue-"]` 中會被視為命中。
- [✓] 一律採用明確標籤選擇器（如 `button.bg-blue-600`）取代字串包含匹配。

---

## 3. 矯正措施

- [✓] 精準收斂按鈕選擇器：在 `src/index.css` 中將所有白字保護規則精確收斂為 `html:not(.dark) button.bg-*` 與 `html:not(.dark) .btn-primary`，徹底刪除 `[class*="from-*"] *`。
- [✓] 恢復淺色卡片深色字體：`DashboardView` 中「基準 vs 模擬 Δ 差異衝擊推演」的標題與採購量文字立即恢復原生的 `text-sky-900`、`text-sky-950` 等高對比度清晰深藍字體。

---

## 4. 預防措施與自進化沉澱

- [✓] 升級防呆工具：`contrast-check.mjs` 嚴禁引入 `[class*="from-*"] *` 等通配子字串選擇器。
- [✓] 登錄知識庫：更新至 `.impeccable/kb/issues.yaml`（KB-004）防止未來重複出現改 A 錯 B。
- [✓] 文件更新：同步更新 `DEV_LOG.md` 與 `docs/DevelopmentStatus.md`。
