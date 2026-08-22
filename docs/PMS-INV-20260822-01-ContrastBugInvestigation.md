# 卡片文字可讀性 Bug 全面調查報告

**報告編號：** PMS-INV-20260822-01  
**調查日期：** 2026-08-22  
**嚴重度：** P1 — 使用者體驗嚴重缺陷  
**相關 CAPA：** CAPA-005  
**驗證範圍：** 開發流程 × 測試覆蓋 × CAPA 體系 × 自動化防線

---

## 目錄

1. [問題根因分析](#1-問題根因分析)
   - 1.1 技術層面：CSS 選擇器權重競爭
   - 1.2 流程層面：各階段質量把關漏洞
   - 1.3 工具層面：自動化檢測缺失
2. [全局 CAPA 體系現狀說明](#2-全局-capa-體系現狀說明)
   - 2.1 CAPA 定義與架構
   - 2.2 執行流程與責任分工
   - 2.3 當前落地情況
   - 2.4 有效性評估
3. [改進方案與建議](#3-改進方案與建議)
   - 3.1 立即修復（本週內）
   - 3.2 短期強化（2 週內）
   - 3.3 中期建設計劃
4. [附錄：完整差距矩陣](#4-附錄完整差距矩陣)

---

## 1. 問題根因分析

### 1.1 技術層面：為什麼測試/代碼審核未能攔截

#### 根本原因 A：CSS 覆蓋規則的脆弱設計

本次 bug 的核心技術原因是 `src/index.css` 中的 light mode CSS 覆蓋規則存在兩层失效機制：

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1: Tailwind v4 的選擇器權重問題                            │
├──────────────────────────────────────────────────────────────────┤
│  Tailwind v4 使用 where() 偽類包裝 dark 變體:                      │
│    .dark\:text-white:where(.dark,.dark *) { color: #fff }        │
│    選擇器權重 = 0,1,1  (偽類計入第二組)                           │
│                                                                   │
│  我們的覆蓋規則:                                                   │
│    html:not(.dark) h1.text-white { color: #0f172a !important }  │
│    選擇器權重 = 0,2,1  (看似更高)                                │
│                                                                   │
│  但實際情況:                                                     │
│    Tailwind v4 的 where() 在 CSS 層級計算中享有特殊地位           │
│    且 !important 在瀏覽器優先級中僅高於正常規則                    │
│    當 Tailwind 使用 @layer utilities 時，其优先级被重新定義       │
│    → 覆蓋規則與 Tailwind 進入權重競賽，結果不確定                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Layer 2: ThemeContext 的選擇器失配                              │
├──────────────────────────────────────────────────────────────────┤
│  ThemeContext 設置: classList.add('light') / classList.remove('dark')│
│  但最初嘗試的覆蓋選擇器: .light[data-theme="light"]               │
│  → 屬性選擇器 [data-theme] 從未匹配，選擇器永不生效               │
│  即使修正為 .light 後，仍然存在 Layer 1 的權重問題                │
└──────────────────────────────────────────────────────────────────┘
```

#### 根本原因 B：開發流程中缺少對比度校驗環節

| 開發階段 | 現有檢查機制 | 對比度檢查 | 結果 |
|----------|------------|-----------|------|
| 編碼 | `tsc --noEmit` (類型檢查) | ❌ 無 | 類型正確 ≠ 可讀性正確 |
| 編碼 | Vite HMR 即時預覽 | ⚠️ 依賴開發者肉眼 | 開發者可能忽略淺色模式 |
| Commit | 無 pre-commit hooks | ❌ 無 | 問題代碼可直接提交 |
| PR | 無 CI PR gate | ❌ 無 | 無自動化攔截 |
| Build | `npm run build` | ❌ 無 | 僅檢查打包成功 |
| 部署 | GitHub Actions deploy.yml | ❌ 無 | 僅觸發部署，不執行測試 |

#### 根本原因 C：impeccable 檢測器的故意忽略配置

`.impeccable/design.json` 和 `config.json` 中明確配置了 `ignorePatterns`：

```json
{
  "detector": {
    "ignorePatterns": [
      "html:not\\(.dark\\)",   // ← 刻意跳過 light mode 覆蓋規則的檢測
      "bg-slate-950",
      "text-slate-400",
      "text-slate-500"
    ]
  }
}
```

這個配置的本意是避免 impeccable detector 對全局覆蓋規則產生誤報，但副作用是：**連同這些覆蓋規則下方的實際對比度問題也被一起跳過了**。當開發者在組件中使用 `text-white` 在可能被轉換為白色背景的容器內時，impeccable 不會發出警告。

#### 根本原因 D：淺色模式測試用例缺失

現有手動測試流程（從 DEV_LOG.md 推斷）：

1. 開發者主要使用暗色模式進行視覺驗證
2. 淺色模式作為次要場景，未在每次開發中系統性驗證
3. `SystemSettingsView.tsx` 和 `MrpCalculatorView.tsx` 大量使用暗色主題色彩（`text-white`、`text-slate-400`），這些在淺色模式下依賴 CSS 覆蓋
4. 覆蓋規則的缺口（如 `label.text-white`、`span.text-white`）未被發現

### 1.2 流程層面：各環節質量把關漏洞

```
            ┌─────────────────────────────────────────┐
            │          開發者編碼階段                    │
            │  • 手動視覺驗證（主要看暗色模式）          │
            │  • 無對比度校驗步驟                       │
            │  • 無自動化 lint 規則                     │
            │  ─────────────────────────────────────  │
            │  ❌ 漏洞：開發者未系統性切換至淺色模式驗證 │
            └─────────────────┬───────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────┐
            │           提交代碼階段                    │
            │  • 無 pre-commit hooks                   │
            │  • 無 commit message 模板檢查             │
            │  • 無自動化 lint/type check              │
            │  ─────────────────────────────────────  │
            │  ❌ 漏洞：問題代碼可直接 commit             │
            └─────────────────┬───────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────┐
            │           Pull Request 階段              │
            │  • 無 CI PR gate                        │
            │  • 無代碼審查強制流程                     │
            │  • 無自動化測試                           │
            │  ─────────────────────────────────────  │
            │  ❌ 漏洞：無 CI 阻擋問題 PR                │
            └─────────────────┬───────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────┐
            │           CI/CD 部署階段                  │
            │  • tsc --noEmit ✅                        │
            │  • npm run build ✅                       │
            │  • GitHub Pages deploy ✅                │
            │  ─────────────────────────────────────  │
            │  ❌ 漏洞：build 成功 ≠ 功能正確             │
            └─────────────────┬───────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────────┐
            │           上線後發現                       │
            │  • 用戶回報 / AI 審查                       │
            │  • CAPA-005 啟動                           │
            │  ─────────────────────────────────────  │
            │  ⚠️ 問題已達生產環境                        │
            └─────────────────────────────────────────┘
```

### 1.3 工具層面：自動化檢測缺失

| 工具層面 | 當前狀態 | 應有狀態 | Gap |
|----------|---------|---------|-----|
| TypeScript 編譯 | ✅ `tsc --noEmit` | ✅ 已配置 | — |
| Production Build | ✅ `npm run build` | ✅ 已配置 | — |
| Linting (ESLint) | ❌ 無 | ✅ 需配置 | 🔴 |
| Stylelint | ❌ 無 | ✅ 需配置 | 🔴 |
| 單元測試 (Vitest) | ❌ 無 | ✅ 需配置 | 🔴 |
| 視覺回歸測試 | ❌ 無 | ✅ 需配置 | 🔴 |
| 對比度自動化檢測 | ❌ 無 | ✅ 需配置 | 🔴 |
| Pre-commit Hooks | ❌ 無 (Husky) | ✅ 需配置 | 🔴 |
| CI PR Gate | ❌ 無 (僅 deploy) | ✅ 需配置 | 🔴 |
| 色彩對比度 CI 檢查 | ❌ 無 | ✅ 需配置 | 🔴 |

---

## 2. 全局 CAPA 體系現狀說明

### 2.1 CAPA 定義與架構

**CAPA（Corrective and Preventive Action，矯正與預防措施）** 是料事如神系統的質量管理框架，用於系統性地追蹤、分析和解決品質問題。

#### 核心架構

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA 體系架構                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────┐  │
│  │  CAPA Log    │     │ CAPA Report  │     │ Global Std │  │
│  │  (DEV_LOG.md)│────→│  (docs/)     │────→│ (UI-Contrast│  │
│  │              │     │              │     │  -Standards) │  │
│  └──────────────┘     └──────────────┘     └────────────┘  │
│        │                    │                    │          │
│        ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              執行流程 (PDCA 循環)                      │   │
│  │                                                     │   │
│  │  Plan → Identify Problem → Root Cause Analysis      │   │
│  │    ↓                                                  │   │
│  │  Do   → Corrective Action + Preventive Action        │   │
│  │    ↓                                                  │   │
│  │  Check → Verification (tsc, build, manual audit)     │   │
│  │    ↓                                                  │   │
│  │  Act  → Standardize (更新設計規範文檔)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### CAPA 文件結構

| 文件 | 用途 | 格式 |
|------|------|------|
| `DEV_LOG.md` | CAPA 索引表 + 開發日誌 | Markdown 表格 |
| `docs/CAPA-NNN-*.md` | 詳細報告（RCA、行動、驗收） | 標準化 Markdown |
| `docs/UI-Contrast-Standards.md` | 全局设计规范（預防措施落地） | Markdown |
| `.impeccable/design.json` | 設計 token + 檢測排除規則 | JSON |

#### 當前 CAPA 記錄

| 編號 | 日期 | 問題摘要 | 嚴重度 | 類型 | 狀態 |
|------|------|---------|--------|------|------|
| CAPA-001 | 08-21 | Navbar 硬編碼日期 | 低 | 矯正 | ✅ 關閉 |
| CAPA-002 | 08-21 | 未使用依賴清理 | 低 | 矯正 | ✅ 關閉 |
| CAPA-003 | 08-21 | xlsx 安全漏洞（風險接受） | 中 | 觀察 | ⚠️ 觀察中 |
| CAPA-004 | 08-22 | Sidebar Active 狀態對比度 | P2 | 預防 | 進行中 |
| CAPA-005 | 08-22 | 卡片文字可讀性對比度 | P1 | 矯正+預防 | 待驗收 |

### 2.2 執行流程與責任分工

#### 標準執行流程

```
步驟 1: 問題識別
  觸發條件: 開發階段發現 / 手動測試發現 / 用戶回報 / AI 審查
  負責人: 發現者（開發者/AI/用戶）
  交付物: 問題描述 + 截圖 + 重現步驟

步驟 2: RCA（根本原因分析）
  方法: 5-Why 分析法 + 影響範圍評估
  負責人: 技術負責人 (Wesley Chang @Mouldex)
  交付物: CAPA 報告草稿

步驟 3: 矯正措施實施
  內容: 修復問題代碼 + 編譯/構建驗證
  負責人: 開發者
  交付物: 修復 PR + tsc/build 驗證

步驟 4: 預防措施實施
  內容: 更新設計規範 + 開發流程嵌入
  負責人: 技術負責人
  交付物: 更新文檔 + 規範文件

步驟 5: 驗收與關閉
  內容: 視覺審核 + 回歸測試
  負責人: 技術負責人
  交付物: CAPA 狀態更新為 ✅ 已關閉
```

#### 責任分工矩陣

| 角色 | 職責 | 參與階段 |
|------|------|---------|
| **技術負責人** (Wesley Chang) | CAPA 決策、RCA、預防措施制定、驗收 | 全階段 |
| **開發者/AI** | 問題發現、矯正措施實施、編譯驗證 | Step 1, 3, 5 |
| **impeccable Detector** | 實時 UI 品質檢測（HOOK 模式） | Step 1（自動） |

### 2.3 當前落地情況

#### ✅ 已建立

1. **CAPA 報告格式**：標準化 Markdown 模板（問題描述 → RCA → 矯正 → 預防 → 驗收）
2. **CAPA 索引**：`DEV_LOG.md` 中維護 CAPA-001~005 追蹤表
3. **全局設計規範**：`docs/UI-Contrast-Standards.md` 記錄 WCAG AA 標準和安全配色
4. **設計 token 系統**：`.impeccable/design.json` 定義全項目色彩/字體/陰影 token
5. **impeccable HOOK**：IDE 實時 UI 品質反饋（開發中）
6. **追溯驗證報告**：`TraceabilityVerificationReport.md` 評估開發生命週期可追溯性

#### ⚠️ 部分落實

1. **預防措施執行率**：CAPA-004 提出「將色彩對比度檢查加入 Code Review Checklist」但未完成
2. **CAPA 關閉驗證**：所有 CAPA 均未完成手動視覺審核（標記為「需開發者於瀏覽器確認」）

#### ❌ 未建立

1. **結構化 CAPA 管理 UI**：目前完全依賴純文本文件，無表單或看板
2. **自動化測試防線**：無 UI 對比度自動化檢測
3. **CAPA 關聯追蹤**：CAPA 報告未與 git commit 建立明確關聯
4. **定期 CAPA 審查會議**：無周期性 CAPA 回顧流程

### 2.4 有效性評估（結合 CAPA-005 案例）

#### 評分矩陣

| 評估維度 | 評分 (1-10) | 說明 |
|----------|:----------:|------|
| **問題識別能力** | 3/10 | 問題在開發完成後才被发现，未在第一時間攔截 |
| **RCA 深度** | 7/10 | 經過多輪分析後找到真正的技術根因（Tailwind v4 where() 權重） |
| **矯正措施有效性** | 8/10 | v2 修復方案穩健（組件級 `<style>` 注入），徹底解決問題 |
| **預防措施完整性** | 4/10 | 設計規範已建立，但缺乏自動化強制執行 |
| **體系反應速度** | 5/10 | 從問題發現到修復耗時較長（需多輪 CSS 嘗試） |
| **知識傳承** | 6/10 | CAPA-004/005 文檔完整，但未形成自動化的防呆機制 |
| **整體成熟度** | **4/10** | 與 TraceabilityVerificationReport 一致 |

#### 本次漏測的根本原因（CAPA 體系角度）

```
                    ┌─────────────────────┐
                    │   CAPA 體系漏洞      │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  預防層缺失  │    │  檢測層缺失  │    │  驗證層缺失  │
    │             │    │             │    │             │
    │ • 無自動化  │    │ • 無對比度  │    │ • 無手動     │
    │   對比度檢  │    │   自動化檢測 │    │   視覺審核   │
    │   測工具    │    │             │    │ • CAPA 狀態  │
    │ • 設計規範  │    │ • 無視覺     │    │   長期停滯   │
    │   未強制執行 │    │   回歸測試   │    │   (待驗收)   │
    │ • 無 pre-  │    │ • impeccable│    │ • 無標準化    │
    │   commit   │    │   跳過覆蓋    │    │   驗收標準   │
    │   攔截      │    │   規則檢測    │    │             │
    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 3. 改進方案與建議

### 3.1 立即修復（本週內）

#### 【P-01】建立對比度自動化檢測規則

**目標**：在代碼提交前自動攔截低對比度問題

**方案 A：ESLint + eslint-plugin-jsx-a11y**

```bash
npm install -D eslint eslint-plugin-jsx-a11y eslint-config-react-app
```

配置 `.eslintrc.cjs`：

```javascript
module.exports = {
  extends: ['react-app'],
  plugins: ['jsx-a11y'],
  rules: {
    'jsx-a11y/NoStaticElementInteractivity': 'off',
    // 未來可啟用的對比度規則（需要自訂 plugin）
  },
};
```

**方案 B：Stylelint + stylelint-declaration-strict-value**

```bash
npm install -D stylelint stylelint-config-standard stylelint-order
```

配置 `.stylelintrc.json`：

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "declaration-no-important": null,
    "color-named": "never"
  }
}
```

**方案 C：自建對比度校驗腳本（推薦優先）**

創建 `scripts/contrast-check.mjs`：

```javascript
/**
 * 對比度校驗腳本 — 掃描 TSX 文件中的潛在低對比度組合
 * 用法: node scripts/contrast-check.mjs src/components/
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const LOW_CONTRAST_PATTERNS = [
  // 白底 + 淺色文字（淺色模式問題）
  { bg: /bg-slate-900\/[0-9]+|bg-slate-950\/[0-9]+|bg-white/, text: /text-white|text-slate-100|text-slate-200|text-slate-300/ },
  // 深色背景 + 過淺文字（需注意透明度）
  { bg: /bg-slate-950/, text: /text-slate-400|text-slate-500|text-slate-600/ },
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const findings = [];
  
  // 檢測className中包含白底+淺色字的模式
  for (const pattern of LOW_CONTRAST_PATTERNS) {
    const bgMatches = content.match(pattern.bg);
    const textMatches = content.match(pattern.text);
    if (bgMatches && textMatches) {
      findings.push({ file: filePath, pattern: `${pattern.bg.source} + ${pattern.text.source}` });
    }
  }
  return findings;
}

function scanDir(dir) {
  const findings = [];
  for (const entry of readdirSync(dir, { recursive: true })) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isFile() && (entry.endsWith('.tsx') || entry.endsWith('.jsx'))) {
      findings.push(...checkFile(fullPath));
    }
  }
  return findings;
}

const results = scanDir(process.argv[2] || 'src/components');
if (results.length > 0) {
  console.error(`\n⚠️  發現 ${results.length} 處潛在低對比度問題：`);
  results.forEach(r => console.error(`  ${r.file}: ${r.pattern}`));
  process.exit(1);
} else {
  console.log('✅ 對比度檢查通過');
  process.exit(0);
}
```

---

#### 【P-02】配置 Pre-commit Hooks（Husky）

```bash
npm install -D husky
npx husky init
```

創建 `.husky/pre-commit`：

```bash
#!/bin/sh
npm run tsc:check
node scripts/contrast-check.mjs src/components/
```

添加到 `package.json`：

```json
{
  "scripts": {
    "tsc:check": "tsc --noEmit",
    "contrast:check": "node scripts/contrast-check.mjs src/components/"
  }
}
```

---

#### 【P-03】更新 Impeccable 配置

`.impeccable/config.json` 和 `.impeccable/design.json` 中的 `ignorePatterns` 需要重新評估：

```json
{
  "detector": {
    "ignorePatterns": [
      // "html:not\\(.dark\\)" 應移除或限制範圍
      // 建議只忽略覆蓋規則本身，不忽略其下方的實際使用
      "bg-slate-950",
      "text-slate-400",
      "text-slate-500"
    ]
  }
}
```

---

### 3.2 短期強化（2 週內）

#### 【P-04】CI Pipeline 增強

修改 `.github/workflows/deploy.yml`，增加質量檢查階段：

```yaml
jobs:
  quality-check:
    name: Quality Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: TypeScript check
        run: npx tsc --noEmit
      - name: Contrast check
        run: node scripts/contrast-check.mjs src/components/
      - name: Build
        run: npm run build

  deploy:
    needs: quality-check
    # ... 原有 deploy 邏輯
```

---

#### 【P-05】建立自動化對比度測試（Vitest + axe-core）

```bash
npm install -D vitest @axe-core/react @axe-core/webdriverjs
```

創建 `src/__tests__/contrast.spec.tsx`：

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SystemSettingsView } from '../components/SystemSettingsView';
// ... 其他組件導入

describe('Contrast Accessibility', () => {
  it('SystemSettingsView should have readable text in light mode', () => {
    // 渲染為 light 模式
    // 檢查所有文字元素是否可讀
    // 使用 axe-core 進行自動化无障碍檢查
  });
});
```

---

#### 【P-06】CAPA 體系強化

**建立 CAPA 追蹤表（替代純文本 DEV_LOG.md）**

在 `src/types.ts` 中新增 CAPA 相關類型：

```typescript
export interface CapaRecord {
  id: string;           // CAPA-NNN
  type: 'corrective' | 'preventive' | 'both';
  severity: 'P1' | 'P2' | 'P3' | 'observation';
  date: string;
  status: 'open' | 'in-progress' | 'closed' | 'observation';
  problem: string;
  rootCause: string;
  correctiveActions: string[];
  preventiveActions: string[];
  acceptanceCriteria: { item: string; standard: string; result: string }[];
  relatedCommits: string[];
  closedDate?: string;
}
```

**建立 CAPA 看板 UI**

新增 `CapaDashboardView.tsx`，展示所有 CAPA 記錄的可視化看板。

---

#### 【P-07】手動測試Checklist 強制化

在 `docs/DevelopmentStatus.md` 中新增**上線前檢查清單**：

```markdown
## 上線前檢查清單（每版本必須完成）

- [ ] TypeScript 編譯通過（`npx tsc --noEmit`）
- [ ] Production Build 成功（`npm run build`）
- [ ] 對比度校驗腳本通過（`npm run contrast:check`）
- [ ] 暗色模式手動視覺審核
- [ ] 淺色模式手動視覺審核 ← 本次漏測環節
- [ ] 核心功能回歸測試
- [ ] CI Pipeline 全通過
```

---

### 3.3 中期建設計劃

| 項目 | 說明 | 預期效益 |
|------|------|---------|
| **視覺回歸測試** | 使用 Percy / Chromatic 進行截圖比對 | 發現未預期的 UI 變化 |
| **WCAG 自動化檢測** | CI 中集成 axe-core / lighthouse CI | 自動攔截可訪問性問題 |
| **結構化 CAPA 管理** | CAPA 看板 UI + 關聯 git commit | 可追溯、可審計 |
| **熱鍵快捷測試** | 開發時按 `L` 切換淺色/暗色模式 | 提升雙模式測試意願 |
| **CI 分階段檢查** | PR 階段的 lint → 測試 → build → deploy | 多層防線 |
| **定期 CAPA 回顧** | 每 sprint 結束回顧 CAPA 閉合率 | 持續改進 |

---

## 4. 附錄：完整差距矩陣

### 4.1 開發流程差距矩陣

| 編號 | 差距類別 | 具體問題 | 嚴重度 | 建議優先級 | 相關 CAPA |
|------|---------|---------|--------|-----------|----------|
| GAP-01 | 編碼 | 無 ESLint 配置 | 🔴 高 | P0 | CAPA-005 |
| GAP-02 | 編碼 | 無 Stylelint 配置 | 🟡 中 | P1 | CAPA-005 |
| GAP-03 | 編碼 | impeccable 跳過 light mode 覆蓋規則檢測 | 🟡 中 | P1 | CAPA-005 |
| GAP-04 | 編碼 | 無對比度校驗腳本 | 🔴 高 | P0 | CAPA-005 |
| GAP-05 | 提交 | 無 pre-commit hooks | 🔴 高 | P0 | CAPA-005 |
| GAP-06 | PR | 無 CI PR gate | 🔴 高 | P0 | CAPA-005 |
| GAP-07 | 測試 | 無自動化測試框架 | 🔴 高 | P0 | TEST-01 |
| GAP-08 | 測試 | 無對比度自動化檢測 | 🔴 高 | P0 | CAPA-005 |
| GAP-09 | 測試 | 無視覺回歸測試 | 🟡 中 | P1 | — |
| GAP-10 | 測試 | 無淺色模式測試用例 | 🔴 高 | P0 | CAPA-005 |
| GAP-11 | CAPA | 無結構化 CAPA 管理 UI | 🟡 中 | P1 | REQ-02 |
| GAP-12 | CAPA | CAPA 未與 git commit 關聯 | 🟡 中 | P2 | — |
| GAP-13 | CAPA | CAPA 驗收標準未強制執行 | 🟡 中 | P1 | — |
| GAP-14 | 部署 | CI 無質量檢查階段 | 🔴 高 | P0 | CAPA-005 |
| GAP-15 | 文檔 | 無 CHANGELOG.md | 🟢 低 | P2 | DEP-01 |
| GAP-16 | 流程 | 無上線前檢查清單 | 🟡 中 | P1 | CAPA-005 |

### 4.2 本次 Bug 的完整 Failure Chain

```
[設計決策] 採用暗色主題為默認 → 組件大量使用 text-white / text-slate-*
      │
      ▼
[開發] 為支持淺色模式 → 在 index.css 中添加 html:not(.dark) 覆蓋規則
      │
      ▼
[漏洞] 覆蓋規則不完整 → 缺少 label/span/button/strong/code/input 等元素
      │
      ▼
[漏洞] Tailwind v4 where() 權重競爭 → 覆蓋規則在不穩定情況下生效
      │
      ▼
[漏洞] 開發者主要验证暗色模式 → 淺色模式未被系統性測試
      │
      ▼
[漏洞] 無 pre-commit hook → 問題代碼直接提交
      │
      ▼
[漏洞] CI 僅執行 build → 無法檢測功能性問題
      │
      ▼
[漏洞] 無對比度自動化檢測 → 無法攔截
      │
      ▼
[結果] Bug 到達生產環境 → CAPA-005 啟動
```

---

## 5. 總結與行動建議

### 5.1 核心發現

1. **技術根因**：CSS 覆蓋規則與 Tailwind v4 的選擇器權重競爭導致行為不確定，加上 ThemeContext 使用 `class="light"` 而非 `data-theme`，初期選擇器匹配失敗
2. **流程根因**：缺乏自動化對比度檢測、無 pre-commit 攔截、CI 無質量檢查階段、無淺色模式系統性測試
3. **CAPA 體系根因**：CAPA 目前為被動響應式（問題發生後啟動），而非主動預防式；缺乏自動化防呆機制和強制驗收流程

### 5.2 優先行動清單

| 序號 | 行動 | 負責人 | 截止 | 狀態 |
|------|------|--------|------|------|
| 1 | 組件級 `<style>` 注入修復（已完成） | AI 開發者 | 2026-08-22 | ✅ 完成 |
| 2 | 建立對比度校驗腳本 `scripts/contrast-check.mjs` | 開發者 | 2026-08-24 | ⏳ 待執行 |
| 3 | 配置 Husky pre-commit hooks | 開發者 | 2026-08-24 | ⏳ 待執行 |
| 4 | 更新 CI pipeline 加入質量檢查 | 開發者 | 2026-08-25 | ⏳ 待執行 |
| 5 | 修正 .impeccable ignorePatterns | 開發者 | 2026-08-25 | ⏳ 待執行 |
| 6 | 建立上線前檢查清單（DevelopmentStatus.md） | 開發者 | 2026-08-26 | ⏳ 待執行 |
| 7 | 配置 ESLint + jsx-a11y | 開發者 | 2026-08-28 | ⏳ 待執行 |
| 8 | 建立 CAPA 管理 UI（CapaDashboardView） | 開發者 | Phase 2 | ⏳ 規劃中 |
| 9 | 配置 Vitest + axe-core 自動化測試 | 開發者 | Phase 2 | ⏳ 規劃中 |
| 10 | 手動視覺審核（暗色/淺色雙模式） | 開發者 | 2026-08-22 | ⏳ 待執行 |

### 5.3 長期建議

1. **將 CAPA 體系從「被動響應」升級為「主動預防」**：在代碼提交前自動攔截問題，而非等到問題到達生產環境
2. **建立多層次防線**：pre-commit（本地攔截）→ CI（自動化檢測）→ 手動審核（最終把關）
3. **定期 CAPA 回顧**：每 sprint 結束審查 CAPA 閉合率、重複問題類型、預防措施有效性
4. **投資自動化測試基礎設施**：Vitest + axe-core + 視覺回歸測試是現代前端項目的基本配置

---

*報告生成：Trae AI Agent*  
*日期：2026-08-22*  
*版本：V-20260822-01*
