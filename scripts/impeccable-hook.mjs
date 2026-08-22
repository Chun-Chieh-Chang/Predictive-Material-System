#!/usr/bin/env node
/**
 * Impeccable Hook Script — Trae IDE integration
 *
 * 讀取 stdin JSON event，分析編輯的 UI 檔案，
 * 並透過 npx impeccable 執行對應的 detector 檢查。
 *
 * 用法：
 *   echo '{"event":"postToolUse","files":[...]}' | node impeccable-hook.mjs
 *   node impeccable-hook.mjs --mode=deep  （Stop 深層掃描）
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const IMPECCABLE_ROOT = resolve(ROOT, 'src/extensions/impeccable');
const IMPECCABLE_CLI = resolve(IMPECCABLE_ROOT, 'cli/bin/cli.js');

// ── IMMEDIATE_TIER 規則（5 秒內必須完成）───────────────────────────────────
const IMMEDIATE_RULES = [
  'broken-image',
  'text-overflow',
  'clipped-overflow-container',
  'body-text-viewport-edge',
  'low-contrast',
  'gray-on-color',
  'tiny-text',
  'gradient-text',
  'dark-glow',
  'design-system-font',
  'design-system-color',
  'design-system-radius',
  'design-system-font-size',
];

// ── 工具函數 ────────────────────────────────────────────────────────────────

function log(message, level = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.error(`[impeccable-hook] ${prefix} ${message}`);
}

function isUIFile(filePath) {
  const uiExtensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.less', '.html', '.vue', '.svelte'];
  return uiExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
}

function getProjectRoot() {
  try {
    const output = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return output.trim();
  } catch {
    return ROOT;
  }
}

// ── 解析 CLI 參數 ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDeepMode = args.includes('--mode=deep') || args.includes('--deep');
const mode = isDeepMode ? 'deep' : 'immediate';

// ── 從 stdin 讀取 event ─────────────────────────────────────────────────────

let eventData = null;
try {
  const stdin = readFileSync('/dev/stdin', 'utf-8');
  if (stdin.trim()) {
    eventData = JSON.parse(stdin);
  }
} catch {
  // 非 pipe 模式（如 CLI 直接呼叫），eventData 為 null
}

// ── 深層模式：直接執行全量 audit ────────────────────────────────────────────

if (mode === 'deep') {
  log('Deep scan mode — running full audit on src/components/', 'info');
  try {
    const result = execSync(
      `node "${IMPECCABLE_CLI}" audit src/components/ --rules=${IMMEDIATE_RULES.join(',')} `,
      {
        encoding: 'utf-8',
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000,
      },
    );
    if (result.trim()) {
      console.log(result);
    }
  } catch (err) {
    // detector 有問題時不崩潰，僅輸出警告
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) log(err.stderr.toString(), 'warn');
  }
  process.exit(0);
}

// ── 即時模式：分析 stdin event ─────────────────────────────────────────────

if (!eventData) {
  // 無事件資料，直接退出（不影響 IDE 正常運作）
  process.exit(0);
}

const files = eventData.files || [];
const uiFiles = files.filter(f => isUIFile(f.filePath || f)).map(f => f.filePath || f);

if (uiFiles.length === 0) {
  process.exit(0);
}

log(`Detected ${uiFiles.length} UI file(s): ${uiFiles.slice(0, 3).join(', ')}${uiFiles.length > 3 ? '...' : ''}`, 'info');

// ── 執行 IMMEDIATE_TIER detector ───────────────────────────────────────────

try {
  const filesArg = uiFiles.map(f => {
    const relative = f.startsWith(ROOT) ? f.slice(ROOT.length + 1) : f;
    return `"${relative.replace(/\\/g, '/')}"`;
  }).join(' ');

  const cmd = `node "${IMPECCABLE_CLI}" detect ${filesArg} --rules=${IMMEDIATE_RULES.join(',')}`;

  const result = execSync(cmd, {
    encoding: 'utf-8',
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  });

  if (result.trim()) {
    console.log(result);
  }
} catch (err) {
  // detector 無發現時 CLI 可能回傳非零 exit code，不視為錯誤
  if (err.stdout) console.log(err.stdout.toString());
  if (err.stderr && !err.stderr.toString().includes('no issues')) {
    log('Detector encountered an issue (non-fatal)', 'warn');
  }
}

process.exit(0);
