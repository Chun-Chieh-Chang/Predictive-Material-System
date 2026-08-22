#!/usr/bin/env node
/**
 * Impeccable Detach Script — 單一步驟完全解耦
 *
 * 用法：
 *   npm run impeccable:detach
 *
 * 會移除所有整合痕跡，不影響 PMS 核心功能。
 */

import { rmSync, unlinkSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();

console.log('🔧 開始執行 Impeccable 解耦...\n');

const TARGETS = [
  { path: 'src/extensions/impeccable', type: 'dir', required: false },
  { path: 'src/semantic-parser', type: 'dir', required: false },
  { path: '.impeccable', type: 'dir', required: false },
  { path: 'scripts/impeccable-init.mjs', type: 'file', required: false },
  { path: 'scripts/impeccable-hook.mjs', type: 'file', required: false },
  { path: 'scripts/impeccable-detach.mjs', type: 'file', required: false },
  { path: '.trae/hooks.json', type: 'file', required: false },
  { path: '.gitmodules', type: 'file', required: false },
];

let removed = 0;
let skipped = 0;

for (const target of TARGETS) {
  const fullPath = join(ROOT, target.path);
  if (existsSync(fullPath)) {
    if (target.type === 'dir') {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✅ 移除目錄: ${target.path}`);
    } else {
      unlinkSync(fullPath);
      console.log(`  ✅ 移除檔案: ${target.path}`);
    }
    removed++;
  } else {
    console.log(`  ⏭️  不存在，跳過: ${target.path}`);
    skipped++;
  }
}

// 從 .gitignore 移除 impeccable 相關行
const gitignorePath = join(ROOT, '.gitignore');
if (existsSync(gitignorePath)) {
  let content = readFileSync(gitignorePath, 'utf-8');
  const immacLineRegex = /.*impeccable.*/g;
  const lines = content.split('\n');
  const filtered = lines.filter(line => !line.includes('impeccable'));
  if (filtered.length !== lines.length) {
    writeFileSync(gitignorePath, filtered.join('\n') + '\n');
    console.log('  ✅ 從 .gitignore 移除 impeccable 規則');
    removed++;
  }
}

// 從 package.json 移除相關 scripts
const pkgPath = join(ROOT, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const keysToRemove = ['impeccable:init', 'impeccable:audit', 'impeccable:detach'];
  let pkgChanged = false;
  for (const key of keysToRemove) {
    if (pkg.scripts?.[key]) {
      delete pkg.scripts[key];
      pkgChanged = true;
      console.log(`  ✅ 從 package.json 移除 script: ${key}`);
    }
  }
  if (pkgChanged) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

console.log(`\n✅ 解耦完成！移除了 ${removed} 個項目，跳過 ${skipped} 個不存在項目。`);
console.log('   PMS 核心功能不受影響。');
console.log('   建議執行：git clean -fd 清理可能遺留的空目錄。\n');
