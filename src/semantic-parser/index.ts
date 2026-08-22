import { classifyIntent } from './IntentClassifier';
import { extractTargetEntity, extractParams, resolveTargetPath } from './EntityExtractor';
import { validate, getHelpMessage } from './ErrorValidator';
import { mapToCliArgs } from './ParamMapper';
import type { ParseResult, ParsedCommand } from './types';

/**
 * 主要解析入口函數
 *
 * @param input 自然語言輸入
 * @returns ParseResult（成功或錯誤）
 */
export function parseCommand(input: string): ParseResult {
  const trimmed = input.trim();

  // 空輸入
  if (!trimmed) {
    return {
      ok: false,
      code: 'EMPTY_INPUT',
      message: '輸入不能為空。',
      suggestions: [getHelpMessage().split('\n').slice(0, 8).join('\n')],
    };
  }

  // Step 1: 意圖分類
  const intentResult = classifyIntent(trimmed);

  // Step 2: 實體提取
  const entity = extractTargetEntity(trimmed);
  const extraParams = extractParams(trimmed);

  // Step 3: 若無明確意圖，嘗試從輸入中偵測目標實體，並預設為 AUDIT
  let intent = intentResult.intent;
  let confidence = intentResult.confidence;

  if (intent === 'UNKNOWN' && entity) {
    intent = 'AUDIT';
    confidence = 0.6; // 回退意圖，信心度較低
  } else if (intent === 'UNKNOWN') {
    // 完全無法解析
    return {
      ok: false,
      code: 'UNRESOLVED_INTENT',
      message: '無法解析指令意圖。',
      suggestions: [getHelpMessage()],
    };
  }

  // Step 4: 構建 ParsedCommand
  const targetPath = resolveTargetPath(entity);
  const baseCommand: ParsedCommand = {
    intent,
    confidence,
    target: entity,
    params: { ...extraParams },
    rawInput: trimmed,
  };

  // Step 5: 安全校驗
  const validationError = validate(intent, targetPath, trimmed);
  if (validationError) {
    return validationError;
  }

  // Step 6: 組建 CLI 參數
  const cliArgs = mapToCliArgs(baseCommand);

  return {
    ok: true,
    command: baseCommand,
    cliArgs,
  };
}

/**
 * 快速解析（不執行安全校驗，僅用於預覽）
 */
export function quickParse(input: string): ParsedCommand | null {
  const result = parseCommand(input);
  if (result.ok) return result.command;
  return null;
}

/**
 * 取得所有可用意圖列表
 */
export { getAvailableIntents } from './IntentClassifier';

/**
 * 取得幫助訊息
 */
export function getHelp(): string {
  return getHelpMessage();
}
