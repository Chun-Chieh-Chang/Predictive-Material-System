/**
 * vite-plugin-git-version.ts
 *
 * 建構階段自動讀取 git 狀態，注入動態版號到 import.meta.env.VITE_PMS_VERSION：
 *   - CI 環境（GitHub Actions）→ 直接讀取已提交的 src/utils/version.ts，避免 UTC/本地時區差異導致版號跳變
 *   - 本地開發環境 → 今日本地日期 + 今日提交序號（保持 HMR 即時更新能力）
 *   - 若 .git 不存在 → fallback 為 V-{local-date}-00
 *
 * 輸出格式：V-YYYYMMDD-{dailyCommitCount}
 * 例：V-20260823-01
 */

import type { Plugin } from 'vite';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const VERSION_FILE = 'src/utils/version.ts';
const VERSION_REGEX = /PMS_VERSION:\s*string\s*=\s*'([^']+)'/;

/** 判斷是否為 CI 環境 */
function isCI(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.CONTINUOUS_INTEGRATION === 'true'
  );
}

/** 從 version.ts 讀取已提交的版號 */
function readCommittedVersion(root: string): string | null {
  const filePath = resolve(root, VERSION_FILE);
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(VERSION_REGEX);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

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

/**
 * 計算版號（MECE 單一真相來源）：
 *   - 一律以 src/utils/version.ts 為權威基準
 *   - 避免本機 dev server 與 CI 建構計算分歧
 */
function resolveVersion(root: string): string {
  const committed = readCommittedVersion(root);
  if (committed) {
    return committed;
  }
  const today = formatLocalDate();
  const count = resolveDailyCommitCount(root);
  const seq = count === 0 ? 1 : count;
  return `V-${today}-${String(seq).padStart(2, '0')}`;
}

function syncVersionFile(root: string): string {
  const version = resolveVersion(root);
  return version;
}

export default function gitVersionPlugin(): Plugin {
  return {
    name: 'vite-plugin-git-version',
    configResolved(resolvedConfig) {
      const root = resolvedConfig.root;
      const version = syncVersionFile(root);

      resolvedConfig.define ??= {};
      resolvedConfig.define['import.meta.env.VITE_PMS_VERSION'] = JSON.stringify(version);
      console.log(`[git-version] ${version} loaded`);
    },
    configureServer(server) {
      const root = server.config.root;
      // 伺服器啟動時同步一次
      syncVersionFile(root);
    }
  };
}
