#!/usr/bin/env node
/**
 * Pre-task Checklist — 強制要求開發任務啟動前完成驗證標準定義（PA-01）
 *
 * 觸發時機：pre-commit（有 UI 相關 staged 檔案時執行）
 * 目的：防止以模糊需求直接編碼而跳過驗證標準定義
 *
 * 檢查邏輯：
 * 1. 取得 staged 檔案清單
 * 2. 若有 UI 檔案變更（.tsx/.css），檢查 docs/ 是否有包含「驗證標準」的 CAPA/UI 報告
 * 3. 若有報告但未含驗證標準 → exit 1
 * 4. 若無 UI 變更 → 直接通過
 *
 * 【自 2026-08-22 起】新增結構化日誌輸出：
 * - 每次執行結果寫入 docs/.audit/pre-task-checklist.jsonl
 * - 格式：{"timestamp","commit_sha","staged_files":[],"ui_files":[],"has_standard":bool,"matched_reports":[],"exit_code":0|1}
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const docsDir = resolve(root, 'docs');
const auditDir = resolve(docsDir, '.audit');

// ── 確保 audit 目錄存在 ───────────────────────────────────────────────────────
mkdirSync(auditDir, { recursive: true });

const LOG_FILE = resolve(auditDir, 'pre-task-checklist.jsonl');

// ── 輔助：遞迴掃描目錄取得 .md 檔案列表 ───────────────────────────────────────
function mdFiles(dir) {
  let result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      result = result.concat(mdFiles(full));
    } else if (entry.name.endsWith('.md')) {
      result.push(full);
    }
  }
  return result;
}

// ── 取得 staged 檔案 ──────────────────────────────────────────────────────────
let changedFiles = [];
try {
  const out = execSync(
    'git diff --cached --name-only --diff-filter=ACM',
    { cwd: root, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }
  ).trim();
  changedFiles = out ? out.split('\n').filter(Boolean) : [];
} catch { /* 非 git 環境 */ }

if (changedFiles.length === 0) {
  console.log('  → 無 staged 檔案，跳過 UI 驗證標準檢查');
  // 記錄跳過事件
  appendFileSync(LOG_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    commit_sha: '',
    staged_files: [],
    ui_files: [],
    reason: 'no_staged_files',
    has_standard: null,
    matched_reports: [],
    exit_code: 0,
  }) + '\n');
  process.exit(0);
}

// ── 取得本次 commit SHA ──────────────────────────────────────────────────────
let commitSha = '';
try {
  commitSha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf-8' }).trim();
} catch { /* 非 git 環境 */ }

// ── 判斷是否涉及 UI 變更 ─────────────────────────────────────────────────────
const UI_EXTS   = ['.tsx', '.jsx', '.vue', '.css', '.scss', '.less'];
const UI_DIRS   = ['src/components/', 'src/pages/', 'src/views/', 'src/app/'];

const hasUIChange = changedFiles.some(f =>
  UI_EXTS.some(ext => f.endsWith(ext)) ||
  UI_DIRS.some(d => f.includes(d))
);

const uiFiles = changedFiles.filter(f =>
  UI_EXTS.some(ext => f.endsWith(ext)) ||
  UI_DIRS.some(d => f.includes(d))
);

if (!hasUIChange) {
  console.log('  → 本次未變更 UI 檔案，跳過驗證標準檢查');
  appendFileSync(LOG_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    commit_sha: commitSha,
    staged_files: changedFiles,
    ui_files: [],
    reason: 'no_ui_change',
    has_standard: null,
    matched_reports: [],
    exit_code: 0,
  }) + '\n');
  process.exit(0);
}

console.log(`\n⚠️  偵測到 UI 變更（${uiFiles.length} 個檔案）。請確認已定義驗證標準。`);

// ── 搜尋 docs/ 中包含驗證標準的報告 ──────────────────────────────────────────
const reportFiles = mdFiles(docsDir).filter(f =>
  /CAPA-|UI-/.test(basename(f))
);

const VERIFICATION_KEYWORDS = [
  '驗證標準', 'acceptance', 'checklist', '通過標準',
  'screen width', '寬度', '1920', '1280', '768', '375',
  'overflow', '裁切', '可見', 'scroll'
];

function hasVerificationStandard(content) {
  return VERIFICATION_KEYWORDS.some(kw =>
    new RegExp(kw, 'i').test(content)
  );
}

const validReports = [];
for (const file of reportFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    if (hasVerificationStandard(content)) {
      validReports.push(basename(file));
    }
  } catch { /* ignore */ }
}

if (validReports.length > 0) {
  console.log(`  ✅ 已找到含驗證標準的報告：${validReports.join(', ')}`);
  appendFileSync(LOG_FILE, JSON.stringify({
    timestamp: new Date().toISOString(),
    commit_sha: commitSha,
    staged_files: changedFiles,
    ui_files: uiFiles,
    reason: 'pass',
    has_standard: true,
    matched_reports: validReports,
    exit_code: 0,
  }) + '\n');
  process.exit(0);
}

// ── 未找到 → 阻擋 commit ─────────────────────────────────────────────────────
const logEntry = {
  timestamp: new Date().toISOString(),
  commit_sha: commitSha,
  staged_files: changedFiles,
  ui_files: uiFiles,
  reason: 'fail_no_verification_standard',
  has_standard: false,
  matched_reports: validReports,
  exit_code: 1,
};
appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');

console.error(`
❌ UI 驗證標準檢查未通過

變更的 UI 檔案尚未在 docs/CAPA-*.md 中定義驗證標準。
請先建立或更新 CAPA 報告，包含「驗證標準」章節。

建議結構：
  ## 驗證標準
  | 螢幕寬度 | 驗證項目 | 通過標準 |
  |----------|----------|----------|
  | >= 1920px | 按鈕完整可見 | 無需水平滾動 |
  | >= 768px  | 面板不超出可視區 | max-w 生效 |
  | >= 375px  | 移動端可捲動 | 手指滑動正常 |

參考：docs/CAPA-007-ButtonClippingRootCauseAnalysis.md

若為緊急 Hotfix，可用：git commit --no-verify
`);

process.exit(1);
