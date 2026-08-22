#!/usr/bin/env node
/**
 * 對比度校驗腳本
 *
 * 用途：掃描 TSX 文件中的潛在低對比度組合
 * 用法：node .impeccable/scripts/contrast-check.mjs [source-dir]
 *   預設掃瞄 src/components/
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const TARGET_DIRS = process.argv.slice(2)[0] ? [process.argv[2]] : ['src/components'];
const OUTPUT_DIR = process.argv.slice(2)[0] ? process.argv[2] : 'src/components';

// 潛在低對比度模式定義
const LOW_CONTRAST_PATTERNS = [
  // 白底/淺色背景 + 淺色文字（淺色模式問題）
  {
    name: '白底+淺色字',
    bgPattern: /bg-(white|slate-50|slate-100|slate-200|slate-900\/[0-9]+|slate-950\/[0-9]+)/g,
    textPattern: /text-(white|slate-100|slate-200|slate-300|sky-100|sky-200|sky-300|blue-100|blue-200|cyan-200|cyan-300|amber-200|amber-300|purple-200|purple-300|emerald-200|emerald-300|red-200|red-300|orange-200|orange-300|indigo-200|indigo-300)/g,
    severity: 'HIGH'
  },
  // dark:bg 容器內的 text-white（淺色模式下需覆蓋）
  {
    name: '暗色容器+白色文字',
    bgPattern: /dark:bg-(slate-900|slate-950|slate-800)/g,
    textPattern: /text-white(?!\s*[,\}])/g,
    severity: 'MEDIUM',
    note: '需在 light mode CSS 覆蓋規則中處理'
  },
  // text-slate-400/500 在浅色背景上（對比度可能不足）
  {
    name: 'slate低對比度文字',
    bgPattern: /bg-(white|slate-50|slate-100)/g,
    textPattern: /text-slate-(400|500)/g,
    severity: 'MEDIUM',
    note: '需確認 light mode CSS 覆蓋已到位'
  }
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const findings = [];

  for (const pattern of LOW_CONTRAST_PATTERNS) {
    const bgMatches = content.match(pattern.bgPattern);
    const textMatches = content.match(pattern.textPattern);

    if (bgMatches && textMatches) {
      // 計算粗略的匹配分佈，判斷是否在相同行附近
      const bgLines = new Set();
      const textLines = new Set();

      const bgRegex = new RegExp(pattern.bgPattern.source, 'g');
      const textRegex = new RegExp(pattern.textPattern.source, 'g');

      let lineNum = 1;
      for (const char of content) {
        if (char === '\n') lineNum++;
      }

      // 簡化：只要兩種 pattern 都存在就報告
      findings.push({
        file: filePath,
        pattern: pattern.name,
        severity: pattern.severity,
        note: pattern.note || '',
        bgCount: bgMatches.length,
        textCount: textMatches.length
      });
    }
  }

  return findings;
}

function scanDir(dir) {
  const allFindings = [];

  function walk(currentDir) {
    for (const entry of readdirSync(currentDir, { recursive: true })) {
      const fullPath = join(currentDir, entry);
      try {
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith('.tsx') || entry.endsWith('.jsx')) {
          allFindings.push(...checkFile(fullPath));
        }
      } catch { /* ignore */ }
    }
  }

  walk(dir);
  return allFindings;
}

function main() {
  const allFindings = [];

  for (const dir of TARGET_DIRS) {
    try {
      allFindings.push(...scanDir(dir));
    } catch (e) {
      console.error(`警告：無法掃描目錄 ${dir}: ${e.message}`);
    }
  }

  if (allFindings.length === 0) {
    console.log('✅ 對比度校驗通過 — 未發現明顯低對比度模式');
    process.exit(0);
  }

  // 按嚴重度分組
  const high = allFindings.filter(f => f.severity === 'HIGH');
  const medium = allFindings.filter(f => f.severity === 'MEDIUM');

  console.log(`\n⚠️  發現 ${allFindings.length} 處潛在低對比度問題`);

  if (high.length > 0) {
    console.log(`\n🔴 高風險 (${high.length} 處):`);
    for (const f of high) {
      console.log(`  ${f.file}`);
      console.log(`    模式: ${f.pattern} (白底×${f.bgCount} 次, 淺色字×${f.textCount} 次)`);
      if (f.note) console.log(`    注意: ${f.note}`);
    }
  }

  if (medium.length > 0) {
    console.log(`\n🟡 中風險 (${medium.length} 處):`);
    for (const f of medium) {
      console.log(`  ${f.file}: ${f.pattern}`);
      if (f.note) console.log(`    注意: ${f.note}`);
    }
  }

  // 報告已保存（無論通過與否）
  const reportPath = join(process.cwd(), '.mec-report.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFindings: allFindings.length,
    highRisk: high.length,
    mediumRisk: medium.length,
    findings: allFindings
  }, null, 2));
  console.log(`\n📄 報告已保存：${reportPath}`);

  // 不阻塞提交：僅輸出報告，由 CI/MECE 流程進行最終決策
  console.log(`\n⚠️  對比度校驗完成 — ${high.length} 高風險 / ${medium.length} 中風險`);
  console.log('   請參考 .mec-report.json 並確認淺色模式視覺效果');
  process.exit(0);
}

main().catch(e => {
  console.error('對比度校驗腳本執行錯誤:', e.message);
  process.exit(1);
});
