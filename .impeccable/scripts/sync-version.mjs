/**
 * .impeccable/scripts/sync-version.mjs
 *
 * 自動計算最新 Git 提交序號，並直接寫入 src/utils/version.ts
 * 格式：V-YYYYMMDD-XX（如 V-20260823-30）
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '../..');

function formatLocalDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function resolveDailyCommitCount() {
  try {
    const todayLocal = formatLocalDate();
    const raw = execSync('git log --format=%ad --date=format:%Y%m%d', {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const commits = raw.trim().split('\n').filter(Boolean);
    const count = commits.filter(d => d === todayLocal).length;
    return count;
  } catch {
    return 0;
  }
}

export function syncVersionFile() {
  const today = formatLocalDate();
  const count = resolveDailyCommitCount();
  // 加上即將提交的 +1 或取目前計數（若 count 為 0 則為 01）
  const seq = count === 0 ? 1 : count;
  const version = `V-${today}-${String(seq).padStart(2, '0')}`;

  const versionFilePath = resolve(root, 'src/utils/version.ts');
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
    console.log(`🏷️ [Version Sync] 自動同步版號至 src/utils/version.ts: ${version}`);
    return { updated: true, version };
  }
  return { updated: false, version };
}

// 執行
const res = syncVersionFile();
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`[Version Sync Result] ${res.version} (updated: ${res.updated})`);
}
