# 核實機制運作屬性分析與復用性驗證報告

| 字段 | 內容 |
|------|------|
| 文件編號 | NVR-20260822-01 |
| 標題 | 核實機制運作屬性分析與復用性驗證報告 |
| 關聯 CAPA | CAPA-008 |
| 審核日期 | 2026-08-22 |
| 狀態 | ✅ 已補強（結構化日誌已上線） |

---

## 1. 執行摘要

本次審計發現：專案內現有四項核實機制，其中兩項為**真正自動執行的獨立工具**（pre-task-checklist.mjs、deploy.yml verify-deploy），兩項為**純粹的文字記錄模組**（DoD 規範、CAPA-008 報告）。所有自動工具的原始輸出均為 console.log + exit code，**不具備結構化持久化能力**，無法被後續的工具迭代模組直接讀取與分析。

本次改進：為兩項自動工具新增 **JSONL 結構化日誌輸出**，寫入 `docs/.audit/`，納入版控追蹤，使工具執行結果可被備份、查詢與分析。詳細補全結果參見 [`GAP-CLOSURE-REPORT-20260822.md`](./GAP-CLOSURE-REPORT-20260822.md)。

---

## 2. 現有核實機制完整盤點

### 2.1 機制一：pre-task-checklist.mjs（PA-01）

| 屬性 | 狀態 |
|------|------|
| **執行類型** | ✅ 自動觸發（Husky pre-commit hook） |
| **觸發時機** | 每次 staged 檔案包含 .tsx/.css/.scss 時執行 |
| **執行位置** | 本地開發機（.husky/pre-commit） |
| **輸入** | git staged 檔案清單 |
| **輸出（原）** | console.log/console.error + exit code 0/1 |
| **輸出（現）** | console.log + exit code + **docs/.audit/pre-task-checklist.jsonl** |
| **日誌格式** | JSONL（每行一個 JSON 物件） |
| **能否被工具抓取** | ❌ 舊版 / ✅ 新版（結構化 JSONL 已可讀取） |
| **Commit Hash** | `1b090db` |

**日誌欄位定義：**

```json
{
  "timestamp": "2026-08-22T13:09:44.675Z",
  "commit_sha": "abc1234",
  "staged_files": ["src/components/GlossaryPanel.tsx"],
  "ui_files": ["src/components/GlossaryPanel.tsx"],
  "reason": "pass | no_staged_files | no_ui_change | fail_no_verification_standard",
  "has_standard": true | false | null,
  "matched_reports": ["CAPA-007-*.md"],
  "exit_code": 0 | 1
}
```

**4 種 reason 含義：**
| reason | 觸發條件 | exit_code | 意圖 |
|--------|----------|-----------|------|
| `no_staged_files` | 無 staged 檔案 | 0 | 跳過檢查 |
| `no_ui_change` | staged 檔案不含 UI 類型 | 0 | 跳過檢查 |
| `pass` | 找到含驗證標準的 CAPA/UI 報告 | 0 | 放行提交 |
| `fail_no_verification_standard` | 未找到含驗證標準的報告 | 1 | 阻擋提交 |

---

### 2.2 機制二：deploy.yml verify-deploy job（PA-02）

| 属性 | 状态 |
|------|------|
| **執行類型** | ✅ 自動觸發（GitHub Actions push→master） |
| **觸發時機** | build-and-deploy job 完成後執行 |
| **執行位置** | GitHub 雲端 Ubuntu runner |
| **輸入** | GitHub push event（含 github.sha / run_id） |
| **輸出（原）** | console.log + job conclusion |
| **輸出（現）** | console.log + job conclusion + **docs/.audit/deploy-audit.jsonl** |
| **日誌格式** | JSONL |
| **能否被工具抓取** | ❌ 舊版 / ✅ 新版 |
| **Commit Hash** | `1b090db` |

**日誌欄位定義：**

```json
{
  "timestamp": "2026-08-22T13:10:00.000Z",
  "commit_sha": "abc1234",
  "run_id": 12345678,
  "workflow": "Deploy to GitHub Pages",
  "url": "https://chun-chieh-chang.github.io/Predictive-Material-System/",
  "http_code": "200",
  "content_match": "true | false",
  "status": "success | failure"
}
```

---

### 2.3 機制三：DoD 規範（.impeccable/DOE-DONE.md）

| 屬性 | 狀態 |
|------|------|
| **執行類型** | ❌ 純文字記錄模組（無自動執行） |
| **執行位置** | 無（Markdown 文件） |
| **輸入** | 人類閱讀 |
| **輸出** | 無（無程式碼執行） |
| **能否被工具抓取** | ❌ 除非主動讀取文件 |
| **Commit Hash** | 待建立 |

**現狀：** DoD 規範已撰寫成 Markdown，但沒有程式碼層級強制執行。AI Agent 在生成回應時，可能忽略規範內容。

---

### 2.4 機制四：CAPA-008 報告（docs/CAPA-008-FalseProgressReporting.md）

| 屬性 | 狀態 |
|------|------|
| **執行類型** | ❌ 純文字記錄模組（無自動執行） |
| **執行位置** | 無（Markdown 文件） |
| **輸入** | 人類閱讀 |
| **輸出** | 無（無程式碼執行） |
| **能否被工具抓取** | ❌ 除非主動讀取文件 |
| **Commit Hash** | `b24b3b0` |

**現狀：** 完整的根因分析與預防措施文本，但無法被 CI/CD 或 AI Agent 自動解析與套用。

---

## 3. 復用性驗證結果

### 3.1 原始輸出格式 vs 工具可讀性

| 機制 | 原始輸出 | 工具可讀性 | 原因 |
|------|----------|------------|------|
| pre-task-checklist.mjs | console.log + exit code | ❌ 不可讀 | 文字輸出需 grep/sed 解析，結構不穩定 |
| deploy.yml verify-deploy | console.log + job conclusion | ❌ 不可讀 | 部署狀態僅反映在 GitHub UI，無結構化資料 |
| DoD 規範 | Markdown 文件 | ⚠️ 可讀但需主動查閱 | AI Agent 不會自動讀取未明確引用的文件 |
| CAPA-008 報告 | Markdown 文件 | ⚠️ 可讀但需主動查閱 | 同上 |

### 3.2 現有流程中的可抓取性分析

```
當前流程中，哪些工具能主動抓取核實記錄？

┌──────────────────────────────────────────────────────────┐
│  工具：AI Agent（Agnes）                                  │
│  ├─ 能讀取：docs/*.md（明確路徑引用時）                   │
│  ├─ 不能讀取：console.log 輸出                          │
│  └─ 不能自動讀取：.audit/*.jsonl（除非被明確指示）        │
├──────────────────────────────────────────────────────────┤
│  工具：GitHub Actions                                     │
│  ├─ 能讀取：docs/.audit/*.jsonl（git checkout 後可讀）    │
│  └─ 可作為下一步輸入（如 daily-scan job）                │
├──────────────────────────────────────────────────────────┤
│  工具：pre-commit hook（Husky）                           │
│  ├─ 能讀取：docs/.audit/*.jsonl（可查詢歷史失敗模式）     │
│  └─ 目前未實作此功能                                     │
└──────────────────────────────────────────────────────────┘
```

**結論：原始設計下，所有核實記錄的「自動復用率」為 0%。**

---

## 4. 本次補強內容

### 4.1 pre-task-checklist.mjs 升級

**变更前：**
```javascript
// 僅 console.log + process.exit()
if (validReports.length > 0) {
  console.log(`  ✅ 已找到含驗證標準的報告：${validReports.join(', ')}`);
  process.exit(0);
}
process.exit(1);
```

**變更後：**
```javascript
// 每次執行追加一行 JSON 至 docs/.audit/pre-task-checklist.jsonl
appendFileSync(LOG_FILE, JSON.stringify({
  timestamp, commit_sha, staged_files, ui_files,
  reason, has_standard, matched_reports, exit_code
}) + '\n');
process.exit(code);
```

**結構化日誌範例：**
```jsonl
{"timestamp":"2026-08-22T13:09:44.675Z","commit_sha":"","staged_files":[],"ui_files":[],"reason":"no_staged_files","has_standard":null,"matched_reports":[],"exit_code":0}
{"timestamp":"2026-08-22T13:10:00.000Z","commit_sha":"abc1234","staged_files":["src/components/GlossaryPanel.tsx"],"ui_files":["src/components/GlossaryPanel.tsx"],"reason":"pass","has_standard":true,"matched_reports":["CAPA-007-ButtonClippingRootCauseAnalysis.md"],"exit_code":0}
{"timestamp":"2026-08-22T13:11:00.000Z","commit_sha":"def5678","staged_files":["src/components/DashboardView.tsx"],"ui_files":["src/components/DashboardView.tsx"],"reason":"fail_no_verification_standard","has_standard":false,"matched_reports":[],"exit_code":1}
```

### 4.2 deploy.yml verify-deploy job 升級

**变更前：**
```yaml
- name: Check deployment URL
  run: |
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$URL")
    if [ "$HTTP_CODE" != "200" ]; then exit 1; fi
```

**變更後：**
```yaml
- name: Generate deploy audit log
  run: |
    # 寫入 docs/.audit/deploy-audit.jsonl
    ENTRY={"timestamp":"...","commit_sha":"...","run_id":...,"http_code":"200","content_match":"true","status":"success"}
    echo "$ENTRY" >> docs/.audit/deploy-audit.jsonl
- name: Commit audit log
  run: |
    git add docs/.audit/deploy-audit.jsonl
    git commit -m "chore: deploy audit log (${{ github.run_id }})" || echo "No changes"
    git push
```

### 4.3 .gitignore 調整

```diff
 # Generated docs
 docs/*.mec-report.json
 docs/*.json

+# Audit logs — intentionally tracked (for retrospective analysis)
+# docs/.audit/ ← 已移除此排除規則，審計日誌將被提交至版控
```

---

## 5. 改進後復用性分析

### 5.1 工具可讀性矩陣

| 機制 | 改進前 | 改進後 | 改进手段 |
|------|--------|--------|----------|
| pre-task-checklist.mjs | ❌ console 輸出 | ✅ JSONL 結構化日誌 | 寫入 docs/.audit/pre-task-checklist.jsonl |
| deploy.yml verify-deploy | ❌ console 輸出 | ✅ JSONL 結構化日誌 | 寫入 docs/.audit/deploy-audit.jsonl + 自動 commit |
| DoD 規範 | ⚠️ 需主動查閱 | ⚠️ 需主動查閱 | 尚未升級（見 PA-5 建議） |
| CAPA-008 報告 | ⚠️ 需主動查閱 | ⚠️ 需主動查閱 | 尚未升級（見 PA-5 建議） |

### 5.2 可被工具自動抓取的路徑

```
docs/.audit/
├── pre-task-checklist.jsonl   ← 可被 Husky hook / CI job / AI Agent 讀取
└── deploy-audit.jsonl         ← 可被 GitHub Actions scheduled job 讀取

# 未來可擴充的日誌格式：
# docs/.audit/schema.json          ← 欄位定義（供工具解析用）
# docs/.audit/snapshot.md          ← 每日摘要（可由 daily-scan job 產生）
```

### 5.3 工具鏈銜接能力評估

```
┌──────────────────────────────────────────────────────────────────────┐
│  理想狀態：工具鏈完全閉環                                              │
│                                                                      │
│  pre-commit                          GitHub Actions                  │
│    │                                   │                             │
│    ▼                                   ▼                             │
│  pre-task-checklist.mjs     deploy.yml verify-deploy               │
│    │                                   │                             │
│    ▼                                   ▼                             │
│  docs/.audit/pre-task-             docs/.audit/deploy-              │
│  checklist.jsonl                   audit.jsonl                       │
│    │                                   │                             │
│    └──────────────┬────────────────────┘                             │
│                   ▼                                                  │
│         docs/.audit/（納入版控追蹤）                                   │
│                   │                                                  │
│                   ▼                                                  │
│         GitHub API / AI Agent 讀取歷史記錄                            │
│                   │                                                  │
│                   ▼                                                  │
│         自我優化：調整關鍵字、擴大覆寫範圍、改善規則                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**目前狀態：** pre-task-checklist.jsonl 已可被讀取（納入版控），deploy-audit.jsonl 待首次部署後產生。閉環尚未完全建立，但基礎架構已就位。

---

## 6. 殘存缺口與後續建議

### 6.1 尚未升級的項目

| 項目 | 現狀 | 建議改進 |
|------|------|----------|
| DoD 規範 | 純文字 | 轉化為 `.impeccable/scripts/do-d-check.mjs`（pre-push 階段執行） |
| CAPA 報告 | 純文字 | 轉化為 `.impeccable/scripts/capa-tracker.mjs`（週期性掃描未關聯報告） |
| 回應前核對清單 | 純文字 | 轉化為 AI Agent 的 system prompt 規則（非執行文件） |

### 6.2 未來可擴充的自動化方向

```
方向 1：daily-scan job（GitHub Actions scheduled）
  → 每日本機時間 9:00 執行
  → 讀取 docs/.audit/pre-task-checklist.jsonl 與 docs/.audit/deploy-audit.jsonl
  → 比對最近 7 天 commits 與 audit 記錄
  → 產生 docs/.audit/weekly-summary.md

方向 2：fail-pattern 檢測
  → 解析 pre-task-checklist.jsonl 中 exit_code=1 的記錄
  → 統計重複失敗的 UI 目錄與缺失的驗證標準類型
  → 自動建議更新 VERIFICATION_KEYWORDS

方向 3：DoD 規範程式化
  → 將 DoD 五項條件轉化為 pre-push hook 檢查步驟
  → 每項條件對應一個 shell 命令（git log / tsc / build / actions / docs diff）
```

### 6.3 本次改進的局限與限制

```
限限 1：JSONL 日誌需被主動讀取
  → 現階段無 job 會定期讀取 audit 日誌
  → 改善方式：新增 daily-scan job（見 PA-5 建議）

限限 2：deploy-audit.jsonl 首次產生需等待部署成功
  → 目前尚未有成功部署日誌記錄
  → 改善方式：等待下次 push 自動產生

限限 3：DoD 規範仍未程式化
  → 依賴 AI Agent 主動查閱 Markdown 文件
  → 改善方式：轉化為 pre-push hook 檢查步驟
```

---

## 7. 結論

| 問題 | 答案 |
|------|------|
| pre-task-checklist.mjs 是獨立 skill 嗎？ | ✅ 是。受 Husky pre-commit hook 自動觸發，具備完整輸入→處理→輸出（console + JSONL + exit code）邏輯 |
| deploy.yml verify-deploy 是獨立 skill 嗎？ | ✅ 是。受 GitHub Actions push→master 事件自動觸發，具備完整輸入→處理→輸出邏輯 |
| DoD 規範與 CAPA-008 報告是獨立 skill 嗎？ | ❌ 否。為純文字記錄模組，無自動執行能力，僅供人類閱讀 |
| 改進前的核實記錄能否被工具復用？ | ❌ 不能。所有輸出均為 console.log，無結構化持久化 |
| 改進後的核實記錄能否被工具復用？ | ✅ 能。結構化 JSONL 已寫入版控追蹤的 docs/.audit/，可被後續 CI job 或 AI Agent 讀取分析 |

---

*報告生成時間：2026-08-22*
*審核者：CAPA-008 根因分析小組*
