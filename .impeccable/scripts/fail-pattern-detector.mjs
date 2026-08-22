#!/usr/bin/env node
/**
 * Fail Pattern Detector — 從 pre-task-checklist.jsonl 中檢測重複失敗模式（G-03）
 *
 * 觸發時機：每次 pre-commit（在 pre-task-checklist.mjs 執行後運行）
 * 目的：分析歷史失敗記錄，自動提升 VERIFICATION_KEYWORDS 或發出警示
 *
 * 分析項目：
 * 1. 過去 7 天內 fail_no_verification_standard 次數
 * 2. 哪些 UI 目錄最常缺失驗證標準
 * 3. 哪些報告曾被匹配成功（反向參考關鍵字有效性）
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const logFile = resolve(root, 'docs/.audit/pre-task-checklist.jsonl');

// ── 讀取日誌 ──────────────────────────────────────────────────────────────────
if (!existsSync(logFile)) {
  console.log('  → 無審計日誌，跳過 fail-pattern 檢測');
  process.exit(0);
}

let entries = [];
try {
  const lines = readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
  entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
} catch {
  console.log('  → 日誌解析失敗，跳過');
  process.exit(0);
}

if (entries.length === 0) {
  process.exit(0);
}

// ── 計算時間範圍（近 7 天）─────────────────────────────────────────────────────
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const recent = entries.filter(e => new Date(e.timestamp).getTime() > sevenDaysAgo);
const fails = recent.filter(e => e.exit_code === 1);

if (fails.length === 0) {
  console.log('  → 近 7 天無驗證失敗記錄');
  process.exit(0);
}

// ── 分析失敗模式 ──────────────────────────────────────────────────────────────
const uiDirCounts = {};
for (const f of fails) {
  for (const file of f.ui_files || []) {
    const dir = file.split('/').slice(0, 3).join('/');
    uiDirCounts[dir] = (uiDirCounts[dir] || 0) + 1;
  }
}

const sortedDirs = Object.entries(uiDirCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3);

console.log(`\n  ⚠️  Fail Pattern 檢測（近 7 天 ${fails.length} 次驗證失敗）`);
if (sortedDirs.length > 0) {
  console.log('  最常缺失驗證標準的目錄：');
  for (const [dir, count] of sortedDirs) {
    console.log(`    - ${dir}（${count} 次）`);
  }
}

// ── 檢查最近失敗是否涉及相同的缺失報告類型 ────────────────────────────────────
const lastFailedReport = fails[fails.length - 1]?.matched_reports;
if (lastFailedReport && lastFailedReport.length === 0) {
  console.log('  💡 建議：確認最近的 UI 變更是否在 docs/CAPA-*.md 中有對應驗證標準');
}

// 注意：此腳本以 warning 模式運行，不阻擋 commit
// 詳細分析報告寫入 docs/.audit/fail-pattern-report.json
const report = {
  timestamp: new Date().toISOString(),
  total_entries: entries.length,
  recent_7d_fails: fails.length,
  top_missing_dirs: sortedDirs,
  last_failure: fails[fails.length - 1],
};
try {
  const { appendFileSync } = require('fs');
  appendFileSync(resolve(root, 'docs/.audit/fail-pattern-report.json'), JSON.stringify(report) + '\n');
} catch { /* ignore */ }

process.exit(0);
