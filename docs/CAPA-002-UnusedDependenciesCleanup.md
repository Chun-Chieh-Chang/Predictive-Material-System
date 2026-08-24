# CAPA-002 報告：未使用前端依賴套件清理 (Unused Frontend Dependencies Cleanup)

> **編號**：CAPA-002  
> **日期**：2026-08-21  
> **責任人**：Antigravity (AI Senior Architect)  
> **關聯 Commit**：含於 V-20260821-22 優化批次 (`2ecbe7b`)  
> **狀態**：✅ 已關閉 (Closed)

---

## 1. 問題描述

- [✗] `package.json` 中聲明了 `@google/genai`、`express`、`dotenv` 等後端套件，但前端代碼中從未實際引用。
- [✗] 額外還包含 `motion`、`autoprefixer`、`esbuild`、`tsx` 等在正式建構中未使用的開發工具依賴。
- [✗] 雖然 Vite tree-shaking 可有效排除未引用模組，但殘留依賴增加了安全稽核面積與安裝時間。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：`package.json` 殘留後端預留依賴，增加安全稽核面積與安裝時間。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] `@google/genai`、`express`、`dotenv` 為 AI Studio 後端預留架構，在前端純 SPA 架構中屬無用依賴。
- [✓] 已於 V-20260821-22 全域優化時從 `package.json` 中移除。

【流程層面】
- [✗] 在架構轉型（從 Full-stack 預留 → 純前端 SPA）時，未同步清理後端預留的依賴。
- [✓] 已建立「架構轉型必須伴隨依賴清理」的流程規範。

【工具層面】
- [✗] 缺乏自動化的未使用依賴偵測工具（如 `depcheck`）。
- [✓] 由全域程式碼清理 SOP 覆蓋此類問題。

【測試驗證層面】
- [✗] 未在 CI 中設置未使用依賴檢查。
- [✓] 移除後 `npm run build` 正常通過，確認無運行時副作用。

【文檔層面】
- [✗] 未在架構設計文件中標註哪些依賴為「預留」性質。
- [✓] 已於 `DEV_LOG.md` 記錄此 CAPA。

【環境層面】
- [✓] 純 `package.json` 清理，不影響運行時環境。

---

## 3. 矯正措施

- [✓] 從 `package.json` 移除 `@google/genai`、`express`、`dotenv`、`motion`、`autoprefixer`、`esbuild`、`tsx` 等未使用依賴。
- [✓] 執行 `npm install` 重新生成乾淨的 `package-lock.json`。

---

## 4. 預防措施與自進化沉澱

- [✓] 將「未使用依賴清理」納入全域程式碼清理 SOP 標準檢查步驟。
- [✓] 架構轉型時強制附帶依賴清理審查。

---

## 5. 驗證依據

- [✓] `npm run build`：0 錯誤，Bundle 體積微幅優化
- [✓] `tsc --noEmit`：0 錯誤
- [✓] 影響等級：低（Vite tree-shaking 已有效排除，清理屬防衛性改善）
