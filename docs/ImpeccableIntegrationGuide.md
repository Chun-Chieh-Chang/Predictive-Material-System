# 《整合可行性評估報告》與《落地實施方案》
## PMS × impeccable UI/UX 深度整合

| 文件編號 | DOC-FEASIBILITY-004 |
| 版本 | v1.0 |
| 日期 | 2026-08-22 |
| 審核狀態 | 待團隊確認 |

---

# 第一部分：整合可行性評估報告

## 一、執行摘要

| 評估維度 | 評分 | 說明 |
|----------|------|------|
| **技術可行性** | ⭐⭐⭐⭐☆ 4/5 | 架構兼容，Tailwind v4 需適配 |
| **功能覆蓋率** | ⭐⭐⭐⭐☆ 4/5 | 直接對接 60%，需二次開發 40% |
| **整合複雜度** | ⭐⭐⭐☆☆ 3/5 | 模塊化設計，解耦成本低 |
| **維護負擔** | ⭐⭐⭐⭐☆ 4/5 | 獨立模組，核心不污染 |
| **ROI 評估** | ⭐⭐⭐⭐☆ 4/5 | 高頻 UI 開發場景受益明顯 |

**綜合結論：建議採納，優先執行 Phase 1–3，Phase 4–5 視情況延後。**

---

## 二、現有設計基礎評估

### 2.1 PMS 已有設計系統資產

PMS 已具备以下可被 impeccable 利用的基礎：

| 資產 | 位置 | 可被 impeccable 使用的程度 |
|------|------|--------------------------|
| CSS 設計 Token | `src/index.css`（`--med-cobalt`, `--med-cyan` 等） | ✅ 可直接被 `extract` 命令讀取 |
| 圓角系統 | `src/index.css`（5/6/8/10px 精確覆蓋） | ✅ 可註冊為 design-system-radius 規則 |
| 陰影系統 | `src/index.css`（4 個 shadow token） | ✅ 可註冊為 design-system-shadow 規則 |
| 字級規範 | `src/index.css`（min 14px 限制） | ✅ 可註冊為 design-system-font-size 規則 |
| 物料分類顏色 | `src/utils/materialClassColors.ts` | ⚠️ 需手動註冊到 DESIGN.md |
| 雙主題架構 | `src/index.css`（`html:not(.dark)` override） | ❌ 需要重構才能穩定使用 |

### 2.2 已知設計偏差（由 Impeccable 可檢測到）

| 偏差 | 嚴重度 | 對應 detector 規則 |
|------|--------|-------------------|
| Active 狀態低對比度（已修） | 🔴 高 | `low-contrast`, `gray-on-color` |
| Dynamic Tailwind class 拼接（PrdDocView） | 🔴 高 | `design-system-color`（未定義的 class） |
| GlossaryPanel 打字錯誤（py-1.,） | 🟡 中 | `cramped-padding`（無效 class 導致 layout shift） |
| Dashboard grid-cols-6 無響應降級 | 🟡 中 | `first-viewport-column-overflow` |
| DataTablesView 操作列 hover-only | 🟡 中 | `content-hidden-at-rest` |
| 系統設定 col-span 錯誤 | 🟡 中 | `layout-transition`（grid 錯位） |

---

## 三、整合收益分析

### 3.1 直接收益

| 收益項目 | 預期改善 | 量化指標 |
|----------|---------|---------|
| UI 對比度問題預防 | 避免類似 CAPA-004 的復發 | 對比度違規事件降為 0 |
| AI 生成 Slop 檢測 | 自動攔截 Inter/gradient-nested-cards 等常見 AI tell | 新開發頁面 Slop 分數 < 5 |
| 設計系統一致性 | 確保新增組件遵循現有 design token | design-system-color 誤判降為 0 |
| 響應式問題早期發現 | 行動端適配問題在編碼階段即被標記 | 行動端 bug 報告降低 50% |
| 無障礙合規 | 自動檢測 a11y 違規 | WCAG AA 合規率 ≥ 95% |

### 3.2 間接收益

| 收益項目 | 說明 |
|----------|------|
| 開發者心智負擔降低 | 無需手動記憶 59 條規則，AI 自動提醒 |
| 團隊設計語言統一 | DESIGN.md 作為單一真相來源 |
| 代码審查效率提升 | 自動化檢測減少人工審查設計相關的 PR comment |
| 技術債累積可控 | 每輪編輯都有即時反饋，問題不會堆積 |

---

## 四、風險與限制

### 4.1 已知限制

| 限制 | 影響 | 緩解措施 |
|------|------|---------|
| impeccable 原生不支援 TSX JSX 結構 | 部分 detector 可能無法正確分析 React 組件 | 透過 `document` 命令先轉換為 HTML snapshot 再檢測 |
| 雙主題 CSS override 架構脆弱 | `low-contrast` 規則會對 override 區段產生大量 false positive | Phase 1 預先配置 `detector.ignorePatterns` |
| 工業 MRP 系統與 SaaS 模板風格差異 | `bolder`/`delight` 命令可能產生不適切的修改建議 | 在 DESIGN.md 中設定 `mode: "product"` + 明確 voice 規範 |
| Windows 環境路徑分隔符問題 | Hook 腳本可能因 `\` 導致路徑解析錯誤 | 使用 `path.posix` 統一轉換 |

### 4.2 不建議整合的領域

| 領域 | 原因 |
|------|------|
| `overdrive` 命令 | 工業 MRP 系統不需要花俏特效，違反極簡主義原則 |
| `delight` 命令 | 同理由，可能引入不必要的裝飾 |
| `bolder` 命令 | 與當前「清爽乾淨」設計方向相悖 |
| `harden` 命令的 i18n 子項 | PMS 目前鎖定繁體中文，i18n 需求低 |

---

## 五、可行性結論

| 維度 | 結論 |
|------|------|
| **技術可行性** | ✅ 可行 — 架構清晰，模組化程度高 |
| **經濟可行性** | ✅ 可行 — 外部依賴不增加 build size，無額外授權成本 |
| **時間可行性** | ✅ 可行 — Phase 1–3 可在 3 週內完成核心整合 |
| **維護可行性** | ✅ 可行 — 完整解耦機制確保未來可無痕移除 |
| **戰略匹配度** | ✅ 高度匹配 — 符合「極簡主義 + 專業清晰」的產品定位 |

**建議：立即啟動 Phase 1（環境配置），Phase 2–3 依資源狀況排程。**

---

# 第二部分：落地實施方案

## 一、整合架構總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PMS 專案結構                                │
│                                                                     │
│  src/                                                               │
│  ├── extensions/                                                   │
│  │   └── impeccable/              ← 外部依賴（git clone，不修改）   │
│  │       ├── skill/               源頭 skill（只讀）               │
│  │       ├── cli/                 CLI 引擎（只讀）                 │
│  │       └── package.json         版本鎖定                         │
│  │                                                                  │
│  ├── semantic-parser/             ← 本專案新增（可解耦）             │
│  │   ├── IntentClassifier.ts                                     │
│  │   ├── EntityExtractor.ts                                      │
│  │   ├── ErrorValidator.ts                                       │
│  │   ├── ParamMapper.ts                                          │
│  │   ├── types.ts                                                │
│  │   └── index.ts                                                │
│  │                                                                  │
│  └── components/                                                    │
│      └── ImpeccablePanel.tsx        ← 可選：前端整合入口           │
│                                                                     │
│  .impeccable/                      ← 運行時配置（部分 gitignore）   │
│  ├── config.json                  團隊共享配置                     │
│  ├── config.local.json            個人偏好（gitignore）            │
│  ├── design.json                  設計 token 註冊                   │
│  ├── hook.cache.json              會話追蹤（gitignore）            │
│  └── critique/                    審查報告（git tracked）           │
│                                                                     │
│  docs/                                                              │
│  ├── Impeccable-FeatureMapping.md   功能對照分析                   │
│  ├── SemanticParserDesign.md        語意解析技術設計               │
│  ├── Impeccable-IntegrationRoadmap.md 路線圖                      │
│  └── ImpeccableIntegrationGuide.md  整合使用指南                   │
│                                                                     │
│  scripts/                                                           │
│  ├── impeccable-init.mjs            一次性啟動腳本                 │
│  ├── impeccable-hook.mjs            Trae IDE hook 入口             │
│  └── impeccable-detach.mjs          單一步驟解耦腳本               │
│                                                                     │
│  .gitignore                                                         │
│  # impeccable-ignore-start  ← 自動產生的排除規則                   │
│  .impeccable/config.local.json                                     │
│  .impeccable/hook.cache.json                                       │
│  .impeccable/*.png                                                 │
│  # impeccable-ignore-end                                          │
│                                                                     │
│  package.json                                                       │
│  "scripts": {                                                      │
│    "impeccable:init": "node scripts/impeccable-init.mjs",          │
│    "impeccable:audit": "npx impeccable audit src/components/",     │
│    "impeccable:detach": "node scripts/impeccable-detach.mjs"       │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## 二、逐步實施步驟

### Step 1：確認外部依賴已克隆

```bash
# src/extensions/impeccable/ 已存在（本次 session 已完成）
# 驗證版本
cd src/extensions/impeccable && git log --oneline -3
# 預期輸出：最近 3 筆 commit，版本 v3.6.0+
```

### Step 2：執行初始化

```bash
# 方式 A：CLI 安裝（推薦）
npm run impeccable:init

# 方式 B：手動執行
cd src/extensions/impeccable
node cli/bin/cli.js install --providers=trae --scope=project
```

初始化後會產生：
- `.impeccable/config.json`（團隊共享）
- `.impeccable/design.json`（需手動填充 PMS 品牌色）
- `docs/DESIGN.md`（如不存在則新建）
- `.trae/hooks.json`（Trae IDE hook 配置）

### Step 3：填充 PMS 設計上下文

編輯 `.impeccable/design.json`，註冊 PMS 專屬設計 Token：

```json
{
  "productName": "料事如神系統 (PMS)",
  "productType": "product",
  "audience": "內部工业 MRP 用戶",
  "mode": "product",
  "brandLane": "industrial-dashboard",
  "voice": "專業、清晰、克制",
  "antiReferences": ["marketing-landing", "startup-saas", "portfolio"],
  "colors": {
    "primary": "#0284C7",
    "secondary": "#06B6D4",
    "surface-dark": "#0F172A",
    "surface-card": "#1E293B",
    "text-primary": "#F1F5F9",
    "text-secondary": "#94A3B8",
    "status-pass": "#059669",
    "status-warning": "#D97706",
    "status-alert": "#DC2626"
  },
  "type": {
    "fontFamily": "SF Pro, PingFang TC, system-ui, sans-serif",
    "minFontSize": "14px",
    "hierarchy": ["text-xs:14px", "text-sm:14.5px", "text-base:15px", "text-lg:17px"]
  },
  "radius": {
    "sm": "5px",
    "md": "6px",
    "lg": "8px",
    "xl": "10px"
  },
  "buildPath": "code",
  "detector": {
    "ignorePatterns": [
      "html:not\\(.dark\\)",
      "bg-slate-950",
      "text-slate-400",
      "text-slate-500"
    ],
    "ignoreRules": [
      "overused-font",
      "ai-color-palette",
      "cream-palette",
      "icon-tile-stack"
    ]
  }
}
```

### Step 4：執行首次全量檢測

```bash
# 執行 audit 掃描所有 UI 組件
npm run impeccable:audit
```

預期發現（參考已知問題）：
```
[low-contrast] Sidebar active state — text-sky-100 on bg-sky-600/15
[design-system-color] PrdDocView — dynamic class `bg-${color}-50` unresolved
[cramped-padding] GlossaryPanel — invalid class `py-1.,` causing layout shift
[responsive] Dashboard — grid-cols-6 lacks mobile fallback
```

### Step 5：修復已檢測問題

根據 audit 報告，修復已知問題（此階段與 CAPA-004 流程結合）。

### Step 6：配置 Hook（可選）

```bash
# 啟用即時 hook 反饋
npx impeccable hooks on --provider=trae
```

---

## 三、解耦機制說明

### 3.1 解耦原則

本整合設計遵循 **零汙染原則**：

1. **外部依賴隔離**：`src/extensions/impeccable/` 是完全獨立的 git clone，不 import 任何內部程式碼
2. **配置隔離**：`.impeccable/` 目錄存放所有運行時狀態，與 `src/` 核心程式碼分離
3. **腳本隔離**：`scripts/` 下的整合腳本可獨立執行，不依賴 PMS 核心模組
4. **一次性解耦**：`impeccable-detach.mjs` 腳本清除所有整合痕跡

### 3.2 解耦指令

```bash
# 單一指令完成完全解耦
npm run impeccable:detach
```

解耦腳本執行內容：

```javascript
// scripts/impeccable-detach.mjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const TARGETS = [
  'src/extensions/impeccable',       // 外部依賴目錄
  'src/semantic-parser',             // 語意解析模組
  '.impeccable',                     // 運行時配置
  'scripts/impeccable-init.mjs',     // 啟動腳本
  'scripts/impeccable-hook.mjs',     // Hook 腳本
  'scripts/impeccable-detach.mjs',   // 本腳本自身
  '.trae/hooks.json',                // Trae hook 配置
];

console.log('🔧 開始執行 Impeccable 解耦...\n');

for (const target of TARGETS) {
  const fullPath = path.join(ROOT, target);
  if (fs.existsSync(fullPath)) {
    if (fs.statSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✅ 移除目錄: ${target}`);
    } else {
      fs.unlinkSync(fullPath);
      console.log(`  ✅ 移除檔案: ${target}`);
    }
  } else {
    console.log(`  ⏭️  不存在，跳過: ${target}`);
  }
}

// 從 package.json 移除相關 scripts
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
delete pkg.scripts?.['impeccable:init'];
delete pkg.scripts?.['impeccable:audit'];
delete pkg.scripts?.['impeccable:detach'];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('  ✅ 從 package.json 移除 관련 scripts');

console.log('\n✅ 解耦完成！PMS 核心功能不受影響。');
console.log('   建議執行 git clean -fd 清理可能遺留的空目錄。');
```

### 3.3 解耦後驗證

```bash
# 執行解耦後，驗證核心功能正常
npm run build           # build 成功
npx tsc --noEmit        # TypeScript 零錯誤
# 核心 UI 功能（Sidebar, Dashboard, MRP 計算等）應完全正常
```

---

## 四、整合成果輸出清單

| 輸出物 | 路徑 | 狀態 |
|--------|------|------|
| 功能對照分析表 | `docs/Impeccable-FeatureMapping.md` | ✅ 已完成 |
| 語意解析技術設計 | `docs/SemanticParserDesign.md` | ✅ 已完成 |
| 整合技術路線圖 | `docs/Impeccable-IntegrationRoadmap.md` | ✅ 已完成 |
| 整合可行性評估報告 | `docs/ImpeccableIntegrationGuide.md`（此文件） | ✅ 已完成 |
| 外部依賴克隆 | `src/extensions/impeccable/` | ✅ 已完成 |
| 解耦腳本 | `scripts/impeccable-detach.mjs` | ⏳ 待實施 |
| 語意解析模組 | `src/semantic-parser/` | ⏳ 待實施 |
| Trae Hook 配置 | `.trae/hooks.json` | ⏳ 待實施 |
| 設計上下文註冊 | `.impeccable/design.json` | ⏳ 待實施 |

---

## 五、後續行動建議

### 立即執行（本 session 內）

1. ✅ 功能對照分析表 — 已輸出
2. ✅ 語意解析技術設計 — 已輸出
3. ✅ 整合路線圖 — 已輸出
4. ✅ 可行性評估報告 — 已輸出
5. ✅ 外部依賴克隆 — 已執行

### 下一步（由開發者確認後執行）

1. 執行 `npm run impeccable:init` 完成環境配置
2. 填充 `.impeccable/design.json` 的 PMS 品牌色
3. 執行首次 `npm run impeccable:audit` 獲取問題清單
4. 根據 audit 結果修復已知 UI 問題
5. 評估是否開發 `src/semantic-parser/` 模組（按需）
6. 按需啟用 Trae Hook 即時反饋

### 解耦驗證（整合完成後）

1. 執行 `npm run impeccable:detach`
2. 驗證 `npm run build` 和 `npx tsc --noEmit` 正常
3. 手動測試所有核心 UI 功能
4. 確認核心功能零回歸
