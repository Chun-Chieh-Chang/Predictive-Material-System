import type { ParseError, ParseSuccess } from './types';

/**
 * 安全校驗器
 *
 * 驗證解析結果是否可以安全地提交給 impeccable CLI 執行。
 */

/**
 * 檢查命令是否包含寫入操作意圖
 */
export function isDestructiveIntent(intent: string): boolean {
  const destructiveIntents = ['craft', 'shape'];
  return destructiveIntents.includes(intent.toLowerCase());
}

/**
 * 校驗目標檔案路徑是否存在（前端僅做格式檢查）
 */
export function validateTargetPath(path: string): boolean {
  // 基本路徑格式校驗：必須是 src/ 開頭或為目錄
  const validPatterns = [
    /^src\//,              // 絕對路徑
    /^\.\/src\//,          // 相對路徑
    /^components\//,       // 簡寫
    /^src\/components\//,  // 完整 components 路徑
  ];
  return validPatterns.some(p => p.test(path));
}

/**
 * 執行完整校驗並返回錯誤或成功
 */
export function validate(
  intent: string,
  targetPath: string,
  userInput: string,
): ParseError | null {
  // 1. 空輸入校驗
  if (!userInput.trim()) {
    return {
      ok: false,
      code: 'EMPTY_INPUT',
      message: '輸入不能為空。請描述您想執行的 UI/UX 操作。',
      suggestions: ['/impeccable audit sidebar', '/impeccable polish dashboard'],
    };
  }

  // 2. 路徑格式校驗
  if (targetPath && !validateTargetPath(targetPath)) {
    return {
      ok: false,
      code: 'INVALID_PATH',
      message: `目標路徑格式無效：${targetPath}`,
      suggestions: ['使用 src/components/ 下的組件名稱，或留空以掃描全域'],
    };
  }

  // 3. 危險操作確認（不直接執行，返回需要確認的標記）
  if (isDestructiveIntent(intent)) {
    return {
      ok: false,
      code: 'NEEDS_CONFIRMATION',
      message: `"${intent}" 會修改程式碼，請確認是否繼續？`,
      suggestions: [`確認執行：/impeccable ${intent} ${targetPath}`, '取消操作'],
    };
  }

  return null;
}

/**
 * 獲取幫助訊息
 */
export function getHelpMessage(): string {
  return [
    '📖 impeccable 語意解析幫助',
    '',
    '可用命令:',
    '  audit    — 檢查 UI 品質（對比度、無障礙、響應式）',
    '  critique — UX 設計評審',
    '  polish   — 最終打磨',
    '  layout   — 修正佈局與間距',
    '  colorize — 策略性色彩導入',
    '  typeset  — 修正字體與層次',
    '  adapt    — 跨裝置適配檢查',
    '  harden   — 錯誤處理與邊界情況',
    '  clarify  — 改善 UX 文案',
    '  init     — 初始化設計上下文',
    '',
    '可用目標:',
    '  sidebar, dashboard, mrp, datatable, setting,',
    '  exchange, prd, backup, material class, glossary,',
    '  navbar, 全系統',
    '',
    '參數標記:',
    '  --focus <target>   只檢查指定目標',
    '  --exclude <target> 排除指定目標',
    '  --shallow          快速檢查（僅 14 條規則）',
    '  --strict           嚴格模式',
    '',
    '範例:',
    '  "檢查一下側邊欄的對比度"',
    '  "audit the dashboard"',
    '  "把戰情室的佈局調整一下"',
    '  "快速檢查 sidebar"',
  ].join('\n');
}
