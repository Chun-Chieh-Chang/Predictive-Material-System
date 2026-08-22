#!/usr/bin/env node
/**
 * Impeccable Attach Script — 解耦後重新掛接
 *
 * 用途：
 *   npm run impeccable:attach
 *
 * 功能：
 *   1. 驗證子模組存在（若無則提示初始化）
 *   2. 恢復 .impeccable/ 配置
 *   3. 恢復 src/semantic-parser/ 模組
 *   4. 恢復 scripts/impeccable-*.mjs
 *   5. 恢復 .trae/hooks.json
 *   6. 恢復 docs/DESIGN.md
 *   7. 恢復 tsconfig.json exclude 規則
 *   8. 自動補回 package.json scripts
 */

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();

console.log('🔧 PMS × Impeccable 重新掛接...\n');

// ── 步驟 1：驗證子模組 ──────────────────────────────────────────────────────

const EXT_DIR = join(ROOT, 'src/extensions/impeccable');
if (!existsSync(EXT_DIR)) {
  console.log('⚠️  src/extensions/impeccable/ 不存在，嘗試初始化子模組...');
  try {
    execSync('git submodule update --init src/extensions/impeccable', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('✅ 子模組初始化完成\n');
  } catch {
    console.error('❌ 子模組初始化失敗。請手動執行：');
    console.error('   git submodule add https://github.com/pbakaus/impeccable.git src/extensions/impeccable\n');
    process.exit(1);
  }
} else {
  console.log('✅ 子模組已就緒：src/extensions/impeccable/\n');
}

// ── 步驟 2：從 commit 恢復檔案 ────────────────────────────────────────────────

// 找出最近一次包含整合內容的 commit hash
const INTEGRATION_COMMITS = [
  '34794e8', // 含 package.json scripts
  '88f3bb0', // Phase 1-4 主 commit
  'f259805', // 初始 submodule
];

let SOURCE_COMMIT = null;
for (const hash of INTEGRATION_COMMITS) {
  try {
    execSync(`git rev-parse --verify ${hash}^{commit}`, { cwd: ROOT, stdio: 'pipe' });
    SOURCE_COMMIT = hash;
    break;
  } catch {
    continue;
  }
}

if (!SOURCE_COMMIT) {
  console.error('❌ 找不到整合 commit，無法恢復。請手動重新執行 npx impeccable install。');
  process.exit(1);
}

console.log(`📦 使用 commit ${SOURCE_COMMIT} 作為恢復來源\n`);

const FILES_TO_RESTORE = [
  '.impeccable/config.json',
  '.impeccable/design.json',
  'src/semantic-parser/types.ts',
  'src/semantic-parser/IntentClassifier.ts',
  'src/semantic-parser/EntityExtractor.ts',
  'src/semantic-parser/ErrorValidator.ts',
  'src/semantic-parser/ParamMapper.ts',
  'src/semantic-parser/index.ts',
  'src/semantic-parser/__tests__/semantic-parser.test.ts',
  'scripts/impeccable-init.mjs',
  'scripts/impeccable-hook.mjs',
  'scripts/impeccable-detach.mjs',
  '.trae/hooks.json',
  'docs/DESIGN.md',
];

let restored = 0;
let skipped = 0;

for (const file of FILES_TO_RESTORE) {
  const fullPath = join(ROOT, file);
  if (existsSync(fullPath)) {
    console.log(`  ⏭️  已存在，跳過: ${file}`);
    skipped++;
    continue;
  }
  try {
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const content = execSync(`git show ${SOURCE_COMMIT}:${file}`, { cwd: ROOT, encoding: 'utf-8' });
    writeFileSync(fullPath, content);
    console.log(`  ✅ 恢復: ${file}`);
    restored++;
  } catch {
    console.log(`  ❌ 恢復失敗: ${file}`);
  }
}

// ── 步驟 3：恢復 tsconfig.json exclude ───────────────────────────────────────

const TS_CONFIG_PATH = join(ROOT, 'tsconfig.json');
if (existsSync(TS_CONFIG_PATH)) {
  let tsconfig = JSON.parse(readFileSync(TS_CONFIG_PATH, 'utf-8'));
  const currentExclude = tsconfig.exclude || [];
  const needsExclude = !currentExclude.includes('src/extensions/impeccable');
  if (needsExclude) {
    tsconfig.exclude = [...currentExclude, 'src/extensions/impeccable'];
    writeFileSync(TS_CONFIG_PATH, JSON.stringify(tsconfig, null, 2) + '\n');
    console.log('  ✅ 更新 tsconfig.json exclude');
    restored++;
  } else {
    console.log('  ⏭️  tsconfig.json 已有 exclude 規則，跳過');
    skipped++;
  }
}

// ── 步驟 4：補回 package.json scripts ───────────────────────────────────────

const PKG_PATH = join(ROOT, 'package.json');
if (existsSync(PKG_PATH)) {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
  const targetScripts = {
    'impeccable:init': 'node scripts/impeccable-init.mjs',
    'impeccable:audit': 'npx impeccable audit src/components/',
    'impeccable:detach': 'node scripts/impeccable-detach.mjs',
    'impeccable:attach': 'node scripts/impeccable-attach.mjs',
  };

  let pkgChanged = false;
  for (const [key, value] of Object.entries(targetScripts)) {
    if (!pkg.scripts?.[key]) {
      pkg.scripts = pkg.scripts || {};
      pkg.scripts[key] = value;
      console.log(`  ✅ 新增 script: ${key}`);
      pkgChanged = true;
    } else {
      console.log(`  ⏭️  script 已存在: ${key}`);
    }
  }

  if (pkgChanged) {
    writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
    restored++;
  } else {
    skipped++;
  }
}

// ── 步驟 5：驗證 ─────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ 掛接完成！恢復 ${restored} 個項目，跳過 ${skipped} 個。`);
console.log('');
console.log('可用指令：');
console.log('  npm run impeccable:init    — 初始化設計上下文');
console.log('  npm run impeccable:audit   — 全量 UI 檢測');
console.log('  npm run impeccable:detach  — 完全解耦');
console.log('  npm run impeccable:attach  — 重新掛接（本腳本）');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
