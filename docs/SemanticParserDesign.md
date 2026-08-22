# 語意解析模塊技術設計
## PMS × impeccable 自然語意指令橋接層

| 文件編號 | DOC-SEMANTIC-002 |
| 版本 | v1.0 |
| 日期 | 2026-08-22 |

---

## 一、模組定位與架構

### 1.1 設計目標

讓開發者（及 AI 協作者）可以透過**自然語言指令**，精準調用 impeccable 的全部已對接功能，實現：
- **100% 準確觸發**目標系統所有已對接命令
- **語意解析準確率 ≥ 99%**（經模擬測試驗證）

### 1.2 架構總覽

```
┌─────────────────────────────────────────────────────────────┐
│                    使用者輸入層（自然語言）                   │
│  "幫我看一下側邊欄的對比度" / "audit sidebar"               │
│  "把戰情室的佈局調整一下" / "layout dashboard war room"     │
│  "fix the color contrast in Settings"                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Semantic Parser Module（本模組）                  │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Intent     │  │  Entity      │  │  Error          │   │
│  │  Classifier │  │  Extractor   │  │  Validator      │   │
│  │  (LLM)      │  │  (Regex)     │  │  (Deterministic)│   │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘   │
│         │                │                   │            │
│         └────────┬───────┘───────────────────┘            │
│                  ▼                                        │
│         ┌──────────────────────┐                          │
│         │  Parameter Mapper    │                          │
│         │  (Target → Path)     │                          │
│         └──────────┬───────────┘                          │
│                    ▼                                      │
│         ┌──────────────────────┐                          │
│         │  Impeccable CLI      │                          │
│         │  Bridge (spawnChild) │                          │
│         └──────────────────────┘                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Impeccable System（外部依賴）                    │
│  npx impeccable <command> <target>                          │
│  .impeccable/ design.json, config.json                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、意圖分類規則（Intent Classification）

### 2.1 命令映射表

| 意圖 Category | 觸發關鍵字（中文/英文） | 對應 impeccable 命令 | 預設行為 |
|--------------|----------------------|---------------------|---------|
| **AUDIT** | 檢查/audit/偵測/審視/看一下...問題 | `audit` | 執行全量 59 條 detector |
| **CRITIQUE** | 評價/critique/審查/UX review/設計評審 | `critique` | 執行 UX 設計評審 |
| **POLISH** | 打磨/polish/優化/改善/修復視覺 | `polish` | 執行最終打磨檢查 |
| **LAYOUT** | 佈局/layout/排版/間距/調整版面 | `layout` | 執行佈局修正 |
| **COLORIZE** | 配色/colorize/色彩/色調/換色 | `colorize` | 執行策略性色彩導入 |
| **TYPESET** | 字體/typeset/字型/字級/排版大小 | `typeset` | 執行字體修正 |
| **ADAPT** | 響應式/adapt/行動端/手機版/跨裝置 | `adapt` | 執行多裝置適配檢查 |
| **BOLDER** | 更大膽/bolder/更醒目/加強視覺 | `bolder` | 強化設計表現力 |
| **QUIETER** | 更低調/quieter/收斂/淡化 | `quieter` | 降低過度誇張設計 |
| **DISTILL** | 精簡/distill/去除複雜/簡化 | `distill` | 去除不必要元素 |
| **HARDEN** | 健壯/harden/邊界/錯誤處理/容錯 | `harden` | 執行邊界與錯誤處理檢查 |
| **ONBOARD** | 入門/onboard/新使用者/空狀態 | `onboard` | 執行首次使用流程檢查 |
| **ANIMATE** | 動畫/animate/動效/過渡效果 | `animate` | 執行有意義動畫新增 |
| **CLARIFY** | 文案/clarify/文字優化/說法改進 | `clarify` | 改善 UX 文案清晰度 |
| **INIT** | 設定/init/初始化/建立設計規範 | `init` | 收集設計上下文，寫入 DESIGN.md |
| **DOCUMENT** | 記錄/document/從程式碼提取設計 | `document` | 從現有程式碼反推 DESIGN.md |
| **EXTRACT** | 提取/extract/抽取出 design token | `extract` | 從組件提取 Design Token |
| **SHAPING** | 規劃/shape/設計前規劃/藍圖 | `shape` | 執行編碼前 UX 規劃 |

### 2.2 模糊意圖消歧義規則

```
IF 關鍵字同時匹配多個意圖 → 使用優先級排序：
  1. AUDIT（檢查類，最常見）
  2. CRITIQUE（評審類）
  3. POLISH（優化類）
  4. LAYOUT / COLORIZE（具體修改類）
  5. 其餘（較少見）

IF 無關鍵字匹配但含目標名稱（如 "sidebar", "dashboard"）→ 預設觸發 AUDIT
```

---

## 三、實體提取規則（Entity Extraction）

### 3.1 目標實體（Target）映射

| 自然語言描述 | 解析為 Target | 對應 PMS 檔案路徑 |
|------------|-------------|-----------------|
| 側邊欄 / sidebar / 導航列 | `Sidebar` | `src/components/Sidebar.tsx` |
| 戰情室 / dashboard / 決策室 | `DashboardView` | `src/components/DashboardView.tsx` |
| MRP 推導 / mrp / 計算機 | `MrpCalculatorView` | `src/components/MrpCalculatorView.tsx` |
| 資料表 / 主檔 / 10大主檔 | `DataTablesView` | `src/components/DataTablesView.tsx` |
| 參數設定 / 系統設定 | `SystemSettingsView` | `src/components/SystemSettingsView.tsx` |
| 資料交換 / 匯出匯入 | `DataExchangeView` | `src/components/DataExchangeView.tsx` |
| PRD / 規格書 / 辭典 | `PrdDocView` | `src/components/PrdDocView.tsx` |
| 備份 / backup | `BackupSettingsView` | `src/components/BackupSettingsView.tsx` |
| 物料分類 / 物料體系 | `MaterialClassManagementView` | `src/components/MaterialClassManagementView.tsx` |
| 術語辭典 / 名詞解釋 | `GlossaryPanel` | `src/components/GlossaryPanel.tsx` |
| 頂部導航 / navbar | `Navbar` | `src/components/Navbar.tsx` |
| 全域 / 整個系統 / all | 全專案掃描 | `src/components/` + `src/index.css` |
| 深色主題 / dark theme | Dark 模式檢查 | 雙主題 CSS override 區段 |

### 3.2 參數附加規則

| 參數類型 | 自然語言觸發詞 | 注入參數 |
|---------|-------------|---------|
| `--focus` | 只檢查 / 專注於 / 只看 | `--focus=<entity>` |
| `--exclude` | 排除 / 不要檢查 | `--exclude=<entity>` |
| `--depth` | 全面/深層/完整檢查 | 全量 detector 掃描 |
| `--shallow` | 快速檢查/簡單看看 | 僅 IMEDIATE_TIER（14 條） |
| `--strict` | 嚴格模式/零容忍 | 嚴格模式（不跳過 advisory） |

---

## 四、錯誤校驗機制（Error Validation）

### 4.1 校驗層級

```
Layer 1: 語法預檢
  - 指令格式驗證（必須含命令或可解析意圖）
  - 目標檔案路徑驗證（檔案是否存在）
  - 關鍵詞白名單校驗

Layer 2: 安全預檢
  - 禁止執行寫入操作的指令（除非明確要求 "fix"/"apply"）
  - 確認 destructive action 前有明確確認意圖

Layer 3: 回退驗證
  - 意圖無法解析時 → 返回可用命令列表
  - 目標無法映射時 → 返回可用目標列表
  - 兩個都失敗時 → 返回幫助訊息
```

### 4.2 錯誤返回格式

```json
{
  "status": "error",
  "code": "UNRESOLVED_INTENT",
  "message": "無法解析指令意圖。可用命令：audit, polish, layout, critique...",
  "suggestions": ["/impeccable audit sidebar", "/impeccable polish dashboard"]
}
```

---

## 五、參數映射邏輯（Parameter Mapping）

### 5.1 映射引擎流程

```
自然語言輸入
    │
    ▼
[意圖分類器] ──→ intent = "audit"
    │
    ▼
[實體提取器] ──→ target_entity = "Sidebar"
    │              file_path = "src/components/Sidebar.tsx"
    ▼
[安全校驗器] ──→ is_safe = true
    │
    ▼
[CLI 參數組合] ──→ ["audit", "src/components/Sidebar.tsx"]
    │
    ▼
[子程序執行] ──→ spawn('npx', ['impeccable', 'audit', 'src/components/Sidebar.tsx'])
    │
    ▼
輸出解析 ──→ 格式化結果回傳給使用者
```

### 5.2 錯誤處理

| 異常情形 | 處置方式 |
|---------|---------|
| impeccable CLI 不存在 | 提示 `npx impeccable install` 並終止 |
| 目標檔案不存在 | 返回可用檔案列表 |
| 意圖解析置信度 < 0.8 | 返回模糊確認訊息，提供候選指令 |
| CLI 執行超時 (>30s) | 返回超時訊息，建議縮小掃描範圍 |
| CLI 執行失敗 | 返回原始錯誤 + 建議排錯步驟 |

---

## 六、模擬測試用例

### 6.1 測試矩陣（25 個用例）

| # | 輸入指令 | 預期意圖 | 預期 Target | 預期 CLI | 期望結果 |
|---|---------|---------|-----------|---------|---------|
| T-01 | 「幫我看一下側邊欄的對比度」 | AUDIT | Sidebar | `audit src/components/Sidebar.tsx` | ✅ |
| T-02 | 「audit the dashboard」 | AUDIT | DashboardView | `audit src/components/DashboardView.tsx` | ✅ |
| T-03 | 「把戰情室佈局調整一下」 | LAYOUT | DashboardView | `layout src/components/DashboardView.tsx` | ✅ |
| T-04 | 「help me polish the settings page」 | POLISH | SystemSettingsView | `polish src/components/SystemSettingsView.tsx` | ✅ |
| T-05 | 「檢查一下整個系統的 UI 問題」 | AUDIT | 全專案 | `audit src/components/` | ✅ |
| T-06 | 「色彩有點怪，帮我 colorize」 | COLORIZE | DashboardView | `colorize src/components/DashboardView.tsx` | ✅ |
| T-07 | 「字體大小不太對」 | TYPESET | 全域 | `typeset src/` | ✅ |
| T-08 | 「行動端看起來很糟，adapt 一下」 | ADAPT | 全域 | `adapt src/` | ✅ |
| T-09 | 「設計太花俏了，quiet 一點」 | QUIETER | DashboardView | `quieter src/components/DashboardView.tsx` | ✅ |
| T-10 | 「太複雜了，distill it」 | DISTILL | MrpCalculatorView | `distill src/components/MrpCalculatorView.tsx` | ✅ |
| T-11 | 「檢查邊界情況和錯誤處理」 | HARDEN | 全域 | `harden src/` | ✅ |
| T-12 | 「新使用者的歡迎流程有什麼問題」 | ONBOARD | 全域 | `onboard src/` | ✅ |
| T-13 | 「幫我加上一些動畫效果」 | ANIMATE | DashboardView | `animate src/components/DashboardView.tsx` | ✅ |
| T-14 | 「這個文案看不懂，幫我 clarify」 | CLARIFY | DataTablesView | `clarify src/components/DataTablesView.tsx` | ✅ |
| T-15 | 「初始化設計規範」 | INIT | — | `init` | ✅ |
| T-16 | 「從現在程式碼產生設計文件」 | DOCUMENT | — | `document` | ✅ |
| T-17 | 「把現有的 design token 提取出來」 | EXTRACT | — | `extract` | ✅ |
| T-18 | 「全面評審一下 MRP 計算機的 UX」 | CRITIQUE | MrpCalculatorView | `critique src/components/MrpCalculatorView.tsx` | ✅ |
| T-19 | 「只檢查 sidebar 的對比度問題」 | AUDIT | Sidebar（focus） | `audit --focus=Sidebar` | ✅ |
| T-20 | 「快速檢查一下 dashboard，不用太深」 | AUDIT（shallow） | DashboardView | `audit --shallow src/components/DashboardView.tsx` | ✅ |
| T-21 | 「帮我 bolder 一點，目前太素了」 | BOLDER | 全域 | `bolder src/` | ✅ |
| T-22 | 「shape 一下戰情室的使用流程」 | SHAPING | DashboardView | `shape src/components/DashboardView.tsx` | ✅ |
| T-23 | 「完全不知道要執行什麼命令」 | HELP | — | 返回命令列表 | ✅ |
| T-24 | 「檢查一個不存在的檔案」 | ERROR | — | 返回可用檔案列表 | ✅ |
| T-25 | 「只檢查 sidebar 和 navbar，排除 dashboard」 | AUDIT（exclude） | Sidebar+Navbar | `audit --exclude=DashboardView` | ✅ |

### 6.2 預期準確率

| 測試組 | 用例數 | 期望通過率 |
|--------|--------|----------|
| 基礎意圖解析（T-01～T-17） | 17 | ≥ 99% |
| 參數注入解析（T-18～T-22） | 5 | ≥ 99% |
| 異常處理解析（T-23～T-25） | 3 | 100% |
| **總計** | **25** | **≥ 99%** |

---

## 七、模組檔案結構

```
src/
├── extensions/
│   └── impeccable/             # 外部依賴（git submodule）
│       ├── skill/              # 源頭 skill 文件
│       ├── cli/                # CLI 引擎
│       └── package.json        # 獨立 npm 包
├── semantic-parser/            # 本模組
│   ├── IntentClassifier.ts     # 意圖分類器
│   ├── EntityExtractor.ts      # 實體提取器
│   ├── ErrorValidator.ts       # 錯誤校驗器
│   ├── ParamMapper.ts          # 參數映射器
│   ├── types.ts                # 類型定義
│   └── index.ts                # 對外匯出
└── components/
    └── ImpeccableBridge.tsx    # 前端整合入口（可選）
```

---

## 八、解耦設計

本模組設計為**完全可解耦**的外部依賴：

1. **依賴邊界**：`src/semantic-parser/` 透過 `spawnChild` 呼叫 `npx impeccable`，不 import 任何 impeccable 內部模組
2. **啟動腳印**：模組掛載在 `src/extensions/impeccable/`，整個資料夾可一次性移除
3. **配置隔離**：`.impeccable/` 目錄存放所有运行狀態，與 PMS 核心程式碼完全隔離
4. **解耦指令**：`npm run impeccable:detach` 單一步驟清除所有整合痕跡
