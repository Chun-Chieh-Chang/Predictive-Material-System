/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  Calculator,
  CalendarCheck,
  Database,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Sun,
  Moon,
  ShieldCheck,
  Crown,
  Layers,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PMS_VERSION } from '../utils/version';

const ADMIN_COMBO_THRESHOLD = 5;
const ADMIN_COMBO_WINDOW_MS = 1500;

/** 將 Date 轉為台灣時間 YYYY-MM-DD 字串 */
function formatTaiwanDate(date: Date): string {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 即時顯示台灣日期的小元件，每日 00:00 自動換算。
 * 以 30 秒間隔檢查日期是否跨天，避免每秒更新造成不必要的 re-render。
 */
const TaiwanDate: React.FC = () => {
  const [dateStr, setDateStr] = useState(() => formatTaiwanDate(new Date()));
  useEffect(() => {
    const timer = setInterval(() => {
      const next = formatTaiwanDate(new Date());
      if (next !== dateStr) setDateStr(next);
    }, 30_000);
    return () => clearInterval(timer);
  }, [dateStr]);
  return <>{dateStr}</>;
};

export type NavTab =
  | 'dashboard'
  | 'mrp_calculator'
  | 'ship_schedule_clearance'
  | 'order_tension_tracker'
  | 'system_settings'
  | 'material_class_management'
  | 'data_tables'
  | 'data_exchange'
  | 'prd_docs'
  | 'glossary'
  | 'backup_settings';

export type PrimaryDomain = 'war_room' | 'mrp_engine' | 'data_center' | 'system_support';

export interface DomainMeta {
  id: PrimaryDomain;
  label: string;
  enLabel: string;
  icon: React.ElementType;
  defaultTab: NavTab;
  tabs: {
    id: NavTab;
    label: string;
    subLabel: string;
    icon: React.ElementType;
    badge?: string | number;
  }[];
}

export function getDomainForTab(tab: NavTab): PrimaryDomain {
  if (tab === 'dashboard' || tab === 'ship_schedule_clearance' || tab === 'order_tension_tracker') {
    return 'war_room';
  }
  if (tab === 'mrp_calculator') {
    return 'mrp_engine';
  }
  if (tab === 'data_tables' || tab === 'material_class_management' || tab === 'data_exchange') {
    return 'data_center';
  }
  return 'system_support';
}

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  alertCount: number;
  onNavigateToBackup: () => void;
  backupEnabled: boolean;
  adminUnlocked: boolean;
  onAdminUnlock: () => void;
  onAdminLock: () => void;
  onMenuToggle: () => void;
  menuOpen: boolean;
  isDemoMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  onNavigateToBackup,
  backupEnabled,
  adminUnlocked,
  onAdminUnlock,
  onAdminLock,
  onMenuToggle,
  menuOpen,
  isDemoMode = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  // ── 5連擊 Admin 解鎖邏輯 ──────────────────────────────────────────
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const [, setComboTaps] = useState<number>(0);

  const clearComboTimer = useCallback(() => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
    tapCountRef.current = 0;
    setComboTaps(0);
  }, []);

  const handleVersionBadgeClick = useCallback(() => {
    if (adminUnlocked) {
      onAdminLock();
      return;
    }

    const now = Date.now();
    const elapsed = now - lastTapAtRef.current;
    lastTapAtRef.current = now;

    if (elapsed > ADMIN_COMBO_WINDOW_MS && elapsed !== 0) {
      clearComboTimer();
    }

    tapCountRef.current += 1;
    const count = tapCountRef.current;
    setComboTaps(count);

    if (count >= ADMIN_COMBO_THRESHOLD) {
      clearComboTimer();
      onAdminUnlock();
    } else {
      tapTimerRef.current = setTimeout(() => {
        clearComboTimer();
      }, ADMIN_COMBO_WINDOW_MS);
    }
  }, [adminUnlocked, clearComboTimer, onAdminUnlock, onAdminLock]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // ── 4 大 MECE 核心領域定義 ─────────────────────────────────────────
  const domains: DomainMeta[] = useMemo(
    () => [
      {
        id: 'war_room',
        label: '決策戰情',
        enLabel: 'War Room',
        icon: BarChart3,
        defaultTab: 'dashboard',
        tabs: [
          { id: 'dashboard', label: '綜合戰情儀表板', subLabel: 'War Room', icon: BarChart3, badge: alertCount > 0 ? alertCount : undefined },
          { id: 'ship_schedule_clearance', label: '週二出貨審查', subLabel: 'Ship Clearance', icon: CalendarCheck },
          { id: 'order_tension_tracker', label: '訂單物料示警', subLabel: 'Order Tension', icon: Activity },
        ],
      },
      {
        id: 'mrp_engine',
        label: '物料推導',
        enLabel: 'MRP Engine',
        icon: Calculator,
        defaultTab: 'mrp_calculator',
        tabs: [
          { id: 'mrp_calculator', label: '3 階 MRP 推導', subLabel: 'MRP Engine', icon: Calculator },
        ],
      },
      {
        id: 'data_center',
        label: '數據中心',
        enLabel: 'Data Center',
        icon: Database,
        defaultTab: 'data_tables',
        tabs: [
          { id: 'data_tables', label: '10 大主檔維護', subLabel: 'Master Tables', icon: Database },
          { id: 'material_class_management', label: '五層物料分類', subLabel: 'Classification', icon: Layers },
          { id: 'data_exchange', label: '資料交換與模擬', subLabel: 'Data & Simulation', icon: FileSpreadsheet },
        ],
      },
      {
        id: 'system_support',
        label: '系統支援',
        enLabel: 'System & Support',
        icon: SlidersHorizontal,
        defaultTab: 'system_settings',
        tabs: [
          { id: 'system_settings', label: '參數策略配置', subLabel: 'System Config', icon: SlidersHorizontal },
          { id: 'glossary', label: '專業術語辭典', subLabel: 'Glossary', icon: BookOpen },
          { id: 'prd_docs', label: 'PRD 規格與驗收總表', subLabel: 'PRD & Verification', icon: FileText },
          ...(adminUnlocked
            ? [
                {
                  id: 'backup_settings' as NavTab,
                  label: '自動化備份',
                  subLabel: 'Backup System',
                  icon: ShieldCheck,
                  badge: backupEnabled ? 'RUNNING' : undefined,
                },
              ]
            : []),
        ],
      },
    ],
    [alertCount, adminUnlocked, backupEnabled]
  );

  const activeDomain = getDomainForTab(activeTab);
  const currentDomainMeta = domains.find((d) => d.id === activeDomain) || domains[0];

  const handleDomainClick = (domain: DomainMeta) => {
    if (getDomainForTab(activeTab) === domain.id) return;
    setActiveTab(domain.defaultTab);
  };

  return (
    <header className="bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-300 dark:border-slate-800/80 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Top Status & Brand Row */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800/50">
          {/* Brand & Version */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-pms-cobalt rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md shadow-sky-600/25 shrink-0">
              料
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  料事如神系統
                </h1>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-normal hidden md:inline">
                  Predictive Material System
                </span>
                <button
                  onClick={handleVersionBadgeClick}
                  className={`text-sm font-mono px-2 py-0.5 rounded-md font-semibold tracking-wide transition-all cursor-pointer select-none ${
                    adminUnlocked
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
                      : 'bg-pms-iso-bg dark:bg-indigo-950/60 text-pms-iso dark:text-indigo-400 border border-pms-iso-border dark:border-indigo-800/60 hover:border-pms-iso dark:hover:border-indigo-400'
                  }`}
                  title={adminUnlocked ? 'Admin 管理模式已啟用（點擊重新鎖定）' : 'ISO 標準認證版號標籤（連續點擊 5 次解鎖進階管理模式）'}
                >
                  <span className="flex items-center gap-1">
                    {adminUnlocked && <Crown className="w-3 h-3" />}
                    ISO • {PMS_VERSION}
                  </span>
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block mt-0.5">
                QCC 料事如神圈 • 射出成型智能備料與產能排程推估
              </p>
            </div>
          </div>

          {/* Telemetry Status & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Database Mode Badge */}
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-xs transition-all ${
                isDemoMode
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              }`}
              title={isDemoMode ? '目前載入 52 筆示範演練數據，匯入真實 Excel/JSON 時將自動換檔' : '目前為主體正式生產資料庫'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-sky-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span>{isDemoMode ? '🎮 示範演練模式 (DEMO)' : '🟢 正式生產模式 (PROD)'}</span>
            </div>

            {/* Connection Status Indicator */}
            <div className="hidden lg:flex items-center space-x-2 bg-pms-pass-bg dark:bg-emerald-950/40 border border-pms-pass-border dark:border-emerald-800/60 text-pms-pass-text dark:text-emerald-400 px-2.5 py-1 rounded-md shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pms-pass"></span>
              </span>
              <span className="text-sm font-semibold">
                內網伺服器連線中
              </span>
              <span className="text-[11px] text-pms-pass/80 dark:text-emerald-400/80 font-mono ml-1">
                <TaiwanDate />
              </span>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                id="nav-theme-toggle-btn"
                title={theme === 'light' ? '切換為深色主題 (Dark Theme)' : '切換為淺色主題 (Light Theme)'}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline font-semibold">深色模式</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline font-semibold">淺色模式</span>
                  </>
                )}
              </button>

              {adminUnlocked && (
                <button
                  onClick={onNavigateToBackup}
                  id="nav-backup-btn"
                  title={`自動化備份系統${backupEnabled ? '（排程已啟用）' : '（排程未啟用）'}`}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer shadow-xs ${
                    backupEnabled
                      ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${backupEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">自動化備份</span>
                  {backupEnabled && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4 大 MECE 核心領域導航與二級子視圖切換列 ──────────────────────── */}
        <div className="hidden lg:flex items-center justify-between py-2 gap-4">
          {/* 4 大核心領域切換鈕 (Primary Domains) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
            {domains.map((domain) => {
              const isDomainActive = activeDomain === domain.id;
              const Icon = domain.icon;
              return (
                <button
                  key={domain.id}
                  onClick={() => handleDomainClick(domain)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    isDomainActive
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isDomainActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'}`} />
                  <span>{domain.label}</span>
                  {domain.id === 'war_room' && alertCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-xs font-bold rounded-full bg-rose-500 text-white">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 二級子視圖微切換條 (Segmented Sub-navigation Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1 font-mono uppercase tracking-wider">
              {currentDomainMeta.enLabel}:
            </span>
            {currentDomainMeta.tabs.map((tab) => {
              const isTabActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer whitespace-nowrap border ${
                    isTabActive
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isTabActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[11px] font-bold rounded-full ${
                        typeof tab.badge === 'number' && tab.badge > 0
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile hamburger menu button (visible < lg) */}
        <div className="lg:hidden flex items-center justify-between py-2 border-t border-slate-200 dark:border-slate-800/50">
          <button
            onClick={onMenuToggle}
            id="nav-menu-btn"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
            title={menuOpen ? '關閉選單' : '開啟導航選單'}
            aria-label={menuOpen ? '關閉選單' : '開啟導航選單'}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>{currentDomainMeta.label} · {currentDomainMeta.tabs.find((t) => t.id === activeTab)?.label || '功能導航'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

