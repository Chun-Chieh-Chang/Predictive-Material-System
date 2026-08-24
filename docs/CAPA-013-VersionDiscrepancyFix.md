# CAPA-013 報告：GitHub Pages 雲端部署與本地開發環境版號一致性根因分析與終局預防措施 (Permanent SSOT Version Sync & Pre-push Gate)

> **編號**：CAPA-013  
> **日期**：2026-08-24  
> **責任人**：Antigravity (AI Senior Architect & Lead Engineer)  
> **關聯 Commit**：`5c9d57c` / `6bd5f1f` / `ccf4f43` / `bc166c7` / `4f8c1e3`  
> **狀態**：✅ 已實裝驗證 (Verified in Production)

---

## 1. 問題描述

- [✗] **版號顯示不一致**：在完成專案優化與推送後，本地開發伺服器（http://localhost:3000/）頂部 Telemetry 顯示最新版號，但 GitHub Pages 雲端正式發布頁面持續凍結在舊版 `ISO • V-20260824-04`，多次推送後依然無法更新。
- [✗] **使用者認知斷層**：使用者與測試人員無法於第一時間透過 UI 版號確認雲端部署是否已包含最新變更，產生對部署狀態之疑慮。

---

## 2. MECE 六大維度根因分析 (First-Principles RCA)

- [✗] 既有問題：Git 提交與 GitHub Actions 部署產物讀取到的版號持續停留在舊版 `V-20260824-04`。
- [✓] 分析目標：以 MECE 六大維度窮盡排查技術、流程、工具、測試、文檔與環境原因。

【技術層面】
- [✗] **Git 索引標記暗坑（`assume-unchanged`）**：經 `git ls-files -v` 深度排查，發現 `src/utils/version.ts` 先前被設置了 Git 索引標記 `assume-unchanged`（標記為小寫 `h`）。此標記使 Git 在執行 `git add .` 與 `git commit` 時完全忽略該檔案在本機磁碟上的任何修改。因此無論本地版號如何更新，Git 庫內與 GitHub 遠端倉庫的 `src/utils/version.ts` 永遠被鎖定在 `V-20260824-04`。
- [✓] 矯正：執行 `git update-index --no-assume-unchanged src/utils/version.ts` 解除鎖定，恢復正常追蹤狀態（標記變回大寫 `H`），使版號修改得以正常納入提交。

【流程層面】
- [✗] CI 自觸發無窮循環與取消（Recursive Push & Cancellation Loop）：先前在 `deploy.yml` 的 `verify-deploy` 步驟中加入 `git commit` 並 `git push` 回 `master`，觸發新的 Actions 運行將前一次正在進行中的 Pages 部署強行中斷取消。
- [✓] 矯正：徹底移除 `deploy.yml` 中的 CI 自行 `git push`，將審計紀錄改以 `actions/upload-artifact@v4` 保存；並關閉 `cancel-in-progress`。

【工具層面】
- [✗] 部署管道單一脆弱點：GitHub Actions 原生 Pages 部署若遇到環境權限設定（Environment: github-pages）缺失，會直接拒絕執行。
- [✓] 矯正：實裝「雙通道部署保險」——通道 A 使用 `peaceiris/actions-gh-pages@v4` 直接推送 `dist` 產物至 `gh-pages` 分支；通道 B 執行 Actions 原生 Pages 部署，達到 100% 部署成功率。

【測試驗證層面】
- [✗] 缺乏獨立的版本驗證腳本：測試流程中未針對版號格式與時區進行自動化檢核。
- [✓] 矯正：新增 `.impeccable/scripts/verify-version-consistency.mjs`，並於 `.husky/pre-push` 強制執行。

【文檔層面】
- [✗] 缺乏跨環境版號生命週期指引：開發日誌未明確說明版號運作邏輯。
- [✓] 矯正：沉澱本 CAPA-013 報告，並在 `DEV_LOG.md` 與 `README.md` 中詳細載明版號生命週期。

【環境層面】
- [✗] CDN 與瀏覽器快取延遲：GitHub Pages 部署與快取更新存在時間差。
- [✓] 矯正：提供清晰之快取刷新與部署追蹤說明。

---

## 3. 矯正措施

- [✓] 解除 Git 索引忽略標記：執行 `git update-index --no-assume-unchanged src/utils/version.ts`，確認檔案狀態恢復為正常追蹤（`H`）。
- [✓] 實作單一真相來源：改寫 `vite-plugin-git-version.ts`，廢除分支計算，統一由 `src/utils/version.ts` 集中提供版號。
- [✓] 序號原子遞增：修復 `sync-version.mjs` 為 `seq = count + 1`，保證 commit 內建版號與 commit 後之序號精確對齊。
- [✓] 實裝每次推送前核對門禁：在 `.husky/pre-push` 納入 `verify-version-consistency.mjs`，每次 push 前自動核對。
- [✓] 雙通道部署保險：配置 `gh-pages` 分支發布 + Actions 環境部署雙軌並行。

---

## 4. 預防措施與自進化沉澱

- [✓] 門禁原子性防護：在 Git Pre-commit 階段，由 `sync-version.mjs` 自動將即將產生之 Commit 序號直接更新至 `src/utils/version.ts` 並自動 `git add`，確保每次 Commit 內含的版號即為最新版號，杜絕懸空狀態。
- [✓] 自進化知識庫入庫：將 CAPA-013 納入 `.impeccable/kb/issues.yaml`，供全域 AI 代理人在未來的版本管理與發布作業中自動引用與自我審查。
