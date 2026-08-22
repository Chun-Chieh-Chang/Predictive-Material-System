# Definition of Done（DoD）— 料事如神系統

> ⚠️ **此文件為規範說明**。實際強制執行由 `.impeccable/scripts/do-d-check.mjs`（pre-push hook）實現。
> 任何開發任務的「完成」必須同時滿足以下五項，缺一不可。

---

## DoD 條件

| # | 條件 | 驗證方式 | 工具 | 狀態 |
|---|------|----------|------|------|
| 1 | 程式碼提交至主分支 | `git rev-parse --abbrev-ref HEAD` = `master` | do-d-check.mjs | ✅ 程式化 |
| 2 | 通過 TypeScript 編譯 | `npx tsc --noEmit` exit 0 | do-d-check.mjs / pre-commit | ✅ 程式化 |
| 3 | 通過 Build | `npm run build` exit 0 | do-d-check.mjs / pre-push | ✅ 程式化 |
| 4 | GitHub Actions 處理所有待推送 commits | pre-push 確認 commits 將被 CI 執行 | deploy.yml quality-gate | ✅ 程式化 |
| 5 | 相關報告已更新並包含 commit hash | docs/CAPA-*.md 與 recent commits 關聯 | do-d-check.mjs | ✅ 程式化 |

---

## 「完成」的正式定義

```
任務完成 = 同時滿足 DoD-1 + DoD-2 + DoD-3 + DoD-4 + DoD-5
        = git push origin master（pre-push hook 全部通過）
        = GitHub Actions quality-gate 通過
        = deploy.yml verify-deploy job 通過
```

**單一條件不足以為「完成」**：
- ❌ commit 但未 push → 未完成（DoD-4 未滿足）
- ❌ push 但未通過 CI → 未完成（Actions 可能 fail）
- ❌ CI 通過但 URL 返回非 200 → 未完成（verify-deploy fail）
- ❌ 程式碼完成但無對應 CAPA 報告 → 未完成（DoD-5 未滿足）

---

## 禁止使用的表述

| 禁用 | 原因 |
|------|------|
| 「已完成」| 未附 commit hash 或 Actions URL |
| 「已實施」| 未區分「計畫書面」vs「程式碼實作」vs「上線可用」 |
| 「推送成功」| git push exit 0 ≠ URL 200 ≠ Actions success |

---

## 正確表述範例

```
✅ CA-01 已完成（commit: abc1234，Actions: https://github.com/.../actions/runs/...）
✅ PA-01 程式碼已提交（commit: def5678），待首次成功部署後確認 verify-deploy 通過
❌ PA-02 已實施（未提供 commit hash，未確認 Actions conclusion）
```

---

*規範版本：v2.0 · 生效日期：2026-08-22 · 關聯 CAPA：CAPA-008*
