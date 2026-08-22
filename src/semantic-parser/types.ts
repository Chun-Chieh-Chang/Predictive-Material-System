/**
 * 語意解析模組類型定義
 */

// ── Intent ───────────────────────────────────────────────────────────────────

export type Intent =
  | 'AUDIT'
  | 'CRITIQUE'
  | 'POLISH'
  | 'LAYOUT'
  | 'COLORIZE'
  | 'TYPESET'
  | 'ADAPT'
  | 'BOLDER'
  | 'QUIETER'
  | 'DISTILL'
  | 'HARDEN'
  | 'ONBOARD'
  | 'ANIMATE'
  | 'CLARIFY'
  | 'INIT'
  | 'DOCUMENT'
  | 'EXTRACT'
  | 'SHAPING'
  | 'DELIGHT'
  | 'OPTIMIZE'
  | 'UNKNOWN';

export interface IntentResult {
  intent: Intent;
  confidence: number; // 0.0 – 1.0
  fallback?: boolean; // 是否為回退結果
}

// ── Entity ───────────────────────────────────────────────────────────────────

export interface TargetEntity {
  id: string;
  label: string;
  filePath: string;
  isFullProject: boolean;
}

// ── ParsedCommand ────────────────────────────────────────────────────────────

export interface ParsedCommand {
  intent: Intent;
  confidence: number;
  target: TargetEntity | null;
  params: CommandParams;
  rawInput: string;
}

export interface CommandParams {
  /** 只檢查特定目標，忽略其他 */
  focus?: string;
  /** 排除的目標 */
  exclude?: string[];
  /** 僅執行 IMMEDIATE_TIER（14 條快速規則） */
  shallow?: boolean;
  /** 嚴格模式，不跳過 advisory */
  strict?: boolean;
  /** 指定深度：immediate / deep / full */
  depth?: 'immediate' | 'deep' | 'full';
}

// ── ParseResult ──────────────────────────────────────────────────────────────

export interface ParseSuccess {
  ok: true;
  command: ParsedCommand;
  cliArgs: string[];
}

export interface ParseError {
  ok: false;
  code: string;
  message: string;
  suggestions?: string[];
}

export type ParseResult = ParseSuccess | ParseError;

// ── HookEvent ────────────────────────────────────────────────────────────────

export interface HookFileEvent {
  filePath: string;
  languageId: string;
  /** proposed content (preToolUse) or final content (postToolUse) */
  content?: string;
}

export interface HookEvent {
  event: 'preToolUse' | 'postToolUse' | 'stop';
  files: HookFileEvent[];
  /** optional user input that triggered the event */
  userInput?: string;
}
