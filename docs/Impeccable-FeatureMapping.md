# 《功能對照分析表》
## impeccable × PMS（料事如神系統）UI/UX 需求整合評估

| 文件編號 | DOC-COMP-001 |
| 版本 | v1.0 |
| 日期 | 2026-08-22 |
| 狀態 | 初版定稿 |

---

## 一、目標系統（impeccable）核心能力清單

impeccable 是一套為 AI 編碼代理提供 UI/UX 設計指導的技能系統，具備以下三大核心能力：

### 1.1 23 個設計命令

| 分類 | 命令 | 功能描述 | PMS 適用場景 |
|------|------|----------|-------------|
| **Build** | `init` | 收集設計上下文，寫入 PRODUCT.md + DESIGN.md | ⭐ 首次整合必要 |
| **Build** | `document` | 從現有程式碼反推 DESIGN.md | ⭐ PMS 現狀分析可用 |
| **Build** | `extract` | 從現有組件提取 Design Token | ⭐ 已有 CSS 變數可整合 |
| **Build** | `shape` | 編碼前 UX/UI 規劃 | 次要 |
| **Build** | `craft` | 完整設計→編碼流程 | 次要 |
| **Evaluate** | `critique` | UX 設計審查（層次/清晰度/情感共鳴） | ⭐⭐ 高優先 |
| **Evaluate** | `audit` | 技術質量檢查（無障礙/效能/響應式） | ⭐⭐⭐ 最高優先 |
| **Refine** | `polish` | 最終打磨與 Design System 一致性檢查 | ⭐⭐ 高優先 |
| **Refine** | `bolder` | 強化設計表現力 | 低優先 |
| **Refine** | `quieter` | 降低過度誇張的設計 | 中優先 |
| **Refine** | `distill` | 去除複雜元素，回歸本質 | 次要 |
| **Refine** | `harden` | 錯誤處理/i18n/邊界情況 | 次要 |
| **Refine** | `onboard` | 首次使用流程/空狀態/激活路徑 | 次要 |
| **Enhance** | `animate` | 添加有意義的動畫 | 低優先 |
| **Enhance** | `colorize` | 策略性色彩引入 | ⭐ 中優先 |
| **Enhance** | `typeset` | 字體/層次/尺寸修正 | ⭐ 中優先 |
| **Enhance** | `layout` | 佈局/間距/視覺節奏修正 | ⭐⭐ 高優先 |
| **Enhance** | `delight` | 添加驚喜瞬間 | 低優先 |
| **Enhance** | `overdrive` | 技術特效 | 低優先 |
| **Fix** | `clarify` | 改善 unclear UX 文案 | 次要 |
| **Fix** | `adapt` | 跨裝置適配 | ⭐⭐ 高優先 |
| **Fix** | `optimize` | 效能優化 | 次要 |
| **Iterate** | `live` | 瀏覽器即時視覺迭代 | 次要 |

### 1.2 59 條確定性探測規則

| 類別 | 數量 | 核心規則 ID |
|------|------|-------------|
| **Slop（AI 生成特徵）** | 28 條 | `overused-font`, `ai-color-palette`, `nested-cards`, `gray-on-color`, `dark-glow`, `icon-tile-stack`, `gradient-text`, `bounce-easing`... |
| **Quality（設計品質）** | 26 條 | `low-contrast`, `design-system-color`, `design-system-font`, `cramped-padding`, `line-length`, `text-overflow`, `skipped-heading`... |
| **Error（嚴重錯誤）** | 2 條 | `script-error`, `content-hidden-at-rest` |
| **Advisory（建議級）** | 7 條 | 僅建議，不計入失敗 |

### 1.3 即時 Hook 反饋機制

| Hook 類型 | 觸發時機 | 檢查深度 | 影響等級 |
|-----------|---------|---------|---------|
| `preToolUse` (Cursor) | 寫入檔案前 | 完整掃描 | 拒絕寫入（硬攔截） |
| `postToolUse` (Claude/Copilot) | 編輯完成後 | 僅 IMEDIATE_TIER（14 條） | 警告 |
| `Stop` 深層 | 會話停止時 | 全量掃描（最多 20 個 UI 檔案） | 報告 + 建議 |

---

## 二、PMS 專案 UI/UX 需求清單

基於現況分析，PMS 需要優化的項目共 **12 項 UI/UX 問題**：

### P2-HIGH（高優先）

| # | 問題 | 涉及檔案 | 對應 impeccable 命令 |
|---|------|---------|---------------------|
| H-01 | Active 狀態字體對比度不足（已修，需防復發） | Sidebar.tsx | `audit`（detectors: `low-contrast`, `gray-on-color`）|
| H-02 | What-If 模擬器深色背景與淺色主題不一致 | DashboardView.tsx | `adapt` + `polish` |
| H-03 | Dashboard 快速情境按鈕在行動端擠壓變形（grid-cols-6 無降級） | DashboardView.tsx | `audit`（responsive）+ `adapt` |
| H-04 | 戰情室表格無 sticky header | DashboardView.tsx | `layout` |
| H-05 | 風險預警卡片使用 emoji（跨平台不一致，a11y 問題） | DashboardView.tsx | `audit`（a11y） |

### P2-MID（中優先）

| # | 問題 | 涉及檔案 | 對應 impeccable 命令 |
|---|------|---------|---------------------|
| M-01 | DataTablesView 操作列 hover-only 在行動端無效 | DataTablesView.tsx | `audit`（responsive）+ `adapt` |
| M-02 | SystemSettingsView grid 佈局錯誤（col-span 錯配） | SystemSettingsView.tsx | `layout` + `audit` |
| M-03 | Range Slider 與 Number Input 不同步 | SystemSettingsView.tsx | `harden` |
| M-04 | 淺色主題是「暗色 override」模式，架構脆弱 | index.css | `document` + `extract` |
| M-05 | Dynamic Tailwind class 拼接 bug（PrdDocView, MaterialClassManagementView） | PrdDocView.tsx, MaterialClassManagementView.tsx | `audit` |
| M-06 | Navbar Admin 解鎖 pulse 動畫缺乏 prefers-reduced-motion | Navbar.tsx | `audit`（a11y） |
| M-07 | GlossaryPanel 打字錯誤（py-1., 多逗號） | GlossaryPanel.tsx | `polish` |

### P2-LOW（低優先）

| # | 問題 | 涉及檔案 | 對應 impeccable 命令 |
|---|------|---------|---------------------|
| L-01 | Dashboard 數字前綴 bug（0{count} >= 10 時顯示錯誤） | DashboardView.tsx | `harden` |
| L-02 | Toast 通知位置固定 bottom-6 right-6 可能重疊 | App.tsx | `layout` |
| L-03 | Footer 固定底部在空狀態頁面懸浮 | App.tsx | `layout` |
| L-04 | BackupSettingsView 倒數計時 30s 延遲誤差 | BackupSettingsView.tsx | `harden` |
| L-05 | MrpCalculatorView Stage 收合預設狀態不合理 | MrpCalculatorView.tsx | `shape` |

---

## 三、功能對照分析表

### 3.1 直接對接（無需二次開發）

| PMS 需求 | impeccable 命令 | 實現方式 | 預計覆蓋率 |
|----------|----------------|---------|-----------|
| 對比度檢查（H-01） | `audit` | 59 條 detector 中的 `low-contrast`、`gray-on-color` 直接偵測 | 100% |
| 響應式檢查（H-03, M-01） | `audit` + `adapt` | responsive 測試套件 + adapt 命令 | 90% |
| a11y 檢查（H-05, M-06） | `audit` | broken-image, content-hidden-at-rest 等規則 | 70% |
| 設計系統一致性（M-04） | `document` + `extract` | 從現有 index.css 提取 Token，建立 DESIGN.md | 80% |
| 文案優化（L-?） | `clarify` | 自然語言分析 UX 文案清晰度 | 60% |
| 佈局修正（H-04, M-02） | `layout` | 間距/對齊/視覺節奏分析 | 75% |

### 3.2 需二次開發才能適配

| PMS 需求 | 缺口分析 | 二次開發方向 | 難度 |
|----------|---------|-------------|------|
| **語意解析（自然語意指令→impeccable 命令）** | impeccable 無內建 NLU，需自行實現意圖分類器 | 建立 Natural Language → impeccable command 映射模組 | ⭐⭐⭐ |
| **React TSX 檔案檢測** | impeccable 原生支援 HTML/Vue/Svelte，對 TSX 支援有限 | 擴充 detector 以支援 `.tsx` 檔案解析 | ⭐⭐ |
| **PMS 領域自訂規則** | 現有 59 條為通用 SaaS 模板規則，不含 MRP/射出成型領域特定規則 | 建立 PMS 自訂設計規則（如：色母配色規範、Dark Mode 強制對比度） | ⭐⭐ |
| **Tailwind v4 兼容性** | impeccable 原設計針對 Tailwind v3 JIT，部分 class 掃描策略可能偏移 | 驗證 + 適配 Tailwind v4 的 `@import "tailwindcss"` 配置 | ⭐⭐ |
| **即時 Hook 整合** | PMS 使用 Trae IDE（非 Claude Code/Cursor），需自訂 hook 入口 | 建立 Trae 兼容的 hook 腳本或使用通用的 postToolUse 模式 | ⭐⭐⭐ |

### 3.3 潛在匹配差異

| 差異點 | impeccable 設計假設 | PMS 實際環境 | 影響等級 | 解決方向 |
|--------|-------------------|-------------|---------|---------|
| **框架** | React/Vue/Svelte + Tailwind | React 19 + TypeScript + Tailwind v4 + Vite 6 | 🔴 高 | Tailwind v4 需特別驗證；TSX JSX 結構與 HTML 有差異 |
| **主題模式** | 純暗色或純亮色 | 雙主題（透過 CSS override 模擬），架構脆弱 | 🔴 高 | 需先在 PMS 端修復主題架構，impeccable 才能正確檢測 |
| **字體系統** | 禁止 Inter/Roboto/Arial | PMS 使用 SF Pro + PingFang TC（非過時字體） | 🟢 低 | `overused-font` 規則需加入白名單 |
| **色板** | 禁止 AI 紫/青配色 | PMS 使用 Cobalt（#0284C7）+ Cyan（#06B6D4）主色系 | 🟡 中 | 需將 PMS 設計 Token 註冊進 DESIGN.md，避免 `design-system-color` 誤判 |
| **陰影/圓角** | 偏好無陰影或微妙陰影 | PMS 有明確陰影系統（shadow-instrument/card/popover/modal） | 🟡 中 | 需在 DESIGN.md 中註冊 PMS 陰影規則，防止誤判 |
| **目標受眾** | B2B SaaS / Marketing | 工業 MRP 系統（內部用戶） | 🟡 中 | `bolder`/`delight` 類命令可能不適用工業界面風格 |

---

## 四、差異影響等級總覽

| 影響等級 | 數量 | 說明 |
|----------|------|------|
| 🔴 高（必須解決） | 2 | Tailwind v4 兼容性、雙主題架構 |
| 🟡 中（建議解決） | 4 | 色板註冊、陰影規則、目標受眾風格、語意解析模組 |
| 🟢 低（可接受） | 2 | 字體白名單、文案優化覆蓋率 |
| ⚪ 不適用 | 3 | `bolder`/`delight`/`overdrive` 對工業 MRP 系統價值有限 |

**總體評估：可以直接對接 60% 的功能，需二次開發 40%，整合可行性高。**
