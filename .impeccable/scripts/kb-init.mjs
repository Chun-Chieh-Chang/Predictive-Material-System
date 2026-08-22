#!/usr/bin/env node
/**
 * KB Init — 一鍵初始化知識庫與工具鏈（Requirement: 快速部署）
 *
 * 執行方式：
 *   node .impeccable/scripts/kb-init.mjs
 *
 * 功能：
 *   1. 建立 .impeccable/kb/ 目錄與 issues.yaml 初始框架
 *   2. 建立 .impeccable/templates/ 預設模板
 *   3. 執行 kb-indexer 從現有 CAPA 報告萃取知識
 *   4. 輸出初始化摘要
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

console.log('\n🔧 KB Init — 知識庫初始化\n');

// 1. 建立目錄結構
const dirs = [
  resolve(root, '.impeccable/kb'),
  resolve(root, '.impeccable/templates'),
  resolve(root, 'docs/.audit'),
];
for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
  console.log(`  ✅ ${dir.replace(root + '/', '')}/`);
}

// 2. 建立初始 issues.yaml（若不存在）
const kbPath = resolve(root, '.impeccable/kb/issues.yaml');
if (!existsSync(kbPath)) {
  const skeleton = `# PMS Knowledge Base — Schema v1.0
# 結構化知識庫，供 kb-indexer 讀取並供 kb-proactive-check 匹配使用
#
# 欄位說明：
#   id          : 唯一標識（KB-XXXX）
#   source_capa : 來源 CAPA 編號
#   title       : 問題標題
#   category    : CSS / TYPESCRIPT / CI_CD / PROCESS / DEVOPS / INTEGRATION
#   tags        : 標籤陣列（用於語義匹配）
#   severity    : critical / high / medium / low
#   scenarios   : 觸發場景描述陣列
#   root_cause  : 根因分析摘要
#   fix_type    : code / config / doc / process
#   fix_code    : 可復用的程式碼片段
#   verification: 驗證方法陣列
#   created_at  : 建立時間
#   last_used   : 最後復用時間
#   reuse_count : 被復用次數
#   status      : active / deprecated

entries:
  # 在此新增条目，或執行 kb-indexer.mjs 自動從 CAPA 報告萃取

`;
  writeFileSync(kbPath, skeleton, 'utf-8');
  console.log('  ✅ .impeccable/kb/issues.yaml（初始框架）');
} else {
  console.log('  ℹ️  .impeccable/kb/issues.yaml 已存在，跳過建立');
}

// 3. 建立預設模板
const templatePath = resolve(root, '.impeccable/templates/capa-template.md');
if (!existsSync(templatePath)) {
  writeFileSync(templatePath, `---
title: "[CAPA-XXX] 問題標題"
date: "{{DATE}}"
severity: high
category: CSS
status: open
---

# CAPA-XXX: [問題標題]

## 1. 問題描述

## 2. 根本原因分析（5-Why）

## 3. 即時糾正措施（CA）

| # | 措施 | 狀態 |
|---|------|------|
| CA-01 |  | ⏳ |

## 4. 長期預防措施（PA）

| # | 措施 | 狀態 |
|---|------|------|
| PA-01 |  | ⏳ |

## 5. 驗證標準

| 螢幕寬度 | 驗證項目 | 通過標準 |
|----------|----------|----------|
| >= 1920px |  |  |
| >= 768px  |  |  |
| >= 375px  |  |  |

## 6. 修複雜碼與 commit hash

\`\`\`
# 在此貼上修補的程式碼片段
\`\`\`

Commit: 
GitHub Actions: 
`, 'utf-8');
  console.log('  ✅ .impeccable/templates/capa-template.md');
}

// 4. 執行 kb-indexer
console.log('\n  📚 執行 KB Indexer...');
try {
  execSync(`node "${resolve(__dirname, 'kb-indexer.mjs')}"`, {
    cwd: root, stdio: 'inherit'
  });
} catch (e) {
  console.log('  ⚠️  kb-indexer 執行失敗（可能無 CAPA 報告）：', e.message?.split('\n')[0]);
}

console.log('\n✅ KB Init 完成\n');
