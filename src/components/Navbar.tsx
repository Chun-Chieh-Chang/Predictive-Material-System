/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart3,
  Calculator,
  Database,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavTab = 'dashboard' | 'mrp_calculator' | 'system_settings' | 'data_tables' | 'data_exchange' | 'prd_docs';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  alertCount: number;
  onResetSeedData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  onResetSeedData
}) => {
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'dashboard' as NavTab, label: '決策戰情室', sub: 'Decision War Room', icon: BarChart3, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'mrp_calculator' as NavTab, label: '3階 MRP 推導', sub: 'MRP Engine', icon: Calculator },
    { id: 'system_settings' as NavTab, label: '參數策略設定', sub: 'System Config', icon: SlidersHorizontal },
    { id: 'data_tables' as NavTab, label: '8大主檔維護', sub: 'Master Data', icon: Database },
    { id: 'data_exchange' as NavTab, label: '無損資料中心', sub: 'Data Gateway', icon: FileSpreadsheet },
    { id: 'prd_docs' as NavTab, label: 'PRD 規格辭典', sub: 'PRD & Spec', icon: FileText }
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
                <span className="bg-[#eef2ff] dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-400 border border-[#c7d2fe] dark:border-indigo-800/60 text-xs font-mono px-2 py-0.5 rounded-md font-semibold tracking-wide">
                  ISO • V-20260820-12
                </span>
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
                2026-08-20
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

              <button
                onClick={() => setActiveTab('data_exchange')}
                id="nav-data-exchange-btn"
                title="前往無損資料中心匯出正式範本或載入示範數據"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">資料交換中心</span>
              </button>
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
                  <span className="bg-[#dc2626] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

