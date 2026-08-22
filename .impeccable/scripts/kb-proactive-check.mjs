#!/usr/bin/env node
/**
 * KB Proactive Check — 開發時主動預警（Requirement 3）
 *
 * 執行時機：
 *   - 每次 pre-commit（在 pre-task-checklist 之後）
 *   - 每次 pre-push（在 fail-pattern-detector 之後）
 *
 * 功能：
 *   1. 讀取 staged 檔案清單
 *   2. 分析變更內容（新增/修改的行）
 *   3. 比對知識庫中的相關問題模式
 *   4. 若命中已知問題，提前預警並提供修復模板
 *
 * 注意：此腳本以 warning 模式運行，不阻擋 commit/push
 * （類似 fail-pattern-detector 的設計哲學）
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const kbPath = resolve(root, '.impeccable/kb/issues.yaml');

// ── 簡易 YAML 解析（逐行掃描，與 kb-indexer 一致）──────────────────────────
function loadKB() {
  if (!existsSync(kbPath)) return { entries: [] };
  try {
    const content = readFileSync(kbPath, 'utf-8');
    const lines = content.split('\n');
    const entries = [];
    let currentEntry = null;
    let currentField = null;
    let inBlockScalar = false;
    let blockContent = [];

    const flushField = () => {
      if (currentField && inBlockScalar && blockContent.length > 0 && currentEntry) {
        currentEntry[currentField] = blockContent.join('\n').trim();
        blockContent = [];
        inBlockScalar = false;
      }
    };

    for (const line of lines) {
      if (line.match(/^  - id:/)) {
        flushField();
        if (currentEntry) entries.push(currentEntry);
        currentEntry = { tags: [], scenarios: [], file_paths: [], verification: [] };
        const m = line.match(/id:\s*(.+)/);
        currentEntry.id = m ? m[1].trim() : null;
        currentField = null;
        inBlockScalar = false;
        continue;
      }
      if (!currentEntry) continue;

      // block scalar 內容收集（4 空格縮排行或空行）
      if (inBlockScalar) {
        if (line.startsWith('    ')) {
          blockContent.push(line.replace(/^    /, ''));
        } else if (line.trim() === '') {
          // 空行在 block scalar 內跳過，不關閉
        } else {
          // 非 4 空格縮排行 → block scalar 結束
          inBlockScalar = false;
          if (currentField && blockContent.length > 0) {
            currentEntry[currentField] = blockContent.join('\n').trim();
            blockContent = [];
          }
          // 重新處理這行（可能为新 field 或 list item）
          const fm2 = line.match(/^    (\w+):\s*(.+)$/);
          const lm2 = line.match(/^      - (.+)$/);
          if (fm2) {
            currentField = fm2[1];
            const val = fm2[2].trim().replace(/^["']|["']$/g, '');
            if (val === '|') {
              inBlockScalar = true;
              blockContent = [];
              currentEntry[currentField] = '';
            } else if (val === 'null' || val === '') {
              currentEntry[currentField] = [];
              currentField = null;
            } else {
              currentEntry[currentField] = val;
              currentField = null;
            }
          } else if (lm2 && currentField) {
            const item = lm2[1].trim().replace(/^["']|["']$/g, '');
            if (!Array.isArray(currentEntry[currentField])) currentEntry[currentField] = [];
            currentEntry[currentField].push(item);
          }
        }
        continue;
      }

      const fm = line.match(/^    (\w+):\s*(.+)$/);
      const lm = line.match(/^      - (.+)$/);

      if (fm) {
        flushField();
        currentField = fm[1];
        const val = fm[2].trim().replace(/^["']|["']$/g, '');
        if (val === '|') {
          inBlockScalar = true;
          blockContent = [];
          currentEntry[currentField] = '';
        } else if (val === 'null' || val === '') {
          // list fields (tags, scenarios, file_paths, verification) must be initialized as arrays
          currentEntry[currentField] = [];
          currentField = null;
        } else {
          currentEntry[currentField] = val;
          currentField = null;
        }
      } else if (lm && currentField && !inBlockScalar) {
        const item = lm[1].trim().replace(/^["']|["']$/g, '');
        if (!Array.isArray(currentEntry[currentField])) currentEntry[currentField] = [];
        currentEntry[currentField].push(item);
      }
    }
    flushField();
    if (currentEntry) entries.push(currentEntry);
    return { entries };
  } catch { return { entries: [] }; }
}

// ── 獲取 staged 檔案內容（簡易 diff）──────────────────────────────────────────
function getStagedChanges() {
  try {
    const out = execSync('git diff --cached --diff-filter=ACM', {
      cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return out;
  } catch { return ''; }
}

// ── 簡易語義匹配：計算關鍵字重疊分數───────────────────────────────────────────
function scoreMatch(text, tags, scenarios) {
  let score = 0;
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  for (const tag of tags) {
    if (words.some(w => w.includes(tag.toLowerCase()) || tag.toLowerCase().includes(w))) {
      score += 2;
    }
  }
  for (const scenario of scenarios) {
    const sceneWords = scenario.toLowerCase().split(/[\s,，。、；：]/).filter(w => w.length > 2);
    for (const sw of sceneWords) {
      if (words.some(w => w.includes(sw) || sw.includes(w))) {
        score += 1;
      }
    }
  }
  return score;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
console.log('\n🔍 KB Proactive Check — 主動預警（warning 模式）\n');

if (!existsSync(kbPath)) {
  console.log('  → 知識庫尚未建立，跳過主動預警');
  process.exit(0);
}

const kb = loadKB();
if (kb.entries.length === 0) {
  console.log('  → 知識庫無活躍条目，跳過');
  process.exit(0);
}

const stagedContent = getStagedChanges();
if (!stagedContent) {
  console.log('  → 無 staged 變更，跳過');
  process.exit(0);
}

const stagedFiles = execSync('git diff --cached --name-only', {
  cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
}).trim().split('\n').filter(Boolean);

console.log(`  → 檢查 ${stagedFiles.length} 個 staged 檔案`);

const activeEntries = kb.entries.filter(e => e.status === 'active');
const hits = [];

for (const entry of activeEntries) {
  const score = scoreMatch(stagedContent, entry.tags || [], entry.scenarios || []);
  if (score >= 2) {
    hits.push({ entry, score });
  }
}

if (hits.length === 0) {
  console.log('  ✅ 無已知問題模式匹配\n');
  process.exit(0);
}

// 排序並輸出預警
hits.sort((a, b) => b.score - a.score);

console.log('  ⚠️  命中以下已知問題模式：\n');

for (const { entry, score } of hits) {
  const severityIcon = entry.severity === 'critical' ? '🔴' :
                       entry.severity === 'high'   ? '🟠' :
                       entry.severity === 'medium' ? '🟡' : '🟢';

  console.log(`  ${severityIcon} [${entry.category}] ${entry.title}（匹配度 ${score}）`);
  if (entry.source_capa) console.log(`     來源：${entry.source_capa}`);
  if (entry.root_cause) console.log(`     根因：${entry.root_cause?.slice(0, 120)}...`);
  if (entry.fix_code) {
    const preview = entry.fix_code.split('\n').slice(0, 3).join('\n           ');
    console.log(`     修復模板：\n           ${preview}`);
  }
  console.log('');
}

console.log('  💡 建議：參考 .impeccable/kb/issues.yaml 中的完整修復方案');
console.log('  ℹ️  此為 warning 模式，不阻擋 commit/push\n');

// 記錄預警（寫入 audit 日誌供 analytics 統計）
try {
  const { appendFileSync } = require('fs');
  const logPath = resolve(root, 'docs/.audit/kb-proactive-log.jsonl');
  const logEntry = {
    timestamp: new Date().toISOString(),
    staged_files: stagedFiles,
    hits: hits.map(h => ({ id: h.entry.id, category: h.entry.category, score: h.score })),
  };
  appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
} catch { /* ignore */ }

process.exit(0);
