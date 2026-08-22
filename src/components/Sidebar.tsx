/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calculator,
  Layers,
  Database,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Menu,
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
  core: {
    titleColor: 'text-sky-400',
    dotColor:   'bg-sky-400',
    itemBorder: 'border-l-sky-500',
    chipBg:     'bg-sky-500/10',
    chipHover:  'hover:bg-sky-500/15',
  },
  data: {
    titleColor: 'text-emerald-400',
    dotColor:   'bg-emerald-400',
    itemBorder: 'border-l-emerald-500',
    chipBg:     'bg-emerald-500/10',
    chipHover:  'hover:bg-emerald-500/15',
  },
  settings: {
    titleColor: 'text-amber-400',
    dotColor:   'bg-amber-400',
    itemBorder: 'border-l-amber-500',
    chipBg:     'bg-amber-500/10',
    chipHover:  'hover:bg-amber-500/15',
  },
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: '核心操作',
    accent: ACCENT.core,
    items: [
      { id: 'dashboard', label: '決策戰情室', sub: 'Decision War Room', icon: BarChart3 },
      { id: 'mrp_calculator', label: '3 階 MRP 推導', sub: 'MRP Engine', icon: Calculator },
    ],
  },
  {
    title: '資料管理',
    accent: ACCENT.data,
    items: [
      { id: 'material_class_management', label: '物料分類體系', sub: 'Material Classes', icon: Layers },
      { id: 'data_tables', label: '10 大主檔維護', sub: 'Master Data', icon: Database },
      { id: 'data_exchange', label: '資料交換中心', sub: 'Data Gateway', icon: FileSpreadsheet },
    ],
  },
  {
    title: '設定與文件',
    accent: ACCENT.settings,
    items: [
      { id: 'system_settings', label: '參數策略設定', sub: 'System Config', icon: SlidersHorizontal },
      { id: 'prd_docs', label: 'PRD 規格辭典', sub: 'PRD & Spec', icon: FileText },
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
    NAV_GROUPS.forEach((g) => { init[g.title] = true; });
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
            ? `${accent.itemBorder} bg-white/10 text-white font-semibold`
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:border-l-slate-600',
        ].join(' ')}
      >
        {/* Active glow bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-white/60 rounded-full"
            style={{ boxShadow: '0 0 6px 1px rgba(255,255,255,0.2)' }}
          />
        )}

        <Icon
          className={[
            'w-4 h-4 shrink-0 transition-colors duration-150',
            isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300',
          ].join(' ')}
        />

        <div className="flex-1 min-w-0">
          <div className={['text-sm truncate font-medium', isActive ? 'text-white' : ''].join(' ')}>
            {item.label}
          </div>
          <div className="text-[11px] text-slate-500 truncate font-mono">
            {item.sub}
          </div>
        </div>

        {hasBadge && badgeValue !== undefined && (
          <span
            className={[
              'shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
              item.id === 'dashboard' && typeof badgeValue === 'number' && badgeValue > 0
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400',
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
      <div key={title} className="mb-0.5">
        {/* ── Group header ── */}
        <button
          onClick={() => toggleGroup(title)}
          className={[
            'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer',
            accent.chipBg, accent.chipHover,
          ].join(' ')}
          title={isExpanded ? '收合' : '展開'}
        >
          {isExpanded ? (
            <ChevronDown className={`w-3 h-3 shrink-0 ${accent.titleColor}`} />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-slate-500" />
          )}
          {/* colored dot */}
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accent.dotColor}`} />
          <span className={`truncate ${accent.titleColor}`}>{title}</span>
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
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-sky-500/30">
          料
        </div>
        <span className="text-sm font-bold text-white">料事如神系統</span>
      </div>
      <button
        onClick={() => setMobileOpen(false)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
      <div className="hidden lg:flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800 shrink-0">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md shadow-sky-500/30 shrink-0">
          料
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white leading-tight">料事如神系統</div>
          <div className="text-[10px] text-slate-500 font-mono leading-tight">
            PMS v{import.meta.env.VITE_PMS_VERSION}
          </div>
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
            <div className="my-2 border-t border-slate-800/60" />
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
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
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                ].join(' ')}
                title="自動化備份系統"
              >
                <ShieldCheck
                  className={[
                    'w-4 h-4 shrink-0 transition-colors duration-150',
                    activeTab === 'backup_settings' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-300',
                  ].join(' ')}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">自動化備份</div>
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
      <div className="px-4 py-3 border-t border-slate-800 shrink-0">
        <div className="text-[10px] text-slate-500 font-mono leading-relaxed">
          Developed by Wesley Chang<br />
          @Mouldex · Aug 2026
        </div>
      </div>
    </div>
  );

  // ── Desktop: persistent left sidebar ──────────────────────────────────────
  const desktopSidebar = (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 bg-slate-950 border-r border-slate-800"
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
          'fixed top-0 left-0 z-50 flex flex-col h-full w-72 bg-slate-950 border-r border-slate-800 shadow-2xl shadow-black/60 transition-transform duration-200',
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
