import type { CommandParams, ParsedCommand, TargetEntity } from './types';

/**
 * 參數映射器
 *
 * 將 ParsedCommand 轉換為 impeccable CLI 可直接執行的參數陣列。
 */

export function mapToCliArgs(
  command: ParsedCommand,
): string[] {
  const args: string[] = ['impeccable', command.intent.toLowerCase()];

  // 目標路徑
  if (command.target && !command.target.isFullProject) {
    args.push(command.target.filePath);
  } else if (command.target?.isFullProject) {
    args.push('src/components/');
  }

  // 額外參數
  if (command.params.focus) {
    args.push('--focus', command.params.focus);
  }
  if (command.params.exclude && command.params.exclude.length > 0) {
    args.push('--exclude', command.params.exclude.join(','));
  }
  if (command.params.shallow) {
    args.push('--shallow');
  }
  if (command.params.strict) {
    args.push('--strict');
  }
  if (command.params.depth === 'deep') {
    args.push('--depth', 'deep');
  }

  return args;
}

/**
 * 將 ParsedCommand 轉換為可執行的 shell command 字串
 */
export function buildCommandString(command: ParsedCommand): string {
  const args = mapToCliArgs(command);
  return `npx ${args.join(' ')}`;
}

/**
 * 從原始輸入和解析結果構建完整的 ParsedCommand
 */
export function buildParsedCommand(
  intent: string,
  target: TargetEntity | null,
  params: CommandParams,
  rawInput: string,
): ParsedCommand {
  return {
    intent: intent as ParsedCommand['intent'],
    confidence: 1.0,
    target,
    params,
    rawInput,
  };
}
