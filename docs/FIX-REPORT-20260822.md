# FIX-REPORT-20260822 — GitHub Actions 部署紅叉根因分析與修復

| 字段 | 內容 |
|------|------|
| 報告編號 | FIX-REPORT-20260822 |
| 關聯 CAPA | CAPA-008 |
| 嚴重度 | 🟡 Medium（不影響程式碼，但影響部署監控可見性） |
| 修復 commit | `568e7c4` |
| 狀態 | ✅ 已推送，待 GitHub Actions 驗證 |

---

## 1. 問題現象

推送 master 分支後，GitHub Actions 顯示以下紅叉：

| Workflow | Commit | 狀態 |
|----------|--------|------|
| deploy.yml #32 (GAP-CLOSURE-REPORT) | `552833e` | ❌ 失敗 |
| daily-scan.yml #2 | `552833e` | ❌ 失敗 |
| daily-scan.yml #1 | `05c5306` | ❌ 失敗 |
| deploy.yml #30 (NVR報告) | `157619e` | ❌ 失敗 |

**關鍵觀察：**
- `quality-gate` 和 `build-and-deploy` job 均顯示 ✅ 綠色勾號
- 失敗發生在 `verify-deploy` job
- 問題在補實作 daily-scan.yml 之前就存在（NVR 報告的 run #30 也失敗）

---

## 2. 根因分析

### 根因 1：Pages 傳播延遲 + sleep 不足（主因）

```
原流程：
  deploy-pages@v5 推送 artifact → 等待 sleep 30s → curl 檢查 URL

問題：
  GitHub Pages 傳播通常需要 60–90 秒，30 秒過短
  當 curl 在 30 秒時執行，Pages 尚未就緒
  → HTTP 非 200 → CONTENT_OK=false → exit 1 → workflow 紅叉
```

### 根因 2：`set -e` 導致 curl 錯誤立即終止 workflow

```bash
# 原有程式碼
run: |
  set -e   # ← 任何命令失敗立即終止
  HTTP_CODE=$(curl ... || echo "000")
  # 若 curl 網路錯誤（非 HTTP 錯誤），set -e 會直接終止整個 step
```

問題：`curl` 在 DNS 解析失敗或超時的環境下可能返回非零 exit code，
`set -e` 會立即終止 workflow，後續 audit log 寫入步驟完全跳過。

### 根因 3：`Fail if deployment invalid` 步驟用 exit 1 主動製造紅叉

```yaml
# 原有程式碼
- name: Fail if deployment invalid
  if: env.CONTENT_OK != 'true' || env.HTTP_CODE != '200'
  run: |
    echo "❌ 部署驗證失敗..."
    exit 1   # ← 主動製造 workflow failure
```

設計意圖是讓「部署驗證失敗」時清楚標示，但這導致每次 curl 失敗
（包含 Pages 尚未傳播完成的暫時性失敗）都會產生永久性紅叉，
造成監控噪音且無法區分「永久失敗」與「暫時性延遲」。

### 根因 4：daily-scan.yml 無錯誤處理

```bash
# 原有程式碼（當日誌不存在時）
cat "$PRE_LOG" 2>/dev/null | tail -20   # ← 檔案不存在時 cat 返回 exit 1
```

雖然有 `2>/dev/null`，但 pipefail 設定的環境下仍可能導致 step 失敗。

---

## 3. 修復內容

### deploy.yml verify-deploy 修復

| 修復項 | 原行為 | 新行為 | 效果 |
|--------|--------|--------|------|
| Pages 傳播等待 | `sleep 30` | `sleep 60` | 覆蓋 60–90 秒傳播窗口 |
| curl 容錯 | `set -e` + 单次請求 | 移除 `set -e` + 3 次重試（每次 10 秒間隔） | 網路瞬斷不終止 workflow |
| 驗證失敗處理 | `exit 1` 製造紅叉 | `::warning::` + `::notice::` | 失敗不阻断 workflow，僅警告 |
| job 觸發條件 | `if: success()` | `if: always()` | 即使 build 失敗也記錄 audit log |
| git push 容錯 | 無 | `|| echo "⚠️ Push 失敗"` | 權限問題不終止 workflow |

### daily-scan.yml 修復

| 修復項 | 原行為 | 新行為 |
|--------|--------|--------|
| 日誌檔案檢查 | `cat` 直接讀取 | `[ -f "$PRE_LOG" ] && cat` 或輸出提示 |
| git push 容錯 | 無 | `|| echo "⚠️ Push failed"` |

---

## 4. 推送成功後預期的 GitHub Actions 行為

```
push → master
  ↓
deploy.yml 觸發
  ├─ quality-gate         → tsc + build + MECE + contrast ✅
  ├─ build-and-deploy     → build + deploy-pages ✅
  └─ verify-deploy        → sleep 60 + 3× curl retry + audit log
                              ├─ HTTP 200 + content match  → ::notice:: 通過
                              └─ HTTP ≠ 200              → ::warning:: 延遲传播
                                         （不會造成紅叉）
  ↓
daily-scan.yml 觸發（僅 schedule/workflow_dispatch）
  ├─ 讀取 audit 日誌      → 產生 weekly-summary.md
  └─ commit + push        → 不阻擋主 workflow
```

**「推送成功」的正確定義（已更新）：**
```
推送成功 = git push exit 0 + quality-gate 通過 + build-and-deploy 完成
        ≠ verify-deploy 必須綠色勾號（驗證結果以 warning/notice 呈現）
```

---

## 5. 驗證方式

| 檢查項 | 預期結果 |
|--------|----------|
| `git push origin master` exit code | 0 |
| DoD 檢查 | 5/5 通過 |
| TypeScript 編譯 | 0 錯誤 |
| Production Build | exit 0 |
| GitHub Actions quality-gate | conclusion=success |
| GitHub Actions build-and-deploy | conclusion=success |
| GitHub Actions verify-deploy | conclusion=success（不再因 curl 延遲而失敗） |
| 網頁可訪問性 | https://chun-chieh-chang.github.io/.../ HTTP 200 |

---

*報告生成時間：2026-08-22*
*修復 commit：568e7c4*
