/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MrpCalculatorView } from './components/MrpCalculatorView';
import { SystemSettingsView } from './components/SystemSettingsView';
import { DataTablesView, TableKey } from './components/DataTablesView';
import { DataExchangeView } from './components/DataExchangeView';
import { PrdDocView } from './components/PrdDocView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { MaterialClassManagementView } from './components/MaterialClassManagementView';
import {
  SystemDatabase,
  SystemParameters,
  DEFAULT_SYSTEM_PARAMETERS,
  BackupScheduleConfig,
  DEFAULT_BACKUP_CONFIG,
  BACKUP_CONFIG_STORAGE_KEY,
} from './types';
import { INITIAL_DATABASE } from './data/seedData';
import { calculateAllMRP } from './utils/mrpEngine';
import { performBackup, shouldTriggerBackup, loadBackupConfig } from './utils/backupService';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const STORAGE_KEY = 'PMS_DATABASE_STATE_V1';
const PARAMS_STORAGE_KEY = 'PMS_SYSTEM_PARAMETERS_V1';

export function App() {
  // Load state from LocalStorage or seed data
  const [db, setDb] = useState<SystemDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Backward compat: ensure audit_log field exists
        if (!parsed.audit_log) parsed.audit_log = [];
        if (!parsed.material_classes) parsed.material_classes = [];
        if (!parsed.sorting_actual_yield_log) parsed.sorting_actual_yield_log = [];
        // M-02: migrate created_by → created_by_id + created_by_name
        if (parsed.demand_forecast_log?.length && parsed.demand_forecast_log[0]['created_by'] !== undefined && parsed.demand_forecast_log[0]['created_by_id'] === undefined) {
          parsed.demand_forecast_log = parsed.demand_forecast_log.map((r: Record<string, unknown>) => ({
            ...r,
            created_by_id: r['created_by'] as string,
            created_by_name: null as string | null,
          }));
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
    return INITIAL_DATABASE;
  });

  // Load system parameters from LocalStorage or default
  const [systemParams, setSystemParams] = useState<SystemParameters>(() => {
    try {
      const savedParams = localStorage.getItem(PARAMS_STORAGE_KEY);
      if (savedParams) {
        return { ...DEFAULT_SYSTEM_PARAMETERS, ...JSON.parse(savedParams) };
      }
    } catch (e) {
      console.error('Failed to load system parameters from local storage', e);
    }
    return DEFAULT_SYSTEM_PARAMETERS;
  });

  // Save to LocalStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }, [db]);

  // Save system parameters to LocalStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(systemParams));
    } catch (e) {
      console.error('Failed to save system parameters from local storage', e);
    }
  }, [systemParams]);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeMrpSku, setActiveMrpSku] = useState<string>('A01-200-131');
  const [activeTableKey, setActiveTableKey] = useState<TableKey>('item_master');

  // ── Admin 管理模式（5連擊解鎖）────────────────────────────────────────────────
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const handleAdminUnlock = () => setAdminUnlocked(true);
  const handleAdminLock   = () => { setAdminUnlocked(false); setActiveTab('dashboard'); };

  // Backup config state (loaded from localStorage)
  const [backupConfig, setBackupConfig] = useState<BackupScheduleConfig>(() => loadBackupConfig());
  const backupConfigRef = useRef<BackupScheduleConfig>(backupConfig);
  backupConfigRef.current = backupConfig;

  // Backup interval ref (to clear on unmount)
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Backup: Save config when changed ─────────────────────────────────────────
  useEffect(() => {
    const { directoryHandle: _dh, ...serializable } = backupConfig;
    localStorage.setItem(BACKUP_CONFIG_STORAGE_KEY, JSON.stringify(serializable));
  }, [backupConfig]);

  // ── Backup: Schedule polling & on-launch auto-backup ─────────────────────────
  useEffect(() => {
    // On-launch auto-backup
    if (backupConfig.autoDownloadOnLaunch && db) {
      performBackup(db, backupConfig, showToast);
    }

    // Scheduled backup polling (every 10 s)
    backupIntervalRef.current = setInterval(() => {
      if (shouldTriggerBackup(backupConfigRef.current) && db) {
        performBackup(db, backupConfigRef.current, showToast);
      }
    }, 10000);

    return () => {
      if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
    };
  }, [db]); // Only re-run when db changes to get fresh reference

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Calculate alerts for navbar badge using active system parameters
  const mrpResults = calculateAllMRP(db, undefined, systemParams);
  const totalAlerts = mrpResults.reduce((sum, r) => sum + r.alerts.filter((a) => a.level !== 'green').length, 0);

  const handleNavigateToMRP = (sku: string) => {
    setActiveMrpSku(sku);
    setActiveTab('mrp_calculator');
  };

  const handleNavigateToTables = (tableName: string) => {
    setActiveTableKey(tableName as TableKey);
    setActiveTab('data_tables');
  };

  const handleNavigateToSettings = () => {
    setActiveTab('system_settings');
  };

  const handleNavigateToExchange = () => {
    setActiveTab('data_exchange');
  };

  const handleNavigateToBackup = () => {
    setActiveTab('backup_settings');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col font-sans antialiased selection:bg-[#0284c7] selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={totalAlerts}
        onNavigateToBackup={handleNavigateToBackup}
        backupEnabled={backupConfig.enabled}
        adminUnlocked={adminUnlocked}
        onAdminUnlock={handleAdminUnlock}
        onAdminLock={handleAdminLock}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-10">
        {activeTab === 'dashboard' && (
          <DashboardView
            db={db}
            params={systemParams}
            onNavigateToMRP={handleNavigateToMRP}
            onNavigateToTables={handleNavigateToTables}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToExchange={handleNavigateToExchange}
          />
        )}

        {activeTab === 'mrp_calculator' && (
          <MrpCalculatorView
            db={db}
            params={systemParams}
            initialSku={activeMrpSku}
            onNavigateToSettings={handleNavigateToSettings}
          />
        )}

        {activeTab === 'system_settings' && (
          <SystemSettingsView
            db={db}
            params={systemParams}
            setParams={setSystemParams}
            onNotify={showToast}
            onNavigateToMRP={handleNavigateToMRP}
          />
        )}

        {activeTab === 'material_class_management' && (
          <MaterialClassManagementView
            classes={db.material_classes}
            onNotify={showToast}
          />
        )}

        {activeTab === 'data_tables' && (
          <DataTablesView
            db={db}
            setDb={setDb}
            initialTable={activeTableKey}
            onNotify={showToast}
          />
        )}

        {activeTab === 'data_exchange' && (
          <DataExchangeView
            db={db}
            setDb={setDb}
            onNotify={showToast}
          />
        )}

        {activeTab === 'prd_docs' && (
          <PrdDocView onNotify={showToast} />
        )}

        {activeTab === 'backup_settings' && adminUnlocked && (
          <BackupSettingsView
            db={db}
            onNotify={showToast}
          />
        )}
      </main>

      {/* Toast Notification Popup (QC Style with Cobalt Border) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-800 border-l-4 border-l-[#0284c7] backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-2 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer System Info */}
      <footer className="border-t border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 py-4 mt-auto transition-colors">
        <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-300">料事如神圈 QCC 物料需求管理系統</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">Baseline Version {import.meta.env.VITE_PMS_VERSION}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[#0284c7] dark:text-sky-400 font-semibold font-mono">Developed by Wesley Chang @Mouldex, Aug-2026</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-500 dark:text-slate-400">產能排程與備料推估引擎</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={handleNavigateToSettings}
              className="text-[#4f46e5] dark:text-indigo-400 hover:underline font-semibold transition-colors cursor-pointer"
            >
              設定系統參數
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;

