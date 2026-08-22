import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const kbPath = resolve(root, '.impeccable/kb/issues.yaml');
const docsDir = resolve(root, 'docs');

// ── YAML 簡易解析器（不依賴外部庫）────────────────────────────────────────────
function parseSimpleYAML(content) {
  const lines = content.split('\n');
  const result = { entries: [] };
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
    // 新條目開始
    if (line.match(/^  - id:/)) {
      flushField();
      if (currentEntry) result.entries.push(currentEntry);
      currentEntry = { tags: [], scenarios: [], file_paths: [], verification: [] };
      const m = line.match(/id:\s*(.+)/);
      if (m) currentEntry.id = m[1].trim();
      currentField = null;
      inBlockScalar = false;
      continue;
    }
    if (!currentEntry) continue;

    // block scalar 內容收集
    if (inBlockScalar) {
      if (line.startsWith('    ')) {
        blockContent.push(line.replace(/^    /, ''));
      } else if (line.trim() === '') {
        // 空行在 block scalar 內跳過
      } else {
        // 非 4 空格縮排行 → block scalar 結束
        inBlockScalar = false;
        if (currentField && blockContent.length > 0) {
          currentEntry[currentField] = blockContent.join('\n').trim();
          blockContent = [];
        }
        // 重新處理這行
        const fm2 = line.match(/^    (\w+):\s*(.+)$/);
        const lm2 = line.match(/^      - (.+)$/);
        if (fm2) {
          currentField = fm2[1];
          const val = fm2[2].trim();
          if (val === '|') { inBlockScalar = true; blockContent = []; currentEntry[currentField] = ''; }
          else if (val === 'null' || val === '') { currentEntry[currentField] = []; currentField = null; }
          else { currentEntry[currentField] = val.replace(/^["']|["']$/g, ''); currentField = null; }
        } else if (lm2 && currentField && currentEntry[currentField] !== null) {
          const item = lm2[1].trim().replace(/^["']|["']$/g, '');
          if (Array.isArray(currentEntry[currentField])) currentEntry[currentField].push(item);
        }
      }
      continue;
    }

    // 字段解析（4 空格縮排）
    const fieldMatch = line.match(/^    (\w+):\s*(.+)$/);
    const listMatch  = line.match(/^      - (.+)$/);

    if (fieldMatch) {
      flushField();
      currentField = fieldMatch[1];
      const val = fieldMatch[2].trim();
      if (val === '|') {
        inBlockScalar = true;
        blockContent = [];
        currentEntry[currentField] = '';
      } else if (val === 'null' || val === '') {
        currentEntry[currentField] = [];
        currentField = null;
      } else {
        currentEntry[currentField] = val.replace(/^["']|["']$/g, '');
        currentField = null;
      }
      continue;
    }

    if (listMatch && currentField && currentEntry[currentField] !== null) {
      const item = listMatch[1].trim().replace(/^["']|["']$/g, '');
      if (Array.isArray(currentEntry[currentField])) {
        currentEntry[currentField].push(item);
      }
    }
  }
  flushField();
  if (currentEntry) result.entries.push(currentEntry);
  return result;
}

// ── YAML 序列化（使用 quoted 字串避免 block scalar 問題）───────────────────────
function stringifyYAML(data) {
  let output = '# PMS Knowledge Base — Auto-generated\n';
  output += '# Do not edit manually. Use kb-indexer.mjs to update.\n\n';
  output += 'entries:\n';

  for (const entry of data.entries) {
    output += `  - id: ${entry.id}\n`;
    if (entry.source_capa) output += `    source_capa: ${entry.source_capa}\n`;
    output += `    title: "${entry.title || ''}"\n`;
    output += `    category: ${entry.category || ''}\n`;

    if (entry.tags && entry.tags.length) {
      output += '    tags:\n';
      for (const t of entry.tags) output += `      - ${t}\n`;
    }
    if (entry.severity) output += `    severity: ${entry.severity}\n`;

    if (entry.scenarios && entry.scenarios.length) {
      output += '    scenarios:\n';
      for (const s of entry.scenarios) output += `      - "${s}"\n`;
    }
    // 多行字串：用雙引號 + \n 轉義，避免 block scalar 解析問題
    if (entry.root_cause) {
      const rc = String(entry.root_cause).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      output += `    root_cause: "${rc}"\n`;
    }
    if (entry.fix_code) {
      const fc = String(entry.fix_code).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      output += `    fix_code: "${fc}"\n`;
    }
    if (entry.verification && entry.verification.length) {
      output += '    verification:\n';
      for (const v of entry.verification) output += `      - "${v}"\n`;
    }
    if (entry.file_paths && entry.file_paths.length) {
      output += '    file_paths:\n';
      for (const fp of entry.file_paths) output += `      - "${fp}"\n`;
    }
    if (entry.created_at) output += `    created_at: "${entry.created_at}"\n`;
    if (entry.last_used) output += `    last_used: "${entry.last_used}"\n`;
    if (entry.reuse_count !== undefined) output += `    reuse_count: ${entry.reuse_count}\n`;
    if (entry.status) output += `    status: ${entry.status}\n`;
    output += '\n';
  }
  return output;
}

// ── 從 CAPA 報告萃取知識 ──────────────────────────────────────────────────────
function extractFromCAPA(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = basename(filePath);
  const capaIdMatch = fileName.match(/(CAPA-\d+)/);
  const capaId = capaIdMatch ? capaIdMatch[1] : null;

  // 提取標題
  const titleMatch = content.match(/##\s*1\.?\s*(?:問題描述|問題)$/m);
  const title = titleMatch
    ? content.slice(titleMatch.index, titleMatch.index + 200).split('\n')[0].replace(/^#+\s*/, '').trim()
    : `${capaId || 'Unknown'} 問題`;

  // 提取根因
  const rootCauseMatch = content.match(/###\s*根本原因分析.*?(?=##\s|$)/s);
  const root_cause = rootCauseMatch
    ? rootCauseMatch[0].replace(/###.*?根本原因分析/, '').trim().slice(0, 800)
    : null;

  // 提取修復代碼
  const fixCodeMatches = content.match(/```(?:\w+)?\n([\s\S]*?)```/g) || [];
  const fix_code = fixCodeMatches
    .map(m => m.replace(/```.*?\n/, '').trim())
    .filter(m => m.length > 20 && m.length < 3000)
    .join('\n\n---\n\n') || null;

  // 提取標籤
  const tagKeywords = [
    'overflow', 'css', 'tailwind', 'github-pages', 'deploy', 'ci-cd',
    'progress', 'reporting', 'false', 'ai-agent', 'typescript',
    'husky', 'hook', 'mece', 'contrast', 'color', 'font', 'typography',
    'layout', 'button', 'clip', 'responsive', 'rwd', 'mobile',
    'material', 'master-file', 'bom', 'mrp'
  ];
  const tags = tagKeywords.filter(kw =>
    new RegExp(kw, 'i').test(content)
  );

  // 提取嚴重度
  const severityMatch = content.match(/嚴重度\s*\|\s*🔴高|🟡中|🟢低/);
  const severityMap = { '🔴高': 'critical', '🟡中': 'medium', '🟢低': 'low' };
  const severity = severityMatch ? severityMap[severityMatch[0].trim()] : 'medium';

  // 提取驗證項目
  const verification = [];
  const verifyMatches = content.match(/\|\s*[^|]*驗證[^|]*\|/g) || [];
  for (const vm of verifyMatches) {
    const items = vm.split('|').filter(s => s.trim()).map(s => s.trim());
    verification.push(...items);
  }

  // 提取場景
  const scenarios = [];
  const scenarioMatches = content.match(/- [「"`'].*?[」"'`].*?[/\\]/g) || [];
  for (const sm of scenarioMatches) {
    if (sm.length > 5 && sm.length < 200) scenarios.push(sm.replace(/['"`»‹»]/g, '').trim());
  }

  return {
    id: capaId || 'UNKNOWN',
    title,
    category: detectCategory(content, tags),
    tags,
    severity,
    scenarios: scenarios.slice(0, 5),
    root_cause: root_cause?.slice(0, 800),
    fix_code,
    verification: verification.slice(0, 5),
    file_paths: [],
    created_at: new Date().toISOString().slice(0, 10),
    last_used: null,
    reuse_count: 0,
    status: 'active',
  };
}

function detectCategory(content, tags) {
  const cssTags = ['overflow', 'css', 'tailwind', 'contrast', 'font', 'layout', 'button', 'clip'];
  const ciTags  = ['github-pages', 'deploy', 'ci-cd', 'husky', 'hook'];
  const procTags = ['progress', 'reporting', 'false', 'ai-agent', 'do-d'];
  const devopsTags = ['typescript', 'build', 'mece'];

  if (tags.some(t => cssTags.includes(t))) return 'CSS';
  if (tags.some(t => ciTags.includes(t)))  return 'CI_CD';
  if (tags.some(t => procTags.includes(t))) return 'PROCESS';
  if (tags.some(t => devopsTags.includes(t))) return 'DEVOPS';
  return 'OTHER';
}

// ── 比對並合併重複場景 ────────────────────────────────────────────────────────
function findSimilarEntry(entries, newEntry) {
  for (const entry of entries) {
    // 相同源 CAPA ID → 更新而非新增（source_capa 可能含逗號分隔多個 ID）
    if (entry.source_capa) {
      const capaIds = entry.source_capa.split(',').map(s => s.trim());
      if (capaIds.includes(newEntry.id)) {
        return { index: entries.indexOf(entry), type: 'update' };
      }
    }
    // 相同 KB id（已處理過的 CAPA 重複執行）
    if (entry.id === newEntry.id) {
      return { index: entries.indexOf(entry), type: 'update' };
    }
    // 標籤重疊 > 50% → 潛在重複
    if (entry.tags && newEntry.tags) {
      const overlap = newEntry.tags.filter(t => entry.tags.includes(t)).length;
      const ratio = overlap / Math.max(entry.tags.length, newEntry.tags.length, 1);
      if (ratio > 0.5) {
        return { index: entries.indexOf(entry), type: 'merge', similarity: ratio };
      }
    }
  }
  return null;
}

function mergeEntries(existing, incoming) {
  const merged = { ...existing };
  // 合併標籤
  if (incoming.tags) {
    const existingTags = new Set(merged.tags || []);
    for (const t of incoming.tags) existingTags.add(t);
    merged.tags = Array.from(existingTags);
  }
  // 合併場景
  if (incoming.scenarios) {
    const existingScenarios = new Set(merged.scenarios || []);
    for (const s of incoming.scenarios) existingScenarios.add(s);
    merged.scenarios = Array.from(existingScenarios);
  }
  // 若有更新的根因分析則替換
  if (incoming.root_cause && incoming.root_cause.length > (merged.root_cause?.length || 0)) {
    merged.root_cause = incoming.root_cause;
  }
  // 若有更新的修復代碼則追加
  if (incoming.fix_code) {
    merged.fix_code = (merged.fix_code || '') + '\n\n/* --- Updated by ' + incoming.id + ' --- */\n' + incoming.fix_code;
  }
  merged.last_used = new Date().toISOString().slice(0, 10);
  return merged;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
console.log('\n📚 KB Indexer — 從 CAPA 報告萃取知識\n');

// 讀取既有知識庫
let kbData = { entries: [] };
if (existsSync(kbPath)) {
  try {
    kbData = parseSimpleYAML(readFileSync(kbPath, 'utf-8'));
    console.log(`  → 載入既有知識庫：${kbData.entries.length} 筆条目`);
  } catch (e) {
    console.error(`  ⚠️  知識庫解析失敗：${e.message}`);
  }
} else {
  console.log('  → 新知識庫，將建立初始 entries');
}

// 掃描 docs/CAPA-*.md
const capaFiles = readdirSync(docsDir)
  .filter(f => /^CAPA-\d+-.*\.md$/.test(f))
  .map(f => resolve(docsDir, f));

console.log(`  → 掃描到 ${capaFiles.length} 份 CAPA 報告\n`);

let added = 0, updated = 0, skipped = 0;

for (const filePath of capaFiles) {
  const fileName = basename(filePath);
  console.log(`  📄 ${fileName}`);

  try {
    const newEntry = extractFromCAPA(filePath);
    const match = findSimilarEntry(kbData.entries, newEntry);
    if (match) {
      if (match.type === 'update') {
        kbData.entries[match.index] = mergeEntries(kbData.entries[match.index], newEntry);
        console.log(`    ✅ 更新既有 entry（${kbData.entries[match.index].id}）`);
        updated++;
      } else {
        const merged = mergeEntries(kbData.entries[match.index], newEntry);
        kbData.entries.splice(match.index, 1, merged);
        console.log(`    🔄 合併重複 entry（similarity: ${(match.similarity * 100).toFixed(0)}%）`);
        updated++;
      }
    } else {
      // 新增
      kbData.entries.push(newEntry);
      console.log(`    ✨ 新增 entry（${newEntry.id}）`);
      added++;
    }
  } catch (e) {
    console.error(`    ❌ 解析失敗：${e.message}`);
    skipped++;
  }
}

// 寫回知識庫
writeFileSync(kbPath, stringifyYAML(kbData), 'utf-8');
console.log(`\n📊 萃取摘要：新增 ${added} 筆、更新 ${updated} 筆、跳過 ${skipped} 筆`);
console.log(`   知識庫現共 ${kbData.entries.length} 筆活躍条目\n`);
