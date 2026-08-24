# CAPA-013 報告：GitHub Pages 雲端部署與本地開發環境版號一致性根因分析與終局預防措施 (Permanent SSOT Version Sync & Pre-push Gate)

> **編號**：CAPA-013  
> **日期**：2026-08-24  
> **責任人**：Antigravity (AI Senior Architect & Lead Engineer)  
> **關聯 Commit**：`5c9d57c` / `6bd5f1f`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] **版號顯示不一致**：在完成專案優化與推送後，本地開發伺服器（http://localhost:3000/）頂部 Telemetry 與 GitHub Pages 雲端正式發布頁面出現版本號碼差（如本地顯示 `ISO • V-20260824-11`，雲端顯示 `ISO • V-20260824-04`）。
- [✗] **使用者認知斷層**：使用者與測試人員無法於第一時間透過 UI 版號確認雲端部署是否已包含最新變更，產生對部署狀態之疑慮。

---

## 2. MECE 六大維度根因分析

- [✗] 既有問題：GitHub Actions 部署產物讀取到的版號與本地 Vite Dev Server 運行時計算的版號不同。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] 雙軌計算導致分歧（Dual-Track Calculation）：先前在 `vite-plugin-git-version.ts` 中設計了分支邏輯（CI 讀取 `version.ts`，本地 Dev Server 呼叫 `git log` 動態重算），導致兩邊來源不一致。
- [✗] 提交序號未預加 (+1)：在 Pre-commit 執行階段，`git log` 僅計算當前庫存 Commits，未將「即將產生的本次 Commit」計入 (+1)，導致 `version.ts` 寫入的版號永遠比 Commit 完成後的 `git log` 少 1。
- [✓] 矯正：徹底廢除雙軌計算，將 `src/utils/version.ts` 定為全專案唯一的「單一真相來源 (SSOT)」，無論本地 Dev、本地 Build 或 CI 均一律直接讀取該檔；Pre-commit 時由 `sync-version.mjs` 自動執行 `count + 1` 並原子化暫存。

【流程層面】
- [✗] 推送前未強制核對版本：先前 Pre-push 門禁雖有 TypeScript 與 Build 檢查，但未建立專門的「版本核對閘門 (Version Verification Gate)」。
- [✓] 矯正：在 `.husky/pre-push` 首步驟實裝 `verify-version-consistency.mjs`，每次 push 前強制自動校驗版號正確性。

【工具層面】
- [✗] CI 淺層拉取 (Shallow Clone)：GitHub Actions 預設 `actions/checkout@v4` 為 `fetch-depth: 1`。
- [✓] 矯正：在 `.github/workflows/deploy.yml` 明確宣告 `fetch-depth: 0`，保留完整歷史。

【測試驗證層面】
- [✗] 缺乏獨立的版本驗證腳本：測試流程中未針對版號格式與時區進行自動化檢核。
- [✓] 矯正：新增 `.impeccable/scripts/verify-version-consistency.mjs`。

【文檔層面】
- [✗] 缺乏跨環境版號生命週期指引：開發日誌未明確說明版號運作邏輯。
- [✓] 矯正：沉澱本 CAPA-013 報告，並在 `DEV_LOG.md` 與 `README.md` 中詳細載明版號生命週期。

【環境層面】
- [✗] CDN 與瀏覽器快取延遲：GitHub Pages 部署與快取更新存在時間差。
- [✓] 矯正：提供清晰之快取刷新與部署追蹤說明。

---

## 3. 矯正措施

- [✓] 實作單一真相來源：改寫 `vite-plugin-git-version.ts`，廢除分支計算，統一由 `src/utils/version.ts` 集中提供版號。
- [✓] 序號原子遞增：修復 `sync-version.mjs` 為 `seq = count + 1`，保證 commit 內建版號與 commit 後之序號精確對齊。
- [✓] 實裝每次推送前核對門禁：在 `.husky/pre-push` 納入 `verify-version-consistency.mjs`，每次 push 前自動核對。

---

## 4. 預防措施與自進化沉澱

- [✓] 門禁原子性防護：在 Git Pre-commit 階段，由 `sync-version.mjs` 自動將即將產生之 Commit 序號直接更新至 `src/utils/version.ts` 並自動 `git add`，確保每次 Commit 內含的版號即為最新版號，杜絕懸空狀態。
- [✓] 自進化知識庫入庫：將 CAPA-013 納入 `.impeccable/kb/issues.yaml`，供全域 AI 代理人在未來的版本管理與發布作業中自動引用與自我審查。
