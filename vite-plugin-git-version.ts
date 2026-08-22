/**
 * vite-plugin-git-version.ts
 *
 * 建構階段自動讀取 git 狀態，注入動態版號到 import.meta.env.VITE_PMS_VERSION：
 *   - 若 .git 存在 → 今日（UTC）日曆日期 + 今日提交序號（UTC 基準，跨環境一致）
 *   - 若 .git 不存在 → fallback 為 V-{UTC-date}-00
 *
 * 輸出格式：V-YYYYMMDD-{dailyCommitCount}
 * 例：V-20260822-03
 *
 * MECE 保證：相同 git 歷史在任何時區環境下產生完全相同的版號。
 */

import type { Plugin } from 'vite';
import { execSync } from 'child_process';

/** 將 Date 轉為 UTC YYYYMMDD 字串（不依賴執行環境時區） */
function formatUTCDate(date: Date = new Date()): string {
  const y  = date.getUTCFullYear();
  const m  = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d  = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 計算今日（UTC）的 commit 數 */
function resolveDailyCommitCount(root: string): number {
  try {
    const todayUTC = formatUTCDate();
    // git committer date 本身是 UTC，直接比對 YYYYMMDD 即可，無需任何時區轉換
    const raw = execSync(
      'git log --pretty=format:"%ad" --date=format:"%Y%m%d"',
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const commits = raw.trim().split('\n').filter(Boolean);
    return commits.filter(d => d === todayUTC).length;
  } catch {
    return 0;
  }
}

export default function gitVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-git-version',
    configResolved(resolvedConfig) {
      const root  = resolvedConfig.root;
      const today = formatUTCDate();
      const count = resolveDailyCommitCount(root);
      const version = `V-${today}-${String(count).padStart(2, '0')}`;

      // 注入到 import.meta.env，可在 TSX 中透過 import.meta.env.VITE_PMS_VERSION 存取
      resolvedConfig.define ??= {};
      resolvedConfig.define['import.meta.env.VITE_PMS_VERSION'] = JSON.stringify(version);

      console.log(`[git-version] ${version} (${count} commits UTC today)`);
    },
  };
}
