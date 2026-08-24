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
 * 計算版號：
 *   - CI 環境：讀取已提交的 version.ts，保證部署版本與 commit 一致
 *   - 本地環境：基於今日 commit 數即時計算
 */
function resolveVersion(root: string): string {
  if (isCI()) {
    const committed = readCommittedVersion(root);
    if (committed) {
      console.log(`[git-version] CI 環境 — 讀取已提交版號: ${committed}`);
      return committed;
    }
    // CI 讀取失敗時的 safe fallback
    return `V-${formatLocalDate()}-00`;
  }

  const today = formatLocalDate();
  const count = resolveDailyCommitCount(root);
  const seq = count === 0 ? 1 : count;
  return `V-${today}-${String(seq).padStart(2, '0')}`;
}

function syncVersionFile(root: string): string {
  const version = resolveVersion(root);

  const versionFilePath = resolve(root, VERSION_FILE);
  try {
    const currentContent = readFileSync(versionFilePath, 'utf-8');
    const newContent = `/**
 * src/utils/version.ts
 *
 * 集中化管理 PMS 版本常數（MECE 單一真相來源）。
 * 由 sync-version.mjs 與 vite-plugin-git-version 自動即時同步。
 */
export const PMS_VERSION: string = '${version}';

/** 系統標題文字（集中化品牌文案） */
export const SYSTEM_TITLE: string = '料事如神系統';
export const SYSTEM_SUBTITLE: string = 'Predictive Material System';
export const SYSTEM_TAGLINE: string = 'QCC 料事如神圈 • 射出成型智能備料與產能排程推估';
`;
    if (currentContent !== newContent) {
      writeFileSync(versionFilePath, newContent, 'utf-8');
      console.log(`[git-version] 自動更新 src/utils/version.ts -> ${version}`);
    }
  } catch (e) {
    console.error('[git-version] 同步失敗', e);
  }
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
