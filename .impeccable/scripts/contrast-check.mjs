#!/usr/bin/env node
/**
 * 嚴謹對比度與卡片配色校驗腳本 (Rigorous Contrast & Card Theme Checker)
 *
 * 用途：精確掃描 TSX/JSX 元件中的卡片容器與文字配色缺陷：
 *  1. 未配對的深色容器（缺少 bg-white 或未加 dark: 前綴）
 *  2. 硬編碼深色漸變背景（在淺色模式下造成黑底黑字或對比度失效）
 *  3. 危險的暴力 CSS 內聯覆蓋（dangerouslySetInnerHTML 注入 lightModeOverrides）
 *  4. 淺色背景上未做深色主題切換的純白文字
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const TARGET_DIRS = process.argv.slice(2)[0] ? [process.argv[2]] : ['src/components'];

const DEFECT_PATTERNS = [
  {
    name: '硬編碼深色漸變背景 (Hardcoded Dark Gradient Container)',
    regex: /className=["'`][^"'`]*\b(bg-gradient-to-[a-z]+)\b[^"'`]*\b(?<!dark:)from-(slate-900|slate-950|purple-950|indigo-950)\b/g,
    severity: 'CRITICAL',
    message: '禁止使用未經淺色模式適配的硬編碼深色漸變容器，應使用 bg-white dark:bg-slate-900 統一卡片規範。'
  },
  {
    name: '未加 dark: 前綴的深色容器 (Raw Dark Background without dark: prefix)',
    check: (content) => {
      const findings = [];
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('import')) return;
        
        // 匹配 className 中包含未加 dark: 的 bg-slate-900 / bg-slate-950
        const classMatches = [...line.matchAll(/className=["'`][^"'`]*\b(?<!dark:)bg-(slate-900|slate-950)(\/[0-9]+)?\b[^"'`]*/g)];
        for (const match of classMatches) {
          const classStr = match[0];
          // 如果沒有同時聲明淺色背景（bg-white, bg-slate-50/100, bg-transparent 等）或不是專門的暗色 code pre 區塊
          if (!/\bbg-(white|slate-50|slate-100|slate-200|transparent|sky-|indigo-|purple-|emerald-|amber-|red-|blue-)/.test(classStr)) {
            // 允許專門的代碼顯示 pre 容器
            if (line.includes('<pre') || line.includes('overflow-x-auto') || line.includes('whitespace-pre')) {
              continue;
            }
            findings.push({
              line: index + 1,
              snippet: line.trim()
            });
          }
        }
      });
      return findings;
    },
    severity: 'HIGH',
    message: '卡片容器應同時聲明淺色與深色背景（例如 bg-white dark:bg-slate-900）。'
  },
  {
    name: '暴力內聯樣式覆蓋 (Hacky dangerouslySetInnerHTML style injection)',
    regex: /dangerouslySetInnerHTML=\{\{\s*__html:\s*lightModeOverrides\s*\}\}/g,
    severity: 'HIGH',
    message: '禁止使用 lightModeOverrides 暴力內聯注入，請使用標準 Tailwind 雙主題 class。'
  },
  {
    name: '實心按鈕白色文字保證 (Solid/Gradient Button White Text Guarantee - CAPA-010)',
    check: (content) => {
      const findings = [];
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('import')) return;
        // 匹配含有深色實心背景的按鈕但缺少 text-white 的情況
        if (line.includes('<button') && /className=["'`][^"'`]*\b(bg-(emerald|blue|sky|purple|indigo|red)-[67]00|from-(purple|indigo|blue|sky|emerald)-[67]00)\b[^"'`]*/.test(line)) {
          if (!line.includes('text-white') && !line.includes('text-slate-100') && !line.includes('text-slate-50')) {
            findings.push({
              line: index + 1,
              snippet: line.trim()
            });
          }
        }
      });
      return findings;
    },
    severity: 'HIGH',
    message: '深底色與高飽和度實心按鈕必須顯式包含 text-white，以確保在所有主題下具備最高對比度 (WCAG AA)。'
  },
  {
    name: '通配屬性選擇器污染卡片文字防呆 (Wildcard Attribute Selector Ban - CAPA-011)',
    check: (content, filePath) => {
      if (!filePath.endsWith('index.css')) return [];
      const findings = [];
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (/\[class\*=["'](from|bg)-[^"']*\]\s*\*/.test(line)) {
          findings.push({
            line: index + 1,
            snippet: line.trim()
          });
        }
      });
      return findings;
    },
    severity: 'HIGH',
    message: '禁止在 CSS 中使用 [class*="from-*"] * 等通配屬性選擇器，會誤傷包含 dark:from-* 的淺色卡片內部文字。'
  }
];

function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const fileFindings = [];

  for (const p of DEFECT_PATTERNS) {
    if (p.regex) {
      const matches = [...content.matchAll(p.regex)];
      if (matches.length > 0) {
        fileFindings.push({
          file: filePath,
          pattern: p.name,
          severity: p.severity,
          message: p.message,
          count: matches.length
        });
      }
    } else if (p.check) {
      const results = p.check(content, filePath);
      if (results.length > 0) {
        fileFindings.push({
          file: filePath,
          pattern: p.name,
          severity: p.severity,
          message: p.message,
          count: results.length,
          details: results
        });
      }
    }
  }

  return fileFindings;
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
  console.log('🔍 執行嚴謹卡片配色與對比度架構校驗 (Rigorous Contrast & Card Theme Checker)...');
  const allFindings = [];

  for (const dir of TARGET_DIRS) {
    try {
      allFindings.push(...scanDir(dir));
    } catch (e) {
      console.error(`警告：無法掃描目錄 ${dir}: ${e.message}`);
    }
  }

  const reportPath = join(process.cwd(), '.mec-report.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFindings: allFindings.length,
    criticalCount: allFindings.filter(f => f.severity === 'CRITICAL').length,
    highRiskCount: allFindings.filter(f => f.severity === 'HIGH').length,
    findings: allFindings
  }, null, 2));

  if (allFindings.length === 0) {
    console.log('✅ 對比度與卡片配色校驗 100% 通過！未發現任何未適配深色容器、漸變缺陷或內聯覆蓋。');
    process.exit(0);
  }

  console.log(`\n❌ 發現 ${allFindings.length} 處配色與對比度架構缺陷：`);
  for (const f of allFindings) {
    console.log(`\n[${f.severity}] ${f.file} — ${f.pattern}`);
    console.log(`  說明: ${f.message} (違規次數: ${f.count})`);
    if (f.details) {
      f.details.slice(0, 3).forEach(d => console.log(`    Line ${d.line}: ${d.snippet}`));
    }
  }

  console.log(`\n📄 詳細報告已儲存至：${reportPath}`);
  
  const hasCritical = allFindings.some(f => f.severity === 'CRITICAL');
  if (hasCritical) {
    process.exit(1);
  }
  process.exit(0);
}

main();
