# Karpathy Coding Guidelines — 本專案軟體工程與 AI 協同開發準則

> **文件編號**：`PMS-GUIDE-KARPATHY-2026`  
> **系統名稱**：料事如神系統 — Predictive Material System (PMS)  
> **制定依據**：Andrej Karpathy's LLM Coding Guidelines (`multica-ai/andrej-karpathy-skills`)  
> **生效範圍**：本專案全體開發者、AI Coding Agent（Antigravity、Claude Code、Cursor、Gemini CLI）  

---

## 🧭 核心精神：高信號、零猜測、最簡代碼、閉環驗證

在大語言模型 (LLM) 輔助軟體開發的實務中，模型常有「盲目假設、過度工程、副作用改壞既有代碼、缺乏驗證即交件」等致命缺陷。本專案將 Karpathy 4 大準則深度植入日常開發流程與 PDCA 閉環中：

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                        Karpathy 軟體工程 4 大核心準則 (PMS 實踐版)                     │
├───────────────────────┬───────────────────────┬───────────────────────┬───────────────┤
│ 1. 謀定而後動         │ 2. 簡潔至上           │ 3. 外科手術式精準修改 │ 4. 目標導向   │
│ (Think Before Coding) │ (Simplicity First)    │ (Surgical Changes)    │ (Goal-Driven) │
└───────────────────────┴───────────────────────┴───────────────────────┴───────────────┘
```

---

## 1. 謀定而後動 (Think Before Coding)
> **「Don't assume. Don't hide confusion. Surface tradeoffs.」**

在執行任何非瑣碎的代碼編寫前：
1. **公開陳述假設 (State Assumptions Explicitly)**：
   - 凡涉及業務邏輯（如良率折算公式、安全庫存水位）、資料關聯或非直觀行為，必須先將假設寫出或向使用者確認，嚴禁黑箱瞎猜。
2. **揭示技術權衡 (Surface Tradeoffs)**：
   - 遇到有多種實現路徑時（例如：純前端 LocalStorage vs 後端 API、即時推算 vs 緩存快照），必須清楚列出各方案之優缺點，讓決策透明化。
3. **主動提出簡化建議 (Push Back When Warranted)**：
   - 若使用者提出較複雜的設計，而存在更簡單、更低維護成本的替代方案，必須主動建言。
4. **遇邏輯矛盾立即停步 (Stop When Confused)**：
   - 發現需求衝突或邊界未定義時，立刻暫停並指明卡點，禁止強行盲寫。

---

## 2. 簡潔至上 (Simplicity First)
> **「Minimum code that solves the problem. Nothing speculative.」**

奧卡姆剃刀原則（若無必要，勿增實體）：
- ❌ **禁止超前編寫未被要求的功能**。
- ❌ **禁止為單次使用的代碼隨意抽取多餘的抽象層或工廠類別**。
- ❌ **禁止預留無具體需求的「假彈性」與「過度配置化」**。
- ❌ **禁止為理論上不可能發生的極端情況撰寫冗贅的防禦代碼**。
- ✅ **若 200 行代碼能以 50 行更清晰地實現，必須果斷重寫精簡**。

> **自省標準**：資深架構師審查這段代碼時，是否會覺得這是在「殺雞用牛刀」？若是，立刻簡化。

---

## 3. 外科手術式精準修改 (Surgical Changes)
> **「Touch only what you must. Clean up only your own mess.」**

在對既有代碼進行增修或修復 Bug 時：
- ❌ **嚴禁順手「改進」相鄰無關的代碼、註解或格式**（避免引入未預期的 Regression 或造成 Git Diff 混亂）。
- ❌ **嚴禁重構運作正常的無關模組**。
- ✅ **嚴格匹配既有項目的架構風格與命名慣例**。
- 🔍 **若在修改過程中發現了無關的歷史廢棄代碼 (Dead Code)，提出備註但切勿擅自刪除**。
- 🧹 **因本次修改而產生的無效 Import、孤兒變數或未調用函式，必須在當次變更中清理乾淨**。

> **自省標準**：本次 Commit 中的每一行 Diff，是否都能 $100\%$ 直接追溯回當前的需求目標？

---

## 4. 目標導向與閉環驗證 (Goal-Driven Execution)
> **「Define success criteria. Loop until verified.」**

拒絕「寫完就交差、未經驗證的半成品」：
- 將任何實作任務拆解為具備清晰檢查點的步驟：
  ```
  步驟 1: [實作模組] → 驗證: [具體檢查指令 / 預期結果]
  步驟 2: [整合介面] → 驗證: [Console 無錯誤 / UI 正確呈現]
  步驟 3: [端到端測試] → 驗證: [npm run build 成功 / 數值運算 100% 精確]
  ```
- **建立堅固的驗收標準 (Strong Definition of Done, DoD)**：只有通過型別檢查、單元測試或實際運行確認無誤後，方可宣告完成。

---

## 5. 本專案各開發環境生效機制配置 (Ecosystem Integration)

本專案已完成跨環境的全面配置，無論使用何種 AI 工具皆會強制遵守上述準則：

| 平台 / 工具 | 設定檔位置 | 作用機制 |
| :--- | :--- | :--- |
| **Antigravity / Gemini CLI** | `.agents/skills/karpathy-guidelines/SKILL.md`<br>`.agents/rules/karpathy-guidelines.md`<br>`GEMINI.md` / `AGENTS.md` | 本地 Workspace Skill 與全域 Rule 自動加載 |
| **Claude Code** | `CLAUDE.md` (專案根目錄) | 專案級行為準則與對話約定 |
| **Cursor IDE** | `.cursor/rules/karpathy-guidelines.mdc` | 檔案編輯與 Composer 對話自動強制匹配 |
| **專案文檔庫** | `docs/Karpathy_Coding_Guidelines.md` | 團隊與全端架構之標準工程規範 |
