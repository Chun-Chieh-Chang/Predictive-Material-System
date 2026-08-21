/**
 * vite-plugin-git-version.ts
 *
 * 建構階段自動讀取 git 狀態，注入動態版號到 import.meta.env.VITE_PMS_VERSION：
 *   - 若 .git 存在 → 今日（台灣時區 UTC+8）日曆日期 + 今日提交序號
 *   - 若 .git 不存在 → fallback 為 V-{today}-00（npm run build 離線環境）
 *
 * 輸出格式：V-YYYYMMDD-{dailyCommitCount}
 * 例：V-20260821-03  → 2026-08-21 當天的第 3 筆 commit
 */

import type { Plugin } from 'vite';
import { execSync } from 'child_process';

const TAIWAN_UTC_OFFSET_MIN = 8 * 60; // 台灣時區 UTC+8 = 480 分鐘

/** 將 Date 物件轉為台灣時間 YYYYMMDD 字串 */
function formatTaiwanDate(date: Date): string {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 取得今日台灣時間的 YYYYMMDD */
function getTodayTaiwan(): string {
  return formatTaiwanDate(new Date());
}

/**
 * 計算今日（台灣時間 UTC+8）的 commit 數。
 * 策略：擷取所有 commit 的 committer date（UTC），
 *       逐筆轉換為台灣時間後比對今日。
 * 此方式不依賴 shell 的 since 語法，跨平台最穩健。
 */
function resolveDailyCommitCount(root: string): number {
  try {
    const today    = getTodayTaiwan();
    // 取得所有 commit 的 committer date，格式 YYYYMMDD（UTC）
    const raw = execSync(
      'git log --pretty=format:"%ad" --date=format:"%Y%m%d"',
      { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const commits = raw.trim().split('\n').filter(Boolean);

    // 計算本地時區與 UTC 的分鐘差（正數表示本地在 UTC 之後）
    const tzOffsetMin = new Date().getTimezoneOffset() * -1;
    // 台灣時間相對於 UTC 的分鐘數（+480）
    const taiwanOffsetMin = TAIWAN_UTC_OFFSET_MIN;
    // 將 UTC YYYYMMDD 轉換成台灣 YYYYMMDD 的偏移量（日際跳遷在此處理）
    // 簡單做法：把每個 commit 的 UTC 日期加上時區差，看是否落在今天
    let count = 0;
    for (const commitUtcDate of commits) {
      if (!commitUtcDate) continue;
      // commitUtcDate 是 UTC 日期，轉換為 Date 物件（UTC 00:00）
      const [y, m, d] = [commitUtcDate.slice(0, 4), commitUtcDate.slice(4, 6), commitUtcDate.slice(6, 8)];
      const utcDate = Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      // 加上台灣時區偏移得到台灣時間
      const taiwanDate = new Date(utcDate + taiwanOffsetMin * 60 * 1000);
      if (formatTaiwanDate(taiwanDate) === today) {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

export default function gitVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-git-version',
    configResolved(resolvedConfig) {
      const root    = resolvedConfig.root;
      const today   = getTodayTaiwan();
      const count   = resolveDailyCommitCount(root);
      const version = `V-${today}-${String(count).padStart(2, '0')}`;

      // 注入到 import.meta.env，可在 TSX 中透過 import.meta.env.VITE_PMS_VERSION 存取
      resolvedConfig.define ??= {};
      resolvedConfig.define['import.meta.env.VITE_PMS_VERSION'] = JSON.stringify(version);

      console.log(`[git-version] ${version} (${count} commits today)`);
    },
  };
}
