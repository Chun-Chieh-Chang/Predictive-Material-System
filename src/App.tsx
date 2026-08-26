/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Navbar, NavTab, RoleMode } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PMS_VERSION } from './utils/version';
import { SalesWorkbenchView } from './components/SalesWorkbenchView';
import { ProcurementWorkbenchView } from './components/ProcurementWorkbenchView';
import { DashboardView } from './components/DashboardView';
import { DataPipelineView } from './components/DataPipelineView';
import { MrpCalculatorView } from './components/MrpCalculatorView';
import { ShipScheduleClearanceView } from './components/ShipScheduleClearanceView';
import { OrderTensionTrackerView } from './components/OrderTensionTrackerView';
import { SystemSettingsView } from './components/SystemSettingsView';
import { DataTablesView, TableKey } from './components/DataTablesView';
import { DataExchangeView } from './components/DataExchangeView';
import { PrdDocView } from './components/PrdDocView';
import { DataLogicSpecView } from './components/DataLogicSpecView';
import { BackupSettingsView } from './components/BackupSettingsView';
import { MaterialClassManagementView } from './components/MaterialClassManagementView';
import { GlossaryView } from './components/GlossaryView';
import {
  SystemDatabase,
  SystemParameters,
  DEFAULT_SYSTEM_PARAMETERS,
  DEFAULT_MATERIAL_CLASSES,
  MaterialClass,
  BackupScheduleConfig,
  DEFAULT_BACKUP_CONFIG,
  BACKUP_CONFIG_STORAGE_KEY,
  isDemoDatabase,
} from './types';
import { INITIAL_DATABASE } from './data/seedData';
import { calculateAllMRP } from './utils/mrpEngine';
import { performBackup, shouldTriggerBackup, loadBackupConfig } from './utils/backupService';
import { loadSharedData, saveSharedData, DataSourceMode } from './utils/dataStoreAdapter';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const STORAGE_KEY = 'PMS_DATABASE_STATE_V1';
const PARAMS_STORAGE_KEY = 'PMS_SYSTEM_PARAMETERS_V1';
const ROLE_MODE_STORAGE_KEY = 'PMS_ROLE_MODE_V1';

const CUSTOMER_ANONYMIZATION_MAP: Record<string, string> = {
  'MDX': 'A客戶',
  'ICU': 'B客戶',
  'MED': 'C客戶',
  'OEM': 'D客戶',
  'GEN': '通用客戶',
  '通用': '通用客戶',
};

const SUPPLIER_ANONYMIZATION_MAP: Record<string, string> = {
  '台化': 'A供應商 (國內陸運)',
  '奇美': 'B供應商 (國外海運進口)',
  '台塑': 'C供應商 (國內陸運)',
  'INEOS': 'D供應商 (國外海運進口)',
  'Covestro': 'E供應商 (國外海運進口)',
  'Teijin': 'F供應商 (國外海運進口)',
  'Avient': 'G供應商 (廠內常備)',
  'Clariant': 'H供應商 (國內陸運)',
  '立安': 'A供應商 (國內陸運)',
};

function sanitizeAnonymization(rawDb: any): any {
  if (!rawDb) return rawDb;
  const mapCust = (val: any) => {
    if (typeof val === 'string') {
      for (const [k, v] of Object.entries(CUSTOMER_ANONYMIZATION_MAP)) {
        if (val === k) return v;
      }
    }
    return val;
  };
  const mapSup = (val: any) => {
    if (typeof val === 'string') {
      for (const [k, v] of Object.entries(SUPPLIER_ANONYMIZATION_MAP)) {
        if (val.includes(k)) return v;
      }
    }
    return val;
  };

  if (Array.isArray(rawDb.item_master)) {
    rawDb.item_master.forEach((i: any) => {
      if (i.customer_id) i.customer_id = mapCust(i.customer_id);
      if (i.supplier_name) i.supplier_name = mapSup(i.supplier_name);
    });
  }
  if (Array.isArray(rawDb.demand_forecast_log)) {
    rawDb.demand_forecast_log.forEach((d: any) => {
      if (d.customer_id) d.customer_id = mapCust(d.customer_id);
    });
  }
  if (Array.isArray(rawDb.actual_order)) {
    rawDb.actual_order.forEach((o: any) => {
      if (o.customer_id) o.customer_id = mapCust(o.customer_id);
    });
  }
  if (Array.isArray(rawDb.po_in_transit)) {
    rawDb.po_in_transit.forEach((p: any) => {
      if (p.supplier_name) p.supplier_name = mapSup(p.supplier_name);
    });
  }
  return rawDb;
}

/**
 * 舊版資料遷移與去識別化清洗（LocalStorage 與內網共用載入共用此路徑）
 */
function migrateRawDbInner(parsed: any): SystemDatabase {
  // Backward compat: ensure required array fields exist
  if (!parsed.audit_log) parsed.audit_log = [];
  if (!parsed.material_classes) parsed.material_classes = [];
  if (!parsed.sorting_actual_yield_log) parsed.sorting_actual_yield_log = [];

  // V2.0 Scheme B Migration: merge legacy yield_master and supplier_rule_master into item_master
  if (Array.isArray(parsed.yield_master)) {
    parsed.yield_master.forEach((y: any) => {
      const item = parsed.item_master?.find((i: any) => i.sku === y.sku);
      if (item && y.std_sorting_yield != null && item.std_sorting_yield == null) {
        item.std_sorting_yield = y.std_sorting_yield;
      }
    });
    delete parsed.yield_master;
  }
  if (Array.isArray(parsed.supplier_rule_master)) {
    parsed.supplier_rule_master.forEach((s: any) => {
      const item = parsed.item_master?.find((i: any) => i.sku === s.rm_sku);
      if (item) {
        if (s.supplier_name && !item.supplier_name) item.supplier_name = s.supplier_name;
        if (s.lead_time_days != null && item.lead_time_days == null) item.lead_time_days = s.lead_time_days;
        if (s.moq_kg != null && item.moq_kg == null) item.moq_kg = s.moq_kg;
        if (s.safety_stock_kg != null && item.safety_stock_kg == null) item.safety_stock_kg = s.safety_stock_kg;
      }
    });
    delete parsed.supplier_rule_master;
  }
  if (parsed.color_mixing_log) {
    delete parsed.color_mixing_log;
  }

  // M-02: migrate created_by → created_by_id + created_by_name
  if (parsed.demand_forecast_log?.length && parsed.demand_forecast_log[0]['created_by'] !== undefined && parsed.demand_forecast_log[0]['created_by_id'] === undefined) {
    parsed.demand_forecast_log = parsed.demand_forecast_log.map((r: Record<string, unknown>) => ({
      ...r,
      created_by_id: r['created_by'] as string,
      created_by_name: null as string | null,
    }));
  }

  // Auto-Sanitization: Ensure Rule 8 Data Anonymization across all records
  return sanitizeAnonymization(parsed);
}

export function App() {
  // Load state from LocalStorage or seed data
  const [db, setDb] = useState<SystemDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return migrateRawDbInner(JSON.parse(saved));
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
      console.error('Failed to save system parameters to local storage', e);
    }
  }, [systemParams]);

  // ── 五層分類目錄（MaterialClassManagementView 編輯之共用分類資料）────────────
  const [classDirectory, setClassDirectory] = useState<MaterialClass[]>(() => {
    try {
      const saved = localStorage.getItem('PMS_MATERIAL_CLASSES_V1');
      return saved ? JSON.parse(saved) : DEFAULT_MATERIAL_CLASSES;
    } catch { return DEFAULT_MATERIAL_CLASSES; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('PMS_MATERIAL_CLASSES_V1', JSON.stringify(classDirectory));
    } catch (e) {
      console.error('Failed to save class directory', e);
    }
  }, [classDirectory]);

  const [roleMode, setRoleMode] = useState<RoleMode>(() => {
    try {
      const saved = localStorage.getItem(ROLE_MODE_STORAGE_KEY);
      if (saved === 'sales' || saved === 'procurement' || saved === 'full') return saved;
    } catch {}
    return 'sales';
  });

  useEffect(() => {
    try {
      localStorage.setItem(ROLE_MODE_STORAGE_KEY, roleMode);
    } catch (e) {
      console.error('Failed to save roleMode', e);
    }
  }, [roleMode]);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      const savedRole = localStorage.getItem(ROLE_MODE_STORAGE_KEY);
      if (savedRole === 'procurement') return 'procurement_workbench';
      if (savedRole === 'full') return 'dashboard';
    } catch {}
    return 'sales_workbench';
  });
  const [activeMrpSku, setActiveMrpSku] = useState<string>('A01-200-131');
  const [activeTableKey, setActiveTableKey] = useState<TableKey>('item_master');
  const [menuOpen, setMenuOpen] = useState(false);

  // ── V2-Intranet：內網共用資料來源狀態 ────────────────────────────────────────
  const [dataSource, setDataSource] = useState<DataSourceMode>('local');
  const [dataSourceError, setDataSourceError] = useState<string | null>(null);
  const [sharedVersion, setSharedVersion] = useState<number>(0);
  const [sharedSavedAt, setSharedSavedAt] = useState<string | null>(null);
  const [savingShared, setSavingShared] = useState<boolean>(false);

  // 啟動時嘗試從內網檔案服務載入；404 = 首次初始化（以現狀回寫）；失敗 = 離線本機模式
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadSharedData();
      if (cancelled) return;
      if (result.mode === 'intranet' && result.payload) {
        setDb(migrateRawDbInner(result.payload.database as any));
        setSystemParams({ ...DEFAULT_SYSTEM_PARAMETERS, ...result.payload.systemParams });
        setClassDirectory(result.payload.materialClasses?.length ? result.payload.materialClasses : DEFAULT_MATERIAL_CLASSES);
        setSharedVersion(result.version);
        setDataSource('intranet');
      } else if (result.mode === 'intranet' && !result.payload) {
        const init = await saveSharedData(
          { database: db, systemParams: systemParams, materialClasses: classDirectory },
          0
        );
        if (cancelled) return;
        if (init.ok) {
          setSharedVersion(init.version);
          setSharedSavedAt(init.savedAt ?? null);
        }
        setDataSource('intranet');
      } else {
        setDataSource('local');
        setDataSourceError(result.error ?? null);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 手動儲存至內網共用資料夾（樂觀鎖；409 = 他人已先儲存）
  const handleSaveToShared = async () => {
    setSavingShared(true);
    const result = await saveSharedData(
      { database: db, systemParams: systemParams, materialClasses: classDirectory },
      sharedVersion
    );
    setSavingShared(false);
    if (result.ok) {
      setSharedVersion(result.version);
      setSharedSavedAt(result.savedAt ?? null);
      showToast('已儲存至內網共用資料夾，其他同仁重新載入即可取得最新資料。', 'success');
    } else if (result.conflict) {
      showToast(`儲存衝突：資料已被他人更新（伺服器版本 ${result.currentVersion}）。請重新載入頁面取得最新資料後再儲存。`, 'error');
    } else {
      showToast(`儲存失敗：${result.error ?? '未知錯誤'}`, 'error');
    }
  };

  // ── Admin 管理模式（5連擊解鎖）────────────────────────────────────────────────
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const handleAdminUnlock = () => setAdminUnlocked(true);
  const handleAdminLock   = () => { setAdminUnlocked(false); setActiveTab(roleMode === 'sales' ? 'sales_workbench' : roleMode === 'procurement' ? 'procurement_workbench' : 'dashboard'); };

  // Backup config state (loaded from localStorage)
  const [backupConfig, setBackupConfig] = useState<BackupScheduleConfig>(() => loadBackupConfig());
  const backupConfigRef = useRef<BackupScheduleConfig>(backupConfig);
  backupConfigRef.current = backupConfig;

  // Backup interval ref (to clear on unmount)
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Backup: Save config when changed ─────────────────────────────────────────
  useEffect(() => {
    try {
      const { directoryHandle: _dh, ...serializable } = backupConfig;
      localStorage.setItem(BACKUP_CONFIG_STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save backup config (storage unavailable)', e);
    }
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
  const mrpResults = useMemo(() => calculateAllMRP(db, undefined, systemParams), [db, systemParams]);
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

  // ── 獨立頁面路由：?page=spec 以全版面獨立頁開啟數據邏輯規格書（不入 App 框架、無導航干擾） ──
  const [specStandalone, setSpecStandalone] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get('page') === 'spec'
  );
  const openSpecStandalone = useCallback(() => {
    window.history.pushState({}, '', '?page=spec');
    setSpecStandalone(true);
  }, []);
  const closeSpecStandalone = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname);
    setSpecStandalone(false);
  }, []);
  useEffect(() => {
    const onPop = () =>
      setSpecStandalone(new URLSearchParams(window.location.search).get('page') === 'spec');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 側邊欄／導航欄點擊「數據邏輯規格書」時改為跳轉獨立頁，而非切換內嵌分頁
  const handleSetTab = useCallback(
    (tab: NavTab) => {
      if (tab === 'data_logic_spec') {
        openSpecStandalone();
        return;
      }
      setActiveTab(tab);
    },
    [openSpecStandalone]
  );

  if (specStandalone) {
    return <DataLogicSpecView db={db} params={systemParams} onBack={closeSpecStandalone} />;
  }

  return (
    <div className="min-h-screen bg-[#ebf0f5] dark:bg-slate-950 text-slate-900 dark:text-slate-200 flex flex-col font-sans antialiased selection:bg-[#0284c7] selection:text-white transition-colors duration-200">
      {/* Left Sidebar (desktop fixed, mobile overlay drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        alertCount={totalAlerts}
        adminUnlocked={adminUnlocked}
        backupEnabled={backupConfig.enabled}
        onNavigateToBackup={handleNavigateToBackup}
        mobileOpen={menuOpen}
        setMobileOpen={setMenuOpen}
      />

      {/* Page wrapper: Full-width layout without fixed sidebar obstruction */}
      <div className="w-full flex flex-col min-h-screen">

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        roleMode={roleMode}
        setRoleMode={setRoleMode}
        alertCount={totalAlerts}
        onNavigateToBackup={handleNavigateToBackup}
        backupEnabled={backupConfig.enabled}
        adminUnlocked={adminUnlocked}
        onAdminUnlock={handleAdminUnlock}
        onAdminLock={handleAdminLock}
        onMenuToggle={() => setMenuOpen((v) => !v)}
        menuOpen={menuOpen}
        isDemoMode={isDemoDatabase(db)}
        dataSourceMode={dataSource}
        sharedSavedAt={sharedSavedAt}
        savingShared={savingShared}
        onSaveToShared={handleSaveToShared}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1850px] mx-auto px-2 sm:px-4 lg:px-6 pt-4 pb-8">
        {activeTab === 'sales_workbench' && (
          <SalesWorkbenchView
            db={db}
            setDb={setDb}
            params={systemParams}
            onNavigateToDashboard={(sku) => {
              if (sku) setActiveMrpSku(sku);
              setRoleMode('full');
              setActiveTab('dashboard');
            }}
            onNavigateToOrderTension={() => {
              setRoleMode('full');
              setActiveTab('order_tension_tracker');
            }}
            onNavigateToShipClearance={() => {
              setRoleMode('full');
              setActiveTab('ship_schedule_clearance');
            }}
            onNotify={showToast}
          />
        )}

        {activeTab === 'procurement_workbench' && (
          <ProcurementWorkbenchView
            db={db}
            setDb={setDb}
            params={systemParams}
            onNavigateToMRP={(sku) => {
              if (sku) setActiveMrpSku(sku);
              setRoleMode('full');
              setActiveTab('mrp_calculator');
            }}
            onNavigateToTables={(tableKey) => {
              setActiveTableKey(tableKey as TableKey);
              setRoleMode('full');
              setActiveTab('data_tables');
            }}
            onNavigateToDataExchange={() => {
              setRoleMode('full');
              setActiveTab('data_exchange');
            }}
            onNotify={showToast}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            db={db}
            params={systemParams}
            onNavigateToMRP={handleNavigateToMRP}
            onNavigateToTables={handleNavigateToTables}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToExchange={handleNavigateToExchange}
            onNavigateToOrderTension={() => setActiveTab('order_tension_tracker')}
          />
        )}

        {activeTab === 'data_pipeline' && (
          <DataPipelineView
            database={db}
            systemParameters={systemParams}
            onNavigateToTab={(tab) => setActiveTab(tab)}
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

        {activeTab === 'ship_schedule_clearance' && (
          <ShipScheduleClearanceView
            db={db}
            params={systemParams}
            onNavigateToMRP={handleNavigateToMRP}
            onNavigateToTables={handleNavigateToTables}
          />
        )}

        {activeTab === 'order_tension_tracker' && (
          <OrderTensionTrackerView
            db={db}
            params={systemParams}
            onNavigateToMRP={handleNavigateToMRP}
            onNavigateToTables={handleNavigateToTables}
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
            classes={classDirectory}
            onClassesChange={setClassDirectory}
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
          <PrdDocView onNotify={showToast} onNavigateToSpec={openSpecStandalone} />
        )}

        {activeTab === 'glossary' && <GlossaryView />}

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
        <div className="max-w-[114.6667rem] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-300">料事如神圈 QCC 物料需求管理系統</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">Baseline Version {PMS_VERSION}</span>
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
      </div>{/* close .lg:ml-64 wrapper */}
    </div>
  );
}
export default App;

