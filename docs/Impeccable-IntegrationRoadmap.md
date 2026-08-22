# 整合實施技術路線圖
## PMS × impeccable UI/UX 整合階段規劃

| 文件編號 | DOC-ROADMAP-003 |
| 版本 | v1.0 |
| 日期 | 2026-08-22 |

---

## 一、整體時間架構

```
Phase 1          Phase 2           Phase 3           Phase 4           Phase 5
Week 1           Week 2-3          Week 4            Week 5            Week 6
Setup &          Semantic Parser   Integration       Validation        Production
Config           Module Build      & Hook Wiring     & Edge Cases      Deployment
```

---

## 二、各階段詳細規劃

### Phase 1：環境準備與配置（Week 1）

#### 2.1.1 目標
完成 impeccable 在 PMS 專案中的基礎安裝與設計上下文配置。

#### 2.1.2 交付物

| # | 交付物 | 驗收標準 |
|---|--------|---------|
| 1.1 | `.impeccable/config.json` | 團隊共享配置存在，buildPath = "code" |
| 1.2 | `.impeccable/design.json` | 包含 PMS 品牌色板（Cobalt #0284C7, Cyan #06B6D4）|
| 1.3 | `docs/DESIGN.md` | 從 PMS 現況生成，包含 Color, Type, Component 章節 |
| 1.4 | `.gitignore` 更新 | 包含 impeccable ephemeral 排除規則 |
| 1.5 | `scripts/impeccable-init.mjs` | 一次性啟動腳本，整合 npx impeccable install |

#### 2.1.3 風險預案

| 風險 | 可能性 | 影響 | 預案 |
|------|--------|------|------|
| npm registry 阻擋 | 中 | Phase 1 無法完成 | 改用 git submodule 方式引入（Option 2） |
| Tailwind v4 class 掃描偏移 | 高 | detector 誤判率上升 | 配置 `detector.ignorePatterns` 排除已驗證的安全 class |
| 雙主題 CSS override 誤判 | 高 | `low-contrast` 規則大量 false positive | 在 config.json 中預先標記 `html:not(.dark)` 區段為已知模式 |

#### 2.1.4 量化驗收標準
- [ ] `npx impeccable audit src/components/` 可正常執行並輸出報告
- [ ] 檢測到的規則命中率 > 85%（排除已知 false positive）
- [ ] `.impeccable/design.json` 包含 ≥ 10 個 PMS 自訂 color token

---

### Phase 2：語意解析模塊開發（Week 2–3）
> ⚠️ **已取消**：2026-08-22 盤點確認 `src/semantic-parser/` 模組未被任何生產程式碼 import，判定為死碼，已整體移除。本節留作規劃記錄備查。

#### 2.2.1 目標
完成 `src/semantic-parser/` 模組，支援自然語言指令 → impeccable CLI 命令的轉譯。

#### 2.2.2 交付物

| # | 交付物 | 說明 |
|---|--------|------|
| 2.1 | `src/semantic-parser/IntentClassifier.ts` | 關鍵字→意圖映射 + 模糊匹配（置信度評分） |
| 2.2 | `src/semantic-parser/EntityExtractor.ts` | 自然語言→目標檔案路徑映射 |
| 2.3 | `src/semantic-parser/ErrorValidator.ts` | 安全校驗 + 錯誤回退 |
| 2.4 | `src/semantic-parser/ParamMapper.ts` | CLI 參數組合器（含 --focus/--exclude/--shallow 等） |
| 2.5 | `src/semantic-parser/types.ts` | 完整類型定義（Intent, Entity, ParsedCommand） |
| 2.6 | `src/semantic-parser/__tests__/semantic-parser.test.ts` | 25 個測試用例，≥ 99% 通過率 |
| 2.7 | `src/semantic-parser/index.ts` | 對外統一匯出介面 |

#### 2.2.3 核心演算法

```typescript
// IntentClassifier 決策樹
function classifyIntent(input: string): IntentResult {
  // Step 1: 精確關鍵字匹配（O(1) lookup）
  const exact = KEYWORD_MAP.find(k => input.includes(k.keyword))
  if (exact) return { intent: exact.intent, confidence: 1.0 }

  // Step 2: 模糊匹配（編輯距離 ≤ 2）
  const fuzzy = FUZZY_KEYWORDS.filter(k => levenshteinDistance(input, k.pattern) <= 2)
  if (fuzzy.length > 0) return { intent: fuzzy[0].intent, confidence: 0.75 }

  // Step 3: 回退到目标實體偵測
  const entity = extractTargetEntity(input)
  if (entity) return { intent: 'AUDIT', confidence: 0.6, fallback: true }

  return { intent: 'UNKNOWN', confidence: 0.0 }
}
```

#### 2.2.4 風險預案

| 風險 | 可能性 | 影響 | 預案 |
|------|--------|------|------|
| 中文語意解析準確率低 | 中 | 部分指令無法正確轉譯 | 優先支援中英混合模式，純中文指令需含至少 1 個英文關鍵字 |
| CLI spawn 在 Windows 路徑含空白 | 高 | 執行失敗 | 使用 `cross-spawn` 並對路徑加引號處理 |
| impeccable 版本與 PMS 不兼容 | 低 | 部分命令行為偏移 | pin `src/extensions/impeccable/package.json` 到特定 commit |

#### 2.2.5 量化驗收標準
- [ ] 25 個模擬測試用例通過率 ≥ 99%
- [ ] TypeScript 編譯零錯誤
- [ ] `parseAndExecute("幫我看一下側邊欄")` → 正確觸發 `audit Sidebar`
- [ ] `parseAndExecute("unknown command")` → 正確返回幫助訊息

---

### Phase 3：Hook 整合與數據流打通（Week 4）

#### 2.3.1 目標
建立 Trae IDE 兼容的 hook 入口，實現編輯時的即時 UI 質量反饋。

#### 2.3.2 交付物

| # | 交付物 | 說明 |
|---|--------|------|
| 3.1 | `.trae/hooks.json` | Trae IDE hook _manifest_，定義 preToolUse/postToolUse |
| 3.2 | `scripts/impeccable-hook.mjs` | Hook 執行腳本，讀取 stdin JSON event |
| 3.3 | `scripts/impeccable-semantics.mjs` | 語意解析模組的 CLI 包裝層 |
| 3.4 | `.impeccable/hooks/onboarded` | 已註冊 hook 的狀態標記 |

#### 2.3.3 數據流全鏈路

```
Trae IDE 編輯 UI 檔案
    │
    ▼
[preToolUse hook] → impeccable-hook.mjs
    │
    ├─→ 讀取 proposed content
    ├─→ 構建 projected file
    └─→ 執行 IMMEDIATE_TIER（14 條快速規則）
         │
         ├─→ 發現問題 → 返回警告訊息（不攔截寫入）
         └─→ 無問題   → 放行寫入
    │
    ▼
[Stop event] → impeccable-hook.mjs
    │
    ├─→ 收集會話中所有觸及的 UI 檔案（≤ 20 個）
    ├─→ 執行全量 59 條 detector
    └─→ 生成報告 → 注入到會話 context
         │
         ▼
    開發者看到 UI 品質報告
    （包含：問題列表、修正建議、置信度）
```

#### 2.3.4 風險預案

| 風險 | 可能性 | 影響 | 預案 |
|------|--------|------|------|
| Trae hook 格式與 Claude/Cursor 不兼容 | 高 | hook 無法觸發 | 使用通用 `postToolUse` 格式，並提供 CLI 手動觸發作為備用 |
| Hook 超時（>5s）被 IDE 強制終止 | 中 | 深層檢查無法完成 | `preToolUse` 僅執行 IMMEDIATE_TIER（14 條），全量移至 Stop 深層 |
| Windows 路徑分隔符導致規則匹配失敗 | 中 | false negative | 統一轉換為 POSIX 格式路徑後再傳入 detector |

#### 2.3.5 量化驗收標準
- [ ] 編輯 `Sidebar.tsx` 後，hook 在 3 秒內返回結果
- [ ] 寫入包含 `low-contrast` 問題的程式碼時，收到明確警告
- [ ] Stop 事件時可執行全量 59 條規則檢查
- [ ] Hook 執行零崩潰（crash-free）

---

### Phase 4：全功能測試與邊緣場景驗證（Week 5）

#### 2.4.1 測試矩陣

| 測試維度 | 測試範圍 | 驗收標準 |
|----------|---------|---------|
| ~~**單元測試**~~ | ~~semantic-parser 25 用例~~ | ~~≥ 99% 通過~~ ⚠️ 已取消（模組移除） |
| **集成測試** | Hook 觸發 → 結果回傳 | 100% 正常 |
| **跨瀏覽器** | Chrome / Edge / Firefox | 無樣式異常 |
| **跨裝置** | 1920px / 1366px / 768px / 375px | 無水平滾動/溢出 |
| **無障礙** | WCAG AA 對比度 / Keyboard nav | 符合標準 |
| **邊緣場景** | 空專案 / 無設計上下文 / CLI 缺失 | 優雅失敗 + 清晰錯誤訊息 |

#### 2.4.2 邊緣場景清單

| # | 場景 | 預期行為 |
|---|------|---------|
| E-01 | 專案根目錄無 `.impeccable/config.json` | 提示執行 `npx impeccable init`，不崩潰 |
| E-02 | `npx impeccable` 未安裝 | 提示安裝指令，不卡死 |
| E-03 | 使用者輸入完全無意義的文字 | 返回幫助訊息 + 可用命令列表 |
| E-04 | 目標檔案不存在 | 返回可用檔案列表 |
| E-05 | 同一會話中連續執行多個指令 | 各自獨立執行，結果不互相干擾 |
| E-06 | WebStorm / VSCode / Trae 多 IDE 切換 | hook 配置不因 IDE 而異 |

#### 2.4.3 風險預案

| 風險 | 可能性 | 影響 | 預案 |
|------|--------|------|------|
| PMS 現有設計規範與 impeccable 規則衝突 | 高 | 大量 advisory 噪音 | 在 `.impeccable/config.json` 中預先 ignore 已知 PMS 特定模式 |
| 59 條規則對 PMS 過度嚴格 | 中 | 開發效率下降 | 啟動 `impeccable hooks off` 作為緊急停止按鈕 |
| 整合後 build size 增加 | 低 | 首次載入慢 | impeccable 為外部依賴，不打包進 SPA bundle |

#### 2.4.4 量化驗收標準
- [ ] Phase 1~3 所有交付物測試通過
- [ ] 6 個邊緣場景全部優雅處理
- [ ] build size 增加 < 1MB（外部依賴不計入）
- [ ] CI/CD pipeline 不因新增整合而失敗

---

### Phase 5：生產部署與文檔化（Week 6）

#### 2.5.1 交付物

| # | 交付物 | 說明 |
|---|--------|------|
| 5.1 | `docs/ImpeccableIntegrationGuide.md` | 完整的使用者指南 |
| 5.2 | `scripts/impeccable-detach.mjs` | 單一步驟解耦腳本 |
| 5.3 | `package.json` scripts 更新 | `impeccable:init`, `impeccable:audit`, `impeccable:detach` |
| 5.4 | README.md 更新 | 新增 Impeccable 整合段落 |

#### 2.5.2 量化驗收標準
- [ ] 新成員可透過 README 步驟在 15 分鐘內完成整合
- [ ] `npm run impeccable:detach` 可無痕跡移除所有整合痕跡
- [ ] GitHub Pages 部署正常，不影響現有功能

---

## 三、總體風險矩陣

| 風險類別 | 風險描述 | 機率 | 影響 | 緩解措施 |
|----------|---------|------|------|---------|
| 兼容性 | Tailwind v4 class 掃描策略偏移 | 🔴 高 | 🔴 高 | 建立白名單機制 + 自訂 detector 適配 |
| 架構 | 雙主題 CSS override 造成誤判 | 🔴 高 | 🟡 中 | Phase 1 預先配置 ignore 規則 |
| 穩定性 | Hook 超時導致 IDE 反應遲緩 | 🟡 中 | 🟡 中 | IMMEDIATE_TIER 限定 5 秒內完成 |
| 維護 | impeccable 版本更新破壞整合 | 🟡 中 | 🟡 中 | pin 版本 + 定期 update 腳本 |
| 安全 | 第三方 npm 包注入風險 | 🟢 低 | 🔴 高 | 僅使用 `npx` 運行，不引入到 project dependency |
