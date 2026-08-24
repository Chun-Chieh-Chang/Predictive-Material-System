/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  Calculator,
  CalendarCheck,
  Layers,
  Database,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { NavTab } from './Navbar';

// ── Navigation group definitions ──────────────────────────────────────────────

interface NavItem {
  id: NavTab;
  label: string;
  sub: string;
  icon: React.ElementType;
  badge?: number | string;
}

interface GroupAccent {
  titleColor: string;   // group title / dot / chevron
  dotColor: string;     // bg- variant of the color
  itemBorder: string;   // left-border class for items
  chipBg: string;       // subtle background for header row
  chipHover: string;    // hover bg for header row
}

interface NavGroup {
  title: string;
  accent: GroupAccent;
  items: NavItem[];
}

const ACCENT: Record<string, GroupAccent> = {
  war_room: {
    titleColor: 'text-sky-800 dark:text-sky-300 font-bold',
    dotColor:   'bg-sky-600 dark:bg-sky-400',
    itemBorder: 'border-l-sky-600 dark:border-l-sky-500',
    chipBg:     'bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/40',
    chipHover:  'hover:bg-sky-100 dark:hover:bg-sky-900/60',
  },
  mrp: {
    titleColor: 'text-indigo-800 dark:text-indigo-300 font-bold',
    dotColor:   'bg-indigo-600 dark:bg-indigo-400',
    itemBorder: 'border-l-indigo-600 dark:border-l-indigo-500',
    chipBg:     'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/40',
    chipHover:  'hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
  },
  data: {
    titleColor: 'text-emerald-800 dark:text-emerald-300 font-bold',
    dotColor:   'bg-emerald-600 dark:bg-emerald-400',
    itemBorder: 'border-l-emerald-600 dark:border-l-emerald-500',
    chipBg:     'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40',
    chipHover:  'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
  },
  support: {
    titleColor: 'text-amber-900 dark:text-amber-300 font-bold',
    dotColor:   'bg-amber-600 dark:bg-amber-400',
    itemBorder: 'border-l-amber-600 dark:border-l-amber-500',
    chipBg:     'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/40',
    chipHover:  'hover:bg-amber-100 dark:hover:bg-amber-900/60',
  },
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: '決策戰情',
    accent: ACCENT.war_room,
    items: [
      { id: 'sales_workbench', label: '業務敏捷工作台', sub: 'Sales Agile Hub', icon: Sparkles },
      { id: 'dashboard', label: '綜合戰情儀表板', sub: 'Decision War Room', icon: BarChart3 },
      { id: 'ship_schedule_clearance', label: '週二出貨審查', sub: 'Ship Clearance', icon: CalendarCheck },
      { id: 'order_tension_tracker', label: '訂單物料示警', sub: 'Order Tension', icon: Activity },
    ],
  },
  {
    title: '物料推導',
    accent: ACCENT.mrp,
    items: [
      { id: 'procurement_workbench', label: '生管採購工作台', sub: 'Procurement Hub', icon: Sparkles },
      { id: 'mrp_calculator', label: '3 階 MRP 推導', sub: 'MRP Engine', icon: Calculator },
    ],
  },
  {
    title: '數據中心',
    accent: ACCENT.data,
    items: [
      { id: 'data_tables', label: '7 大核心主檔維護', sub: 'Master Data', icon: Database },
      { id: 'material_class_management', label: '物料分類體系', sub: 'Material Classes', icon: Layers },
      { id: 'data_exchange', label: '資料交換與模擬', sub: 'Data & Simulation', icon: FileSpreadsheet },
    ],
  },
  {
    title: '系統支援',
    accent: ACCENT.support,
    items: [
      { id: 'system_settings', label: '參數策略設定', sub: 'System Config', icon: SlidersHorizontal },
      { id: 'glossary', label: '專業術語辭典', sub: 'Glossary', icon: BookOpen },
      { id: 'prd_docs', label: 'PRD 規格與驗收總表', sub: 'PRD & Verification', icon: FileText },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  alertCount: number;
  adminUnlocked: boolean;
  backupEnabled: boolean;
  onNavigateToBackup: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  adminUnlocked,
  backupEnabled,
  onNavigateToBackup,
  mobileOpen,
  setMobileOpen,
}) => {
  // ── Collapse state per group ──────────────────────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => { init[g.title] = false; });
    return init;
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // ── Handle nav click ──────────────────────────────────────────────────────
  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  // ── Close drawer on Escape ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, setMobileOpen]);

  // ── Render single nav item ────────────────────────────────────────────────
  const renderItem = (item: NavItem, accent: GroupAccent) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    const hasBadge = item.badge !== undefined || (item.id === 'dashboard' && alertCount > 0);
    const badgeValue = item.badge ?? (item.id === 'dashboard' ? alertCount : undefined);

    return (
      <button
        key={item.id}
        id={`sidebar-${item.id}`}
        onClick={() => handleNavClick(item.id)}
        title={`${item.label}（${item.sub}）`}
        className={[
          'w-full flex items-center gap-3 px-3 py-2 pl-4 rounded-lg text-left transition-all duration-150 cursor-pointer',
          'group relative border-l-2 border-l-transparent',
          isActive
            ? `${accent.itemBorder} bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold shadow-xs`
            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 hover:border-l-slate-400 dark:hover:border-l-slate-600',
        ].join(' ')}
      >
        {/* Active glow bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-sky-600 dark:bg-white/80 rounded-full"
            style={{ boxShadow: '0 0 6px 1px rgba(56,189,248,0.3)' }}
          />
        )}

        <Icon
          className={[
            'w-4 h-4 shrink-0 transition-colors duration-150',
            isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-300',
          ].join(' ')}
        />

        <div className="flex-1 min-w-0">
          <div className={['text-sm truncate font-medium', isActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-800 dark:text-slate-300'].join(' ')}>
            {item.label}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-500 truncate font-mono">
            {item.sub}
          </div>
        </div>

        {hasBadge && badgeValue !== undefined && (
          <span
            className={[
              'shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
              item.id === 'dashboard' && typeof badgeValue === 'number' && badgeValue > 0
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
            ].join(' ')}
          >
            {badgeValue}
          </span>
        )}
      </button>
    );
  };

  // ── Render a nav group ────────────────────────────────────────────────────
  const renderGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups[group.title] ?? true;
    const { title, accent } = group;

    return (
      <div key={title} className="mb-1">
        {/* ── Group header ── */}
        <button
          onClick={() => toggleGroup(title)}
          className={[
            'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
            accent.chipBg, accent.chipHover,
          ].join(' ')}
          title={isExpanded ? '收合' : '展開'}
        >
          {isExpanded ? (
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${accent.titleColor}`} />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          {/* colored dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dotColor}`} />
          <span className={`truncate text-xs ${accent.titleColor}`}>{title}</span>
        </button>

        {/* ── Group items ── */}
        <div
          className={[
            'overflow-hidden transition-all duration-200',
            isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
        >
          <div className="space-y-0.5 py-0.5">
            {group.items.map((item) => renderItem(item, accent))}
          </div>
        </div>
      </div>
    );
  };

  // ── Mobile overlay backdrop ───────────────────────────────────────────────
  const overlay = (
    <div
      className={[
        'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
        mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
      onClick={() => setMobileOpen(false)}
      aria-hidden="true"
    />
  );

  // ── Mobile drawer header actions ──────────────────────────────────────────
  const mobileHeader = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-sky-500/30">
          料
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">料事如神系統</span>
      </div>
      <button
        onClick={() => setMobileOpen(false)}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="關閉選單"
        aria-label="關閉選單"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  // ── Desktop / mobile shared sidebar content ───────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="hidden lg:flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-sky-500/30 shrink-0">
          料
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">料事如神系統</div>
        </div>
      </div>

      {/* Mobile header */}
      {mobileOpen && mobileHeader}

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin" role="navigation" aria-label="主要導航">
        {NAV_GROUPS.map(renderGroup)}

        {/* Admin section (conditional) */}
        {adminUnlocked && (
          <>
            <div className="my-2 border-t border-slate-200 dark:border-slate-800/60" />
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Admin 模式
            </div>
            <div className="space-y-0.5 pb-2">
              <button
                id="sidebar-backup-btn"
                onClick={() => {
                  onNavigateToBackup();
                  setMobileOpen(false);
                }}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer group',
                  activeTab === 'backup_settings'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
                title="自動化備份系統"
              >
                <ShieldCheck
                  className={[
                    'w-4 h-4 shrink-0 transition-colors duration-150',
                    activeTab === 'backup_settings' ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600 dark:text-slate-400 dark:group-hover:text-emerald-300',
                  ].join(' ')}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate font-medium">自動化備份</div>
                  <div className="text-[10px] text-slate-500 font-mono">Backup System</div>
                </div>
                {backupEnabled && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono leading-relaxed">
          Developed by Wesley Chang<br />
          @Mouldex · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );

  // ── Desktop: persistent left sidebar ──────────────────────────────────────
  const desktopSidebar = (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800"
      aria-label="桌面端導航側邊欄"
    >
      {sidebarContent}
    </aside>
  );

  // ── Mobile/Tablet: overlay drawer ─────────────────────────────────────────
  const mobileDrawer = (
    <>
      {overlay}
      <aside
        className={[
          'fixed top-0 left-0 z-50 flex flex-col h-full w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/60 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="行動端導航抽屜"
      >
        {sidebarContent}
      </aside>
    </>
  );

  return (
    <>
      {desktopSidebar}
      {mobileDrawer}
    </>
  );
};
