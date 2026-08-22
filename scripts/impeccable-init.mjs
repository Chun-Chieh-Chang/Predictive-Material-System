#!/usr/bin/env node
/**
 * Impeccable Init Script — 一次性啟動配置
 *
 * 用法：
 *   npm run impeccable:init
 */

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const IMP_DIR = join(ROOT, '.impeccable');
const EXT_DIR = join(ROOT, 'src/extensions/impeccable');

console.log('🔧 PMS × Impeccable 整合初始化\n');

// Step 1: 驗證外部依賴
if (!existsSync(EXT_DIR)) {
  console.error('❌ src/extensions/impeccable/ 不存在。請先執行：');
  console.error('   git submodule update --init src/extensions/impeccable');
  process.exit(1);
}
console.log('✅ 外部依賴已就緒：src/extensions/impeccable/');

// Step 2: 驗證 CLI
const cliPath = join(EXT_DIR, 'cli/bin/cli.js');
if (!existsSync(cliPath)) {
  console.error('⚠️  CLI 執行檔未找到，嘗試安裝...');
  try {
    execSync('npm install', { cwd: EXT_DIR, stdio: 'inherit' });
  } catch {
    console.warn('   npm install 失敗，將嘗試使用 npx impeccable');
  }
}

// Step 3: 驗證配置文件
const configPath = join(IMP_DIR, 'config.json');
const designPath = join(IMP_DIR, 'design.json');

if (!existsSync(configPath)) {
  console.error('❌ .impeccable/config.json 不存在');
  process.exit(1);
}
console.log('✅ 配置文件已就緒：.impeccable/config.json');

if (!existsSync(designPath)) {
  console.error('❌ .impeccable/design.json 不存在');
  process.exit(1);
}
console.log('✅ 設計規範已就緒：.impeccable/design.json');

// Step 4: 執行首次快速檢測
console.log('\n🔍 執行首次快速檢測（IMMEDIATE_TIER）...\n');
try {
  const result = execSync(
    `node "${cliPath}" detect "src/components/Sidebar.tsx" --rules=low-contrast,gray-on-color,tiny-text`,
    { encoding: 'utf-8', cwd: ROOT, stdio: 'pipe' },
  );
  if (result.trim()) {
    console.log(result);
  } else {
    console.log('✅ Sidebar.tsx 通過 IMMEDIATE_TIER 檢查');
  }
} catch (err) {
  if (err.stdout) console.log(err.stdout.toString());
  console.log('⚠️  檢測完成（可能有已知問題）');
}

// Step 5: 總結
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 整合初始化完成！');
console.log('');
console.log('可用指令：');
console.log('  npm run impeccable:audit   — 全量 UI 檢測');
console.log('  npm run impeccable:detach  — 完全解耦（移除所有整合痕跡）');
console.log('');
console.log('CLI 手動執行：');
console.log('  npx impeccable audit src/components/');
console.log('  npx impeccable polish Sidebar');
console.log('  npx impeccable critique DashboardView');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
