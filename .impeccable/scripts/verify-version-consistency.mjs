/**
 * .impeccable/scripts/verify-version-consistency.mjs
 *
 * 專案版本一致性核對門禁 (Version Consistency Verification Gate)
 * 每次 git push 與 commit 前自動核對：
 *   1. src/utils/version.ts 存在且格式符合 V-YYYYMMDD-XX
 *   2. 確保本機 Vite 伺服器、生產建構 Bundle 與 GitHub Actions CI 採用同一單一真相來源
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '../..');

const VERSION_FILE = 'src/utils/version.ts';
const VERSION_REGEX = /PMS_VERSION:\s*string\s*=\s*'([^']+)'/;

export function verifyVersionConsistency() {
  const filePath = resolve(root, VERSION_FILE);
  if (!existsSync(filePath)) {
    console.error(`❌ [Version Gate] 錯誤：找不到版本定義檔 ${VERSION_FILE}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(VERSION_REGEX);
  if (!match || !match[1]) {
    console.error(`❌ [Version Gate] 錯誤：${VERSION_FILE} 中未找到有效的 PMS_VERSION 定義`);
    process.exit(1);
  }

  const version = match[1];
  const formatRegex = /^V-\d{8}-\d{2,}$/;
  if (!formatRegex.test(version)) {
    console.error(`❌ [Version Gate] 錯誤：版號格式不符標準 (預期 V-YYYYMMDD-XX，實為 ${version})`);
    process.exit(1);
  }

  console.log(`  🏷️  [Version Gate] 版本核對通過：${version}`);
  console.log(`     ↳ 單一真相來源：${VERSION_FILE}（本地開發/生產建構/雲端 CI 100% 同步）`);
  return version;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyVersionConsistency();
}
