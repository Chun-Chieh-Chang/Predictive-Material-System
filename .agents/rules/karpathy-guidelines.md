# Karpathy Coding Guidelines (LLM 軟體工程核心準則)

> 源自 **Andrej Karpathy** 對大語言模型 (LLM) 輔助程式設計常見缺陷的觀察與反思。
> **核心權衡 (Tradeoff)**：寧可謹慎確保代碼品質，絕不過度工程與盲目猜測。非瑣碎任務嚴格遵守，微小任務靈活判斷。

---

## 1. 謀定而後動 (Think Before Coding)
**不要盲目假設。不要隱瞞困惑。主動揭示權衡 (Tradeoffs)。**
- 明確陳述假設 (State assumptions explicitly)：凡有不確定之處，主動詢問釐清，切勿猜測。
- 呈現多元詮釋 (Present multiple interpretations)：若需求存在歧義，提出不同理解方案，禁止暗自選擇一種。
- 主動提出異議 (Push back when warranted)：若存在更簡單、更優雅的解法，主動建言並指出優缺點。
- 遇困惑立即停步 (Stop when confused)：清楚指出卡點或邏輯矛盾，向使用者請求進一步澄清。

---

## 2. 簡潔至上 (Simplicity First)
**以最精簡、最直觀的代碼解決問題。拒絕任何投機性設計 (Nothing speculative)。**
- 不寫未被要求的額外功能 (No unrequested features)。
- 單次使用的代碼不隨意抽取抽象層 (No abstractions for single-use code)。
- 拒絕無需求的「彈性」與「高度可配置性」 (No unrequested flexibility/configurability)。
- 不為不可能發生的極端場景編寫冗贅的防禦處理 (No error handling for impossible scenarios)。
- 如果 200 行能寫成 50 行，務必重寫精簡 (If 200 lines could be 50, rewrite it)。
- **自問**：「資深架構師看到這段代碼，會不會覺得過度複雜了？」若是，立刻簡化！

---

## 3. 外科手術式精準修改 (Surgical Changes)
**僅碰觸必要部分。只清理自己製造的變更 (Touch only what you must. Clean up only your own mess)。**
- 絕不順手「改進」周圍無關的代碼、註解或排版 (Don't "improve" adjacent code/comments/formatting)。
- 絕不重構運作正常的無關模組 (Don't refactor things that aren't broken)。
- 嚴格匹配既有代碼風格 (Match existing style)，即使個人偏好不同。
- 若發現既有的未調用無效代碼 (Dead code)，向使用者提及，切勿擅自刪除。
- 自身變更產生的孤兒變數/引入/函式，必須在當次變更中清理乾淨。
- **自問**：「此 PR 中的每一行變更，能否 100% 直溯回使用者的具體需求？」

---

## 4. 目標導向與閉環驗證 (Goal-Driven Execution)
**先定義成功指標。以驗證迴圈推動直到目標達成 (Define success criteria. Loop until verified)。**
- 多步驟任務明確擬定驗證路徑：
  `1. [步驟一] → 驗證: [具體檢查項目/指令]`
  `2. [步驟二] → 驗證: [具體檢查項目/指令]`
  `3. [步驟三] → 驗證: [具體檢查項目/指令]`
- 建立堅固的驗收條件 (Strong success criteria)，自主循環驗證與修正，確保交付品質。
