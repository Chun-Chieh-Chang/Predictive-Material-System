#!/usr/bin/env node
/**
 * MECE 完整性校驗腳本
 *
 * 用途：對大模型生成的 MECE 拆解輸出進行自動化完整性檢查
 * 用法：node .impeccable/scripts/mec-validator.mjs <input-file.md>
 *
 * 執行階段：
 *   - Pre-commit：檢查待提交的 CAPA 報告
 *   - CI Pipeline：檢查所有上傳的 CAPA 報告
 *   - 手動執行：臨時校驗任意 MECE 拆解輸出
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, '..', 'mec-template-library.json');

// ──────────────────────────────────────────────
// 配置
// ──────────────────────────────────────────────
const CONFIG = {
  minDimensions: 4,           // 最少維度數
  minItemsPerDimension: 2,    // 每個維度最少子項數
  maxDepth: 3,                // 最大層次深度
  strictMode: true,           // 嚴格模式：空白維度視為失敗
};

// ──────────────────────────────────────────────
// 解析 MECE 輸出
// ──────────────────────────────────────────────
class MECEParser {
  constructor(content) {
    this.content = content;
    this.dimensions = new Map();
    this.rawOutput = content;
  }

  parse() {
    const lines = this.content.split('\n');
    let currentDim = null;
    let currentItem = null;

    for (const line of lines) {
      // 檢測維度標題 — 支持【維度名】和 ## 數字. 維度名 兩種格式
      const dimMatchCJK = line.match(/^【(.+?)】/);
      const dimMatchMD = line.match(/^#{1,3}\s*\d+[\.\-]?\s*([^#\n]{2,30})$/);
      const dimMatch = dimMatchCJK || dimMatchMD;
      if (dimMatch) {
        if (currentDim && currentItem) this._storeItem(currentDim, currentItem);
        currentDim = dimMatch[1].trim();
        this.dimensions.set(currentDim, []);
        currentItem = null;
        continue;
      }

      // 檢測子項 — 支持 - [✓]/[?]/[✗] 和 - 文字 格式
      const itemMatch = line.match(/^- \[([?✓✕✗])\].*(.+)$/);
      const itemMatchPlain = line.match(/^-\s+(.+)$/);
      if ((itemMatch || itemMatchPlain) && currentDim) {
        const desc = itemMatch ? itemMatch[2].trim() : itemMatchPlain[1].trim();
        const status = itemMatch ? itemMatch[1] : '?';
        this.dimensions.get(currentDim).push({ status, desc, raw: line.trim() });
        currentItem = desc;
      }
    }

    // 儲存最後一個
    if (currentDim && currentItem) this._storeItem(currentDim, currentItem);

    return this;
  }

  _storeItem(dim, item) {
    if (this.dimensions.has(dim)) {
      this.dimensions.get(dim).push({ status: '?', desc: item, raw: '' });
    }
  }

  getDimensionCount() {
    return this.dimensions.size;
  }

  getDimensionsWithItems() {
    return Array.from(this.dimensions.entries())
      .filter(([_, items]) => items.length > 0)
      .map(([name, items]) => ({ name, count: items.length }));
  }
}

// ──────────────────────────────────────────────
// MECE 校驗器
// ──────────────────────────────────────────────
class MECEValidator {
  constructor(templatePath, config) {
    this.template = JSON.parse(readFileSync(templatePath, 'utf-8'));
    this.config = config;
    this.findings = [];
    this.warnings = [];
  }

  validate(parser) {
    const template = this.template.templates['bug-investigation'];
    if (!template) {
      this.findings.push({ type: 'error', message: '找不到 bug-investigation 模板' });
      return this;
    }

    // ── 檢查 1：維度數量
    const dimCount = parser.getDimensionCount();
    if (dimCount < this.config.minDimensions) {
      this.findings.push({
        type: 'error',
        message: `維度數量不足：${dimCount} < ${this.config.minDimensions}`,
        suggestion: `至少需要 ${this.config.minDimensions} 個維度，建議包含：${
          template.dimensions.map(d => d.name).join('、')
        }`
      });
    }

    // ── 檢查 2：必要維度是否存在
    const foundDimNames = Array.from(parser.dimensions.keys());
    for (const requiredDim of template.dimensions) {
      const found = foundDimNames.some(f =>
        f.includes(requiredDim.name) || requiredDim.name.includes(f)
      );
      if (!found && this.config.strictMode) {
        this.findings.push({
          type: 'error',
          message: `缺失必要維度：「${requiredDim.name}」`,
          suggestion: `請補充「${requiredDim.name}」維度的分析內容`,
          templateItems: requiredDim.mandatoryChecklist
        });
      } else if (!found) {
        this.warnings.push({
          type: 'warning',
          message: `可能遺漏維度：「${requiredDim.name}」(寬鬆模式)`
        });
      }
    }

    // ── 檢查 3：每個維度的子項數量
    for (const [dimName, items] of parser.dimensions) {
      if (items.length < this.config.minItemsPerDimension) {
        this.findings.push({
          type: 'error',
          message: `維度「${dimName}」子項不足：${items.length} < ${this.config.minItemsPerDimension}`,
          suggestion: `建議補充 ${this.config.minItemsPerDimension - items.length} 個以上子項`
        });
      }
    }

    // ── 檢查 4：空白維度檢查
    for (const [dimName, items] of parser.dimensions) {
      if (items.length === 0) {
        this.findings.push({
          type: 'error',
          message: `維度「${dimName}」為空（無任何子項）`,
          suggestion: `請補充內容或明確標註「不適用」並說明理由`
        });
      }
    }

    // ── 檢查 5：模糊描述檢查
    const vaguePatterns = ['其他', '等等', '各種', '不明', '待確認', 'TODO'];
    for (const [dimName, items] of parser.dimensions) {
      for (const item of items) {
        for (const pattern of vaguePatterns) {
          if (item.desc.includes(pattern)) {
            this.warnings.push({
              type: 'warning',
              message: `維度「${dimName}」中存在模糊描述：「${item.desc}」`,
              suggestion: '請替換為具體的描述'
            });
          }
        }
      }
    }

    return this;
  }

  getReport() {
    const errors = this.findings.filter(f => f.type === 'error');
    const warnings = this.findings.filter(f => f.type === 'warning');
    const overallPass = errors.length === 0 && warnings.length === 0;

    return {
      pass: overallPass,
      score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
      errors: errors,
      warnings: [...warnings, ...this.warnings],
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        dimensionsFound: this.findings.filter(f => f.message.includes('維度')).length
      }
    };
  }
}

// ──────────────────────────────────────────────
// 主程序
// ──────────────────────────────────────────────
function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('用法：node mec-validator.mjs <input-file.md>');
    console.error('  或從 stdin 讀取：cat output.md | node mec-validator.mjs');
    process.exit(1);
  }

  let content;
  if (inputFile === '-') {
    content = process.stdin.read();
    if (!content) {
      console.error('錯誤：未從 stdin 讀取到內容');
      process.exit(1);
    }
  } else {
    if (!existsSync(inputFile)) {
      console.error(`錯誤：文件不存在 ${inputFile}`);
      process.exit(1);
    }
    content = readFileSync(inputFile, 'utf-8');
  }

  // 解析
  const parser = new MECEParser(content).parse();
  console.log(`══════════════════════════════════════════════════════`);
  console.log(`  MECE 完整性校驗報告`);
  console.log(`══════════════════════════════════════════════════════`);
  console.log(`輸入文件：${inputFile}`);
  console.log(`維度數量：${parser.getDimensionCount()}`);
  console.log(`──────────────────────────────────────────────────────`);

  // 校驗
  const validator = new MECEValidator(TEMPLATE_PATH, CONFIG);
  validator.validate(parser);
  const report = validator.getReport();

  // 輸出
  if (report.errors.length > 0) {
    console.log(`\n❌ 錯誤 (${report.errors.length} 個)：`);
    for (const e of report.errors) {
      console.log(`  • ${e.message}`);
      if (e.suggestion) console.log(`    → 建議：${e.suggestion}`);
    }
  }

  if (report.warnings.length > 0) {
    console.log(`\n⚠️  警告 (${report.warnings.length} 個)：`);
    for (const w of report.warnings) {
      console.log(`  • ${w.message}`);
      if (w.suggestion) console.log(`    → 建議：${w.suggestion}`);
    }
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log(`\n✅ 通過！MECE 完整性評分：${report.score}/100`);
  } else {
    console.log(`\n❌ 未通過！MECE 完整性評分：${report.score}/100`);
  }

  console.log(`══════════════════════════════════════════════════════`);

  // 寫入 JSON 報告（供 CI 解析）
  const jsonReportPath = inputFile.replace(/\.md$/, '') + '.mec-report.json';
  writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  console.log(`JSON 報告已保存：${jsonReportPath}`);

  process.exit(report.pass ? 0 : 1);
}

main();
