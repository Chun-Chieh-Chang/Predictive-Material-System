/**
 * vite-plugin-git-version.ts
 *
 * 建構階段自動讀取 git 狀態，注入動態版號到 import.meta.env.VITE_PMS_VERSION：
 *   - 若 .git 存在   → git rev-list --count HEAD（總提交數）
 *   - 若 .git 不存在 →  fallback 為 0（npm run build 離線環境）
 *
 * 輸出格式：V-20260820-{commitCount}
 * 基底日期 20260820 來自初始基準提交（5080319），每次新 commit 後版號自動遞增。
 */

import type { Plugin } from 'vite';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_DATE = '20260820'; // 系統基線日期（初始 commit 日）

function resolveGitCommitCount(root: string): number {
  try {
    const count = execSync('git rev-list --count HEAD', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'], // 忽略 stderr 防止警告
    }).trim();
    return parseInt(count, 10) || 0;
  } catch {
    return 0;
  }
}

export default function gitVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-git-version',
    configResolved(resolvedConfig) {
      const root = resolvedConfig.root;
      const commitCount = resolveGitCommitCount(root);
      const version = `V-${BASE_DATE}-${commitCount}`;

      // 注入到 import.meta.env，可在 TSX 中透過 import.meta.env.VITE_PMS_VERSION 存取
      resolvedConfig.define ??= {};
      resolvedConfig.define['import.meta.env.VITE_PMS_VERSION'] = JSON.stringify(version);

      console.log(`[git-version] ${version} (${commitCount} commits)`);
    },
  };
}
