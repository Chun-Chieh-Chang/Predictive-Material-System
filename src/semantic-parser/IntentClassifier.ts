import type { Intent, IntentResult } from './types';

// ── 意圖分類規則表 ──────────────────────────────────────────────────────────

interface IntentRule {
  intent: Intent;
  keywords: string[]; // 中英關鍵字（全小寫，供匹配用）
  confidence: number;
  priority: number; // 越高分越優先（用於衝突時消歧）
}

const INTENT_RULES: IntentRule[] = [
  // Evaluate
  { intent: 'AUDIT', keywords: ['檢查', 'audit', '偵測', '審視', '看看', '問題', '掃描', 'scan', 'check', '測試'], confidence: 1.0, priority: 10 },
  { intent: 'CRITIQUE', keywords: ['評價', 'critique', '評審', '審查', 'review', 'ux review', '設計評審', '意見'], confidence: 1.0, priority: 9 },

  // Refine
  { intent: 'POLISH', keywords: ['打磨', 'polish', '優化', '改善', '修復', '修好', '美化', 'finalize', 'finishing'], confidence: 1.0, priority: 8 },
  { intent: 'LAYOUT', keywords: ['佈局', 'layout', '排版', '間距', '調整版面', '排列', 'spacing', 'alignment'], confidence: 1.0, priority: 8 },
  { intent: 'DISTILL', keywords: ['精簡', 'distill', '去除複雜', '簡化', '少一點', 'minimal', 'strip'], confidence: 1.0, priority: 7 },
  { intent: 'HARDEN', keywords: ['健壯', 'harden', '邊界', '錯誤處理', '容錯', 'edge case', 'error handling', ' robust'], confidence: 1.0, priority: 7 },
  { intent: 'ONBOARD', keywords: ['入門', 'onboard', '新使用者', '空狀態', 'activation', 'first-run', 'welcome'], confidence: 1.0, priority: 6 },

  // Enhance
  { intent: 'COLORIZE', keywords: ['配色', 'colorize', '色彩', '色調', '換色', 'color scheme', 'palette'], confidence: 1.0, priority: 8 },
  { intent: 'TYPESET', keywords: ['字體', 'typeset', '字型', '字級', '排版大小', 'typography', 'font size'], confidence: 1.0, priority: 8 },
  { intent: 'ANIMATE', keywords: ['動畫', 'animate', '動效', '過渡效果', 'motion', 'transition'], confidence: 1.0, priority: 7 },
  { intent: 'BOLDER', keywords: ['更大膽', 'bolder', '更醒目', '加強視覺', 'bold', 'more impactful'], confidence: 1.0, priority: 7 },
  { intent: 'QUIETER', keywords: ['更低調', 'quieter', '收斂', '淡化', 'tone down', 'less loud'], confidence: 1.0, priority: 7 },
  { intent: 'DELIGHT', keywords: ['驚喜', 'delight', '有趣', '互動細節', 'micro-interaction'], confidence: 1.0, priority: 5 },

  // Fix
  { intent: 'CLARIFY', keywords: ['文案', 'clarify', '文字優化', '說法改進', 'label', 'copy', '說明文字', '提示'], confidence: 1.0, priority: 7 },
  { intent: 'ADAPT', keywords: ['響應式', 'adapt', '行動端', '手機版', '跨裝置', 'responsive', 'mobile', 'device'], confidence: 1.0, priority: 8 },
  { intent: 'OPTIMIZE', keywords: ['效能', 'optimize', '速度', '載入', 'performance', 'fast', 'loading'], confidence: 1.0, priority: 6 },

  // Build
  { intent: 'INIT', keywords: ['初始化', 'init', '設定設計規範', '建立設計上下文', 'setup', 'configure design'], confidence: 1.0, priority: 10 },
  { intent: 'DOCUMENT', keywords: ['生成設計文件', 'document', '從程式碼提取設計', 'document design'], confidence: 1.0, priority: 10 },
  { intent: 'EXTRACT', keywords: ['提取', 'extract', '抽取出', 'design token', 'token 化'], confidence: 1.0, priority: 9 },
  { intent: 'SHAPING', keywords: ['規劃', 'shape', '設計前規劃', '藍圖', 'plan ux', 'wireframe'], confidence: 1.0, priority: 8 },
];

// 低置信度模糊關鍵字（用於模糊匹配）
const FUZZY_KEYWORDS: { pattern: string; intent: Intent; confidence: number; priority: number }[] = [
  { pattern: 'audit the', intent: 'AUDIT', confidence: 0.85, priority: 10 },
  { pattern: 'polish the', intent: 'POLISH', confidence: 0.85, priority: 8 },
  { pattern: 'critique the', intent: 'CRITIQUE', confidence: 0.85, priority: 9 },
  { pattern: 'fix the', intent: 'POLISH', confidence: 0.7, priority: 8 },
  { pattern: 'look at', intent: 'AUDIT', confidence: 0.6, priority: 10 },
  { pattern: 'how does', intent: 'CRITIQUE', confidence: 0.5, priority: 9 },
];

// ── 工具函數 ─────────────────────────────────────────────────────────────────

/** Levenshtein 編輯距離（用於模糊匹配） */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ── 主函數 ───────────────────────────────────────────────────────────────────

/**
 * 根據自然語言輸入預測意圖
 * @param input 使用者輸入的自然語言
 * @returns IntentResult
 */
export function classifyIntent(input: string): IntentResult {
  const normalized = input.toLowerCase().trim();

  if (!normalized) return { intent: 'UNKNOWN', confidence: 0.0 };

  // Step 1: 精確關鍵字匹配
  const exactMatches = INTENT_RULES.filter(rule =>
    rule.keywords.some(kw => normalized.includes(kw)),
  );

  if (exactMatches.length > 0) {
    // 取 priority 最高的（衝突消歧）
    exactMatches.sort((a, b) => b.priority - a.priority);
    return { intent: exactMatches[0].intent, confidence: exactMatches[0].confidence };
  }

  // Step 2: 模糊匹配（編輯距離 ≤ 2）
  const fuzzyMatches = FUZZY_KEYWORDS
    .map(f => ({ ...f, distance: levenshtein(normalized.slice(0, 20), f.pattern) }))
    .filter(f => f.distance <= 2)
    .sort((a, b) => a.distance - b.distance);

  if (fuzzyMatches.length > 0) {
    return { intent: fuzzyMatches[0].intent, confidence: fuzzyMatches[0].confidence };
  }

  // Step 3: 無關鍵字匹配 → UNKNOWN（由呼叫端處理 entity 偵測）
  return { intent: 'UNKNOWN', confidence: 0.0 };
}

/**
 * 取得所有可用意圖的提示文字（用於幫助訊息）
 */
export function getAvailableIntents(): { intent: Intent; description: string }[] {
  return [
    { intent: 'AUDIT', description: '檢查 UI 品質問題（對比度、無障礙、響應式）' },
    { intent: 'CRITIQUE', description: 'UX 設計評審（層次、清晰度、情感共鳴）' },
    { intent: 'POLISH', description: '最終打磨與 Design System 一致性檢查' },
    { intent: 'LAYOUT', description: '修正佈局、間距、視覺節奏' },
    { intent: 'COLORIZE', description: '策略性色彩導入' },
    { intent: 'TYPESET', description: '修正字體、層次、尺寸' },
    { intent: 'ADAPT', description: '跨裝置適配檢查' },
    { intent: 'HARDEN', description: '錯誤處理、邊界情況、i18n' },
    { intent: 'CLARIFY', description: '改善 UX 文案清晰度' },
    { intent: 'INIT', description: '初始化設計上下文（寫入 DESIGN.md）' },
  ];
}
