import type { TargetEntity } from './types';

// ── 目標實體映射表 ──────────────────────────────────────────────────────────

interface EntityRule {
  ids: string[];              // 匹配關鍵字（小寫）
  entity: TargetEntity;
}

const ENTITY_RULES: EntityRule[] = [
  {
    ids: ['sidebar', '側邊欄', '導航列', '左欄', 'nav', 'navigation', '選單'],
    entity: { id: 'sidebar', label: 'Sidebar', filePath: 'src/components/Sidebar.tsx', isFullProject: false },
  },
  {
    ids: ['dashboard', '戰情室', '決策室', '儀表板', 'main view', '首頁', 'overview'],
    entity: { id: 'dashboard', label: 'DashboardView', filePath: 'src/components/DashboardView.tsx', isFullProject: false },
  },
  {
    ids: ['mrp', 'mrp計算機', '推導', '計算器', 'calculator', '3階mrp', 'material requirements'],
    entity: { id: 'mrp_calculator', label: 'MrpCalculatorView', filePath: 'src/components/MrpCalculatorView.tsx', isFullProject: false },
  },
  {
    ids: ['datatable', '資料表', '主檔', '10大', 'table', 'data table', '維護'],
    entity: { id: 'data_tables', label: 'DataTablesView', filePath: 'src/components/DataTablesView.tsx', isFullProject: false },
  },
  {
    ids: ['setting', '設定', '參數', 'config', 'system setting', '參數設定'],
    entity: { id: 'system_settings', label: 'SystemSettingsView', filePath: 'src/components/SystemSettingsView.tsx', isFullProject: false },
  },
  {
    ids: ['exchange', '資料交換', '匯出', '匯入', 'import', 'export', 'data exchange'],
    entity: { id: 'data_exchange', label: 'DataExchangeView', filePath: 'src/components/DataExchangeView.tsx', isFullProject: false },
  },
  {
    ids: ['prd', '規格書', '文件', 'doc', 'pr doc', '文檔'],
    entity: { id: 'prd_docs', label: 'PrdDocView', filePath: 'src/components/PrdDocView.tsx', isFullProject: false },
  },
  {
    ids: ['backup', '備份', '自動備份', 'backups', 'backup setting'],
    entity: { id: 'backup_settings', label: 'BackupSettingsView', filePath: 'src/components/BackupSettingsView.tsx', isFullProject: false },
  },
  {
    ids: ['material class', '物料分類', '物料體系', 'material', '分類體系'],
    entity: { id: 'material_class', label: 'MaterialClassManagementView', filePath: 'src/components/MaterialClassManagementView.tsx', isFullProject: false },
  },
  {
    ids: ['glossary', '辭典', '術語', '名詞解釋', '術語辭典'],
    entity: { id: 'glossary', label: 'GlossaryPanel', filePath: 'src/components/GlossaryPanel.tsx', isFullProject: false },
  },
  {
    ids: ['navbar', '頂部導航', '導覽列', 'header', 'top bar'],
    entity: { id: 'navbar', label: 'Navbar', filePath: 'src/components/Navbar.tsx', isFullProject: false },
  },
  {
    ids: ['全系統', '整個系統', '全域', 'all', 'everywhere', '全部', '整個專案', '全專案'],
    entity: { id: 'full_project', label: '全專案', filePath: 'src/components/', isFullProject: true },
  },
];

// ── 參數標記解析 ─────────────────────────────────────────────────────────────

const PARAM_MARKERS: Record<string, { pattern: RegExp; paramKey: keyof import('./types').CommandParams }> = {
  focus:   { pattern: /\b(focus|專注於|只看|只檢查)\b/i, paramKey: 'focus' },
  exclude: { pattern: /\b(exclude|排除|不要檢查|忽略)\b/i, paramKey: 'exclude' },
  shallow: { pattern: /\b(shallow|快速|簡單|粗略|快查)\b/i, paramKey: 'shallow' },
  strict:  { pattern: /\b(strict|嚴格|零容忍|嚴格)\b/i, paramKey: 'strict' },
  deep:    { pattern: /\b(deep|深層|完整|全面)\b/i, paramKey: 'depth' },
};

// ── 主函數 ───────────────────────────────────────────────────────────────────

/**
 * 從自然語言中提取目標實體
 */
export function extractTargetEntity(input: string): TargetEntity | null {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return null;

  // 精確匹配
  for (const rule of ENTITY_RULES) {
    if (rule.ids.some(id => normalized.includes(id))) {
      return rule.entity;
    }
  }

  // 檔案路徑匹配（如 "src/components/Sidebar.tsx"）
  const pathMatch = normalized.match(/src\/components\/(\w+)\.(tsx|ts)/);
  if (pathMatch) {
    const componentName = pathMatch[1];
    return {
      id: componentName.toLowerCase(),
      label: componentName,
      filePath: `src/components/${componentName}.${pathMatch[2]}`,
      isFullProject: false,
    };
  }

  return null;
}

/**
 * 從自然語言中提取引數標記
 */
export function extractParams(input: string): Partial<import('./types').CommandParams> {
  const params: Partial<import('./types').CommandParams> = {};
  const normalized = input;

  for (const { pattern, paramKey } of Object.values(PARAM_MARKERS)) {
    if (pattern.test(normalized)) {
      if (paramKey === 'depth') {
        params.depth = 'deep';
      } else if (paramKey === 'shallow') {
        params.shallow = true;
      } else if (paramKey === 'strict') {
        params.strict = true;
      } else if (paramKey === 'focus') {
        // 嘗試從 "focus <entity>" 中提取具體值
        const focusMatch = normalized.match(/(?:focus|專注於|只看)\s+(\S+)/i);
        if (focusMatch) params.focus = focusMatch[1];
      } else if (paramKey === 'exclude') {
        const excludeMatch = normalized.match(/(?:exclude|排除|不要檢查)\s+([^\s,，。]+)/i);
        if (excludeMatch) params.exclude = [excludeMatch[1]];
      }
    }
  }

  return params;
}

/**
 * 從輸入文字中提取具體的目標路徑（用於 CLI 參數）
 */
export function resolveTargetPath(entity: TargetEntity | null): string {
  if (!entity) return 'src/components/';
  if (entity.isFullProject) return 'src/components/';
  return entity.filePath;
}
