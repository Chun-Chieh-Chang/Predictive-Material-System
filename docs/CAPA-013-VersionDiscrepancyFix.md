# CAPA-013 報告：GitHub Pages 雲端部署與本地開發環境版號不同步之根因分析與矯正預防措施 (Version Discrepancy between CI & Local)

> **編號**：CAPA-013  
> **日期**：2026-08-24  
> **責任人**：Antigravity (AI Senior Architect & Lead Engineer)  
> **關聯 Commit**：`5c9d57c` / `a95531c`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] **版號顯示不一致**：在完成專案優化與推送後，本地開發伺服器（http://localhost:3000/）頂部 Telemetry 顯示為 `ISO • V-20260824-02`，而 GitHub Pages 雲端正式發布頁面卻顯示為 `ISO • V-20260824-01`。
- [✗] **使用者認知斷層**：使用者與測試人員無法於第一時間透過 UI 版號確認雲端部署是否已包含最新變更，產生對部署狀態之疑慮。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：GitHub Actions 部署產物讀取到的版號與本地 Vite Dev Server 運行時計算的版號不同。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] CI 與 Local 計算分支不對稱：在 `vite-plugin-git-version.ts` 中，CI 環境（`isCI() === true`）採用「靜態讀取已提交的 `src/utils/version.ts`」以避免 UTC 時區跳變；本地環境（`isCI() === false`）則透過 `git log`「動態計算今日本地 Commit 累計次數」。
- [✗] 狀態差生成：當優化作業 Commit (`5c9d57c`) 推送時，檔案內靜態記錄的是 `V-20260824-01`；而本地啟動 `npm run dev` 後，本地外掛重新計算出當日已有 2 次 Commit，隨即將本地執行階段與檔案自動熱更新為 `V-20260824-02`，形成「本地已先行遞增，但 Git 遠端仍為上一版號」的狀態差。
- [✓] 矯正：統一版本檔案同步時序，由 Pre-commit 門禁原子性寫入最新版號。

【流程層面】
- [✗] 版本生成與提交時序脫節：先執行 `git commit`（寫入版號 01）→ 再啟動本地 Dev Server（本地動態計算出 02 並改寫檔案）→ 導致本地工作目錄隨即出現未暫存的 `src/utils/version.ts` 變更。
- [✓] 矯正：在 Pre-commit 階段必須原子性（Atomically）先推算本次 Commit 將產生的最新序號並完成寫入，使該次 Commit 內建之 `version.ts` 即可達到最新版號。

【工具層面】
- [✗] 版本插件缺乏即時雙向收斂保護：插件在本地 Dev 模式下直接改寫檔案，但未在 Pre-push 階段自動檢核 `version.ts` 是否與即將推送的 HEAD 保持同步。
- [✓] 矯正：優化版號同步機制，確保 CI 構建與本地執行讀取之版號來源完全收斂至單一真相來源（SSOT）。

【測試驗證層面】
- [✗] Pre-push 門禁未比對版號一致性：Pre-push DoD 雖然檢查了 TypeScript 與 Production Build，但未將「工作目錄 `version.ts` 與 HEAD Commit `version.ts` 內容一致性」列為強制阻擋條件。
- [✓] 矯正：將版本檔案一致性納入門禁檢查項目。

【文檔層面】
- [✗] 缺乏跨環境版號生命週期指引：開發日誌未明確說明 GitHub Actions（靜態防時區偏離）與 Dev Server（動態熱更新）的版號運作邏輯。
- [✓] 矯正：沉澱本 CAPA-013 報告，並在 `DEV_LOG.md` 與 `README.md` 中詳細載明版號生命週期。

【環境層面】
- [✗] CDN 與瀏覽器快取延遲：GitHub Actions 部署需 1~2 分鐘，且 GitHub Pages 具備強快取機制，若未強制重新整理（Hard Refresh），易使人誤判為版本未部署。
- [✓] 矯正：提供清晰之快取刷新與部署追蹤說明。

---

## 3. 矯正措施

- [✓] 立即同步版本檔案：將本地最新產生的 `src/utils/version.ts`（包含 `V-20260824-02`）正式納入版本控制並提交推送至 GitHub 倉庫。
- [✓] 優化版號插件邏輯：在本地建置與 CI 建置時，統一透過精確的時區換算與原子寫入，消除本地 Dev Server 與 CI 產物之間的版號狀態差。

---

## 4. 預防措施與自進化沉澱

- [✓] 門禁原子性防護：在 Git Pre-commit 階段，由 `sync-version.mjs` 自動將即將產生之 Commit 序號直接更新至 `src/utils/version.ts` 並自動 `git add`，確保每次 Commit 內含的版號即為最新版號，杜絕懸空狀態。
- [✓] 自進化知識庫入庫：將 CAPA-013 納入 `.impeccable/kb/issues.yaml`，供全域 AI 代理人在未來的版本管理與發布作業中自動引用與自我審查。
