import { describe, it } from 'node:test';
import { equal, strictEqual, ok, rejects } from 'node:assert/strict';
import { parseCommand, quickParse, getAvailableIntents } from '../index';
import { classifyIntent } from '../IntentClassifier';
import { extractTargetEntity, extractParams } from '../EntityExtractor';

// ── IntentClassifier ─────────────────────────────────────────────────────────

describe('IntentClassifier', () => {
  it('正確識別 AUDIT 意圖（中文）', () => {
    const r = classifyIntent('幫我看一下側邊欄的對比度');
    strictEqual(r.intent, 'AUDIT');
    equal(r.confidence, 1.0);
  });

  it('正確識別 AUDIT 意圖（英文）', () => {
    const r = classifyIntent('audit the sidebar');
    strictEqual(r.intent, 'AUDIT');
  });

  it('正確識別 POLISH 意圖', () => {
    const r = classifyIntent('help me polish the settings page');
    strictEqual(r.intent, 'POLISH');
  });

  it('正確識別 LAYOUT 意圖', () => {
    const r = classifyIntent('把戰情室佈局調整一下');
    strictEqual(r.intent, 'LAYOUT');
  });

  it('正確識別 COLORIZE 意圖', () => {
    const r = classifyIntent('色彩有點怪，帮我 colorize');
    strictEqual(r.intent, 'COLORIZE');
  });

  it('正確識別 TYPESET 意圖', () => {
    const r = classifyIntent('字體大小不太對');
    strictEqual(r.intent, 'TYPESET');
  });

  it('正確識別 ADAPT 意圖', () => {
    const r = classifyIntent('行動端看起來很糟，adapt 一下');
    strictEqual(r.intent, 'ADAPT');
  });

  it('正確識別 QUIETER 意圖', () => {
    const r = classifyIntent('設計太花俏了，quiet 一點');
    strictEqual(r.intent, 'QUIETER');
  });

  it('正確識別 DISTILL 意圖', () => {
    const r = classifyIntent('太複雜了，distill it');
    strictEqual(r.intent, 'DISTILL');
  });

  it('正確識別 HARDEN 意圖', () => {
    const r = classifyIntent('檢查邊界情況和錯誤處理');
    strictEqual(r.intent, 'HARDEN');
  });

  it('正確識別 CRITIQUE 意圖', () => {
    const r = classifyIntent('全面評審一下 MRP 計算機的 UX');
    strictEqual(r.intent, 'CRITIQUE');
  });

  it('無關鍵字時返回 UNKNOWN', () => {
    const r = classifyIntent('random text without keywords');
    strictEqual(r.intent, 'UNKNOWN');
    equal(r.confidence, 0.0);
  });

  it('空輸入返回 UNKNOWN', () => {
    const r = classifyIntent('');
    strictEqual(r.intent, 'UNKNOWN');
  });
});

// ── EntityExtractor ──────────────────────────────────────────────────────────

describe('EntityExtractor', () => {
  it('解析「側邊欄」→ Sidebar', () => {
    const e = extractTargetEntity('幫我看一下側邊欄');
    equal(e?.id, 'sidebar');
    equal(e?.filePath, 'src/components/Sidebar.tsx');
  });

  it('解析「dashboard」→ DashboardView', () => {
    const e = extractTargetEntity('audit the dashboard');
    equal(e?.id, 'dashboard');
  });

  it('解析「全系統」→ 全專案掃描', () => {
    const e = extractTargetEntity('檢查整個系統');
    ok(e?.isFullProject);
  });

  it('解析檔案路徑', () => {
    const e = extractTargetEntity('檢查 src/components/Navbar.tsx');
    equal(e?.filePath, 'src/components/Navbar.tsx');
  });

  it('無法解析時返回 null', () => {
    equal(extractTargetEntity('xyz123'), null);
  });

  it('解析參數標記 focus', () => {
    const p = extractParams('只檢查 sidebar 的對比度');
    ok('focus' in p);
  });

  it('解析參數標記 shallow', () => {
    const p = extractParams('快速檢查 dashboard');
    equal(p.shallow, true);
  });
});

// ── parseCommand ─────────────────────────────────────────────────────────────

describe('parseCommand', () => {
  // T-01
  it('T-01: 「幫我看一下側邊欄的對比度」→ AUDIT Sidebar', () => {
    const r = parseCommand('幫我看一下側邊欄的對比度');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'AUDIT');
      equal(r.command.target?.id, 'sidebar');
      ok(r.cliArgs.includes('audit'));
      ok(r.cliArgs.some(a => a.includes('Sidebar')));
    }
  });

  // T-02
  it('T-02: "audit the dashboard" → AUDIT DashboardView', () => {
    const r = parseCommand('audit the dashboard');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'AUDIT');
      equal(r.command.target?.id, 'dashboard');
    }
  });

  // T-03
  it('T-03: 「把戰情室佈局調整一下」→ LAYOUT DashboardView', () => {
    const r = parseCommand('把戰情室佈局調整一下');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'LAYOUT');
      equal(r.command.target?.id, 'dashboard');
    }
  });

  // T-04
  it('T-04: "help me polish the settings page" → POLISH', () => {
    const r = parseCommand('help me polish the settings page');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'POLISH');
  });

  // T-05
  it('T-05: 「檢查一下整個系統的 UI 問題」→ AUDIT 全專案', () => {
    const r = parseCommand('檢查一下整個系統的 UI 問題');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'AUDIT');
      ok(r.command.target?.isFullProject);
    }
  });

  // T-06
  it('T-06: 「色彩有點怪，帮我 colorize」→ COLORIZE', () => {
    const r = parseCommand('色彩有點怪，帮我 colorize');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'COLORIZE');
  });

  // T-07
  it('T-07: 「字體大小不太對」→ TYPESET', () => {
    const r = parseCommand('字體大小不太對');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'TYPESET');
  });

  // T-08
  it('T-08: 「行動端看起來很糟，adapt 一下」→ ADAPT', () => {
    const r = parseCommand('行動端看起來很糟，adapt 一下');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'ADAPT');
  });

  // T-09
  it('T-09: 「設計太花俏了，quiet 一點」→ QUIETER', () => {
    const r = parseCommand('設計太花俏了，quiet 一點');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'QUIETER');
  });

  // T-10
  it('T-10: 「太複雜了，distill it」→ DISTILL', () => {
    const r = parseCommand('太複雜了，distill it');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'DISTILL');
  });

  // T-11
  it('T-11: 「檢查邊界情況和錯誤處理」→ HARDEN', () => {
    const r = parseCommand('檢查邊界情況和錯誤處理');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'HARDEN');
  });

  // T-12
  it('T-12: 「新使用者的歡迎流程有什麼問題」→ ONBOARD', () => {
    const r = parseCommand('新使用者的歡迎流程有什麼問題');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'ONBOARD');
  });

  // T-13
  it('T-13: 「幫我加上一些動畫效果」→ ANIMATE', () => {
    const r = parseCommand('幫我加上一些動畫效果');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'ANIMATE');
  });

  // T-14
  it('T-14: 「這個文案看不懂，幫我 clarify」→ CLARIFY', () => {
    const r = parseCommand('這個文案看不懂，幫我 clarify');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'CLARIFY');
  });

  // T-15
  it('T-15: 「初始化設計規範」→ INIT', () => {
    const r = parseCommand('初始化設計規範');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'INIT');
  });

  // T-16
  it('T-16: 「從現在程式碼產生設計文件」→ DOCUMENT', () => {
    const r = parseCommand('從現在程式碼產生設計文件');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'DOCUMENT');
  });

  // T-17
  it('T-17: 「把現有的 design token 提取出來」→ EXTRACT', () => {
    const r = parseCommand('把現有的 design token 提取出來');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'EXTRACT');
  });

  // T-18
  it('T-18: 「全面評審一下 MRP 計算機的 UX」→ CRITIQUE MrpCalculatorView', () => {
    const r = parseCommand('全面評審一下 MRP 計算機的 UX');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'CRITIQUE');
      equal(r.command.target?.id, 'mrp_calculator');
    }
  });

  // T-19
  it('T-19: 「只檢查 sidebar 的對比度問題」→ AUDIT with focus', () => {
    const r = parseCommand('只檢查 sidebar 的對比度問題');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'AUDIT');
      ok('focus' in r.command.params);
    }
  });

  // T-20
  it('T-20: 「快速檢查一下 dashboard，不用太深」→ AUDIT shallow', () => {
    const r = parseCommand('快速檢查一下 dashboard，不用太深');
    ok(r.ok);
    if (r.ok) equal(r.command.params.shallow, true);
  });

  // T-21
  it('T-21: 「帮我 bolder 一點，目前太素了」→ BOLDER', () => {
    const r = parseCommand('帮我 bolder 一點，目前太素了');
    ok(r.ok);
    if (r.ok) strictEqual(r.command.intent, 'BOLDER');
  });

  // T-22
  it('T-22: 「shape 一下戰情室的使用流程」→ SHAPING DashboardView', () => {
    const r = parseCommand('shape 一下戰情室的使用流程');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'SHAPING');
      equal(r.command.target?.id, 'dashboard');
    }
  });

  // T-23
  it('T-23: 「完全不知道要執行什麼命令」→ ERROR or fallback', () => {
    const r = parseCommand('完全不知道要執行什麼命令');
    // 可能回退為 AUDIT（有 entity 偵測時）或返回 error
    if (r.ok) {
      // fallback 模式
      equal(r.command.intent, 'AUDIT');
    } else {
      // error 模式
      ok('code' in r);
      ok('suggestions' in r && r.suggestions.length > 0);
    }
  });

  // T-24
  it('T-24: 空輸入 → ERROR', () => {
    const r = parseCommand('');
    ok(!r.ok);
    if (!r.ok) {
      equal((r as import('../types').ParseError).code, 'EMPTY_INPUT');
    }
  });

  // T-25
  it('T-25: 「只檢查 sidebar 和 navbar，排除 dashboard」→ AUDIT with exclude', () => {
    const r = parseCommand('只檢查 sidebar 和 navbar，排除 dashboard');
    ok(r.ok);
    if (r.ok) {
      strictEqual(r.command.intent, 'AUDIT');
      ok('exclude' in r.command.params);
    }
  });
});

// ── getAvailableIntents ──────────────────────────────────────────────────────

describe('getAvailableIntents', () => {
  it('回傳至少 8 個意圖', () => {
    const intents = getAvailableIntents();
    ok(intents.length >= 8);
    ok(intents[0].intent);
    ok(intents[0].description.length > 0);
  });
});

// ── quickParse ───────────────────────────────────────────────────────────────

describe('quickParse', () => {
  it('正常輸入可解析', () => {
    const r = quickParse('檢查 sidebar');
    ok(r !== null);
    if (r) strictEqual(r.intent, 'AUDIT');
  });
});
