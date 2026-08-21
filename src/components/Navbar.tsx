/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart3,
  Calculator,
  Database,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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

export type NavTab = 'dashboard' | 'mrp_calculator' | 'system_settings' | 'data_tables' | 'data_exchange' | 'prd_docs' | 'backup_settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  alertCount: number;
  onNavigateToBackup: () => void;
  backupEnabled: boolean;
  adminUnlocked: boolean;
  onAdminUnlock: () => void;
  onAdminLock: () => void;
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
}) => {
  const { theme, toggleTheme } = useTheme();

  // ── 5連擊 Admin 解鎖邏輯（視覺計數局部維護）──────────────────────────────────
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const [comboTaps, setComboTaps] = useState<number>(0);

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
      // 已解鎖：點擊重新鎖定
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
    return () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current); };
  }, []);

  const tabs = [
    { id: 'dashboard' as NavTab, label: '決策戰情室', sub: 'Decision War Room', icon: BarChart3, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'mrp_calculator' as NavTab, label: '3階 MRP 推導', sub: 'MRP Engine', icon: Calculator },
    { id: 'system_settings' as NavTab, label: '參數策略設定', sub: 'System Config', icon: SlidersHorizontal },
    { id: 'data_tables' as NavTab, label: '8大主檔維護', sub: 'Master Data', icon: Database },
    { id: 'data_exchange' as NavTab, label: '資料交換中心', sub: 'Data Gateway', icon: FileSpreadsheet },
    { id: 'prd_docs' as NavTab, label: 'PRD 規格辭典', sub: 'PRD & Spec', icon: FileText },
    ...(adminUnlocked ? [{ id: 'backup_settings' as NavTab, label: '自動化備份', sub: 'Backup System', icon: ShieldCheck, badge: backupEnabled ? 'RUNNING' : undefined }] : []),
  ];

  return (
    <header className="bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-300 dark:border-slate-800/80 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Top Status & Brand Row */}
        <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800/50">
          {/* Brand & Version */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-[#0284c7] rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-md shadow-sky-600/25 shrink-0">
              料
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  料事如神系統
                </h1>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-normal hidden md:inline">
                  Predictive Material System
                </span>
                <button
                  onClick={handleVersionBadgeClick}
                  className={`text-xs font-mono px-2 py-0.5 rounded-md font-semibold tracking-wide transition-all cursor-pointer select-none ${
                    adminUnlocked
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
                      : 'bg-[#eef2ff] dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400 border border-[#c7d2fe] dark:border-indigo-800/60 hover:border-[#4f46e5] dark:hover:border-indigo-400'
                  }`}
                  title={adminUnlocked ? 'Admin 管理模式已啟用（點擊重新鎖定）' : 'ISO 標準認證版號標籤'}
                >
                  <span className="flex items-center gap-1">
                    {adminUnlocked && <Crown className="w-3 h-3" />}
                    ISO • {import.meta.env.VITE_PMS_VERSION}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block mt-0.5">
                QCC 料事如神圈 • 射出成型智能備料與產能排程推估
              </p>
            </div>
          </div>

          {/* Telemetry Status & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Connection Status Indicator */}
            <div className="hidden lg:flex items-center space-x-2 bg-[#ecfdf5] dark:bg-emerald-950/40 border border-[#a7f3d0] dark:border-emerald-800/60 text-[#065f46] dark:text-emerald-400 px-2.5 py-1 rounded-md shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
              </span>
              <span className="text-xs font-semibold">
                內網伺服器連線中
              </span>
              <span className="text-[11px] text-[#059669]/80 dark:text-emerald-400/80 font-mono ml-1">
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
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

        {/* Tab Navigation Row */}
        <nav className="flex space-x-2 overflow-x-auto py-2.5 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                  isActive
                    ? 'bg-[#e0f2fe] text-[#0284c7] border-[#0284c7] font-bold shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-600'
                    : 'bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-[#f8fafc] dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0284c7] dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  tab.id === 'backup_settings' ? (
                    <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {tab.badge}
                    </span>
                  ) : (
                    <span className="bg-[#dc2626] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

