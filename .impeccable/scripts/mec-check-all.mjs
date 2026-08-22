#!/usr/bin/env node
/**
 * MECE 批量校驗腳本
 *
 * 用途：掃描 docs/ 下所有 CAPA 報告並進行 MECE 完整性檢查
 * 用法：node .impeccable/scripts/mec-check-all.mjs
 */

import { readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DOCS_DIR = join(ROOT, 'docs');
const VALIDATOR = join(__dirname, 'mec-validator.mjs');

function main() {
  if (!existsSync(DOCS_DIR)) {
    console.error('錯誤：docs/ 目錄不存在');
    process.exit(1);
  }

  // 若傳入參數（本次提交檔案清單），僅檢查這些檔案；否則掃描全部 CAPA 報告
  let files;
  const args = process.argv.slice(2).filter(a => a && !a.startsWith('--'));
  if (args.length > 0) {
    files = args.map(a => join(DOCS_DIR, a.replace(/^.*[\\/]/, ''))).filter(f => existsSync(f));
    if (files.length === 0) {
      console.log('ℹ️  未找到指定之 CAPA 報告，跳過 MECE 校驗');
      process.exit(0);
    }
  } else {
    files = readdirSync(DOCS_DIR)
      .filter(f => f.startsWith('CAPA-') && f.endsWith('.md'))
      .map(f => join(DOCS_DIR, f));
  }

  if (files.length === 0) {
    console.log('ℹ️  未發現 CAPA 報告（docs/CAPA-*.md），跳過 MECE 校驗');
    process.exit(0);
  }

  console.log(`發現 ${files.length} 份 CAPA 報告，開始 MECE 校驗...\n`);

  let failed = [];
  for (const file of files) {
    const baseName = basename(file);
    try {
      execSync(`node "${VALIDATOR}" "${file}"`, {
        cwd: ROOT,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      console.log(`  ✅ ${baseName}`);
    } catch (e) {
      console.log(`  ❌ ${baseName}`);
      failed.push(baseName);
    }
  }

  console.log('');
  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} 份報告未通過 MECE 校驗：${failed.join(', ')}`);
    console.error('   後續新增的 CAPA 報告請使用 .impeccable/mec-pre-injection-prompt.md 模板格式');
    console.error('   （歷史報告已以非模板格式撰寫，可選擇性忽略）');
    process.exit(1);
  } else {
    console.log('✅ 所有 CAPA 報告通過 MECE 完整性校驗');
    process.exit(0);
  }
}

main();
