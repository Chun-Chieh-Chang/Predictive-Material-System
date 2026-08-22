/**
 * vite-plugin-git-version.ts
 *
 * 建構階段自動讀取 git 狀態，注入動態版號到 import.meta.env.VITE_PMS_VERSION：
 *   - 若 .git 存在 → 今日本地日期 + 今日提交序號
 *   - 若 .git 不存在 → fallback 為 V-{local-date}-00
 *
 * 輸出格式：V-YYYYMMDD-{dailyCommitCount}
 * 例：V-20260823-01
 *
 * 說明：版號使用本地時區，與使用者電腦時間一致。
 * CI（GitHub Actions）使用 UTC，與本地可能相差 ±1 天，屬預期行為。
 */

import type { Plugin } from 'vite';
import { execSync } from 'child_process';

/** 將 Date 轉為本地 YYYYMMDD 字串（與使用者電腦時間一致） */
function formatLocalDate(date: Date = new Date()): string {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 計算今日（本地時間）的 commit 數 */
function resolveDailyCommitCount(root: string): number {
  try {
    const todayLocal = formatLocalDate();
    // git committer date 儲存為 UTC，--date=format 以執行環境時區輸出
    // 在本地開發環境（Asia/Taipei）執行時，%Y%m%d 會產生本地日期字串
    const raw = execSync(
      'git log --format=%ad --date=format:%Y%m%d',
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const commits = raw.trim().split('\n').filter(Boolean);
    return commits.filter(d => d === todayLocal).length;
  } catch {
    return 0;
  }
}

export default function gitVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-git-version',
    configResolved(resolvedConfig) {
      const root  = resolvedConfig.root;
      const today = formatLocalDate();
      const count = resolveDailyCommitCount(root);
      const version = `V-${today}-${String(count).padStart(2, '0')}`;

      // 注入到 import.meta.env，可在 TSX 中透過 import.meta.env.VITE_PMS_VERSION 存取
      resolvedConfig.define ??= {};
      resolvedConfig.define['import.meta.env.VITE_PMS_VERSION'] = JSON.stringify(version);

      console.log(`[git-version] ${version} (${count} commits local today)`);
    },
  };
}
