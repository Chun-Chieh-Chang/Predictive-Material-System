/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Cpu,
  Zap,
  Download,
  Info,
  Layers,
  SlidersHorizontal,
  Flame,
  Truck,
  Sparkles,
  Warehouse,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tv,
  BarChart3,
  Calendar,
  Search,
} from 'lucide-react';
import { SystemDatabase, MRPCalculationResult, SystemParameters, ProductMoldBOM, isShippableMaterialClass } from '../types';
import { calculateAllMRP } from '../utils/mrpEngine';
import { exportToExcel } from '../utils/dataExchange';
import { analyzeDemandCrossComparison } from '../utils/demandAnalysisEngine';

interface DashboardViewProps {
  db: SystemDatabase;
  params?: SystemParameters;
  onNavigateToMRP: (sku: string) => void;
  onNavigateToTables: (tableName: string) => void;
  onNavigateToSettings?: () => void;
  onNavigateToExchange?: () => void;
  onNavigateToOrderTension?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  params,
  onNavigateToMRP,
  onNavigateToTables,
  onNavigateToSettings,
  onNavigateToExchange,
  onNavigateToOrderTension
}) => {
  const mrpResults = useMemo(() => calculateAllMRP(db, undefined, params), [db, params]);

  // Collect all alerts
  const allAlerts = mrpResults.flatMap((r) =>
    r.alerts.map((a) => ({ ...a, sku: r.sku, customer: r.customerId, rmSku: r.rmSku }))
  );

  const redAlerts = allAlerts.filter((a) => a.level === 'red');
  const orangeAlerts = allAlerts.filter((a) => a.level === 'orange');
  const yellowAlerts = allAlerts.filter((a) => a.level === 'yellow');
  const purpleAlerts = allAlerts.filter((a) => a.level === 'purple');

  // Total KPIs
  const totalForecastPCS = mrpResults.reduce((sum, r) => sum + r.forecastQty, 0);
  const totalNetRMToProcureKg = mrpResults.reduce((sum, r) => sum + r.suggestedOrderQtyKg, 0);
  const totalFGGapPcs = mrpResults.reduce((sum, r) => sum + r.fgNetRequirementQty, 0);

  // ==========================================
  // Comprehensive What-If Simulator State
  // ==========================================
  const [selectedSku, setSelectedSku] = useState<string>(mrpResults[0]?.sku || 'A01-200-131');
  const [sandboxTab, setSandboxTab] = useState<'demand' | 'molding' | 'quality_stock' | 'procure'>('demand');
  const [deviationCustomerFilter, setDeviationCustomerFilter] = useState<string>('ALL');

  // ─── Customer Forecast Deviation & Supply Transparency Analytics ─────────
  const forecastDeviationData = useMemo(() => {
    const finishedGoods = db.item_master.filter((i) => isShippableMaterialClass(i.material_class));
    
    return finishedGoods.map((item) => {
      const forecasts = db.demand_forecast_log.filter((f) => f.sku === item.sku);
      const latestForecast = forecasts[forecasts.length - 1];
      const forecastQty = latestForecast ? latestForecast.demand_qty : 0;
      const forecastVersion = latestForecast ? latestForecast.version_no : 'N/A';

      const actualOrders = db.actual_order.filter((o) => o.sku === item.sku && o.status !== 'cancelled');
      const actualPoQty = actualOrders.reduce((s, o) => s + o.order_qty, 0);

      const deviationQty = actualPoQty - forecastQty;
      const deviationPct = forecastQty > 0 ? Number(((deviationQty / forecastQty) * 100).toFixed(1)) : 0;
      const accuracyPct = forecastQty > 0 ? Math.max(0, Math.min(100, Math.round(100 - Math.abs(deviationPct)))) : 100;

      const mrpResult = mrpResults.find((r) => r.sku === item.sku);
      const rmGrossReqKg = mrpResult?.rmGrossRequirementKg || 0;
      const rmOnHandKg = mrpResult?.rmOnHandKg || 0;
      const rmInTransitKg = mrpResult?.rmInTransitKg || 0;
      const totalRmPreparedKg = rmOnHandKg + rmInTransitKg;
      const prepRatioPct = rmGrossReqKg > 0 ? Math.round((totalRmPreparedKg / rmGrossReqKg) * 100) : 100;

      return {
        sku: item.sku,
        customerId: item.customer_id,
        category: item.category,
        forecastVersion,
        forecastQty,
        actualPoQty,
        deviationQty,
        deviationPct,
        accuracyPct,
        rmSku: mrpResult?.rmSku || '—',
        rmGrossReqKg,
        totalRmPreparedKg,
        prepRatioPct,
      };
    });
  }, [db, mrpResults]);

  const filteredDeviationData = useMemo(() => {
    if (deviationCustomerFilter === 'ALL') return forecastDeviationData;
    return forecastDeviationData.filter((d) => d.customerId === deviationCustomerFilter);
  }, [forecastDeviationData, deviationCustomerFilter]);

  // ─── OBJ-01 & OBJ-02: 3-Way Demand Cross Comparison & Bias Engine ────────
  const [demandCrossSkuFilter, setDemandCrossSkuFilter] = useState<string>('all');
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const demandCrossSummaries = useMemo(() => {
    return analyzeDemandCrossComparison(
      db,
      demandCrossSkuFilter,
      deviationCustomerFilter === 'ALL' ? undefined : deviationCustomerFilter
    );
  }, [db, demandCrossSkuFilter, deviationCustomerFilter]);

  // Collapsible section tracking (default: what_if_sandbox collapsed for clean high-signal view)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['what_if_sandbox']));
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const isCollapsed = (id: string) => collapsedSections.has(id);

  // Baseline data for selected SKU
  const activeMrp = mrpResults.find((r) => r.sku === selectedSku) || mrpResults[0];
  const relatedBoms: ProductMoldBOM[] = db.product_mold_bom.filter((b) => b.sku === selectedSku);
  const primaryBom = relatedBoms.find((b) => b.is_primary_mold) || relatedBoms[0];
  // V2.0: supplier rules are now on item_master (RAW class)
  const supplierRule = db.item_master.find((i) => i.sku === activeMrp?.rmSku);

  // Active Mold Selection
  const [overrideMoldId, setOverrideMoldId] = useState<string | null>(null);
  const currentMoldId = overrideMoldId || primaryBom?.mold_id || activeMrp?.activeMoldId || 'MI17193';
  const currentMoldRecord = db.mold_master.find((m) => m.mold_id === currentMoldId);
  const currentBomRecord = relatedBoms.find((b) => b.mold_id === currentMoldId) || primaryBom;

  // Category 1: Demand & PO Overrides
  const [overrideForecast, setOverrideForecast] = useState<number | null>(null);
  const [overrideActualOrder, setOverrideActualOrder] = useState<number | null>(null);
  const [overrideDemandMode, setOverrideDemandMode] = useState<string | null>(null);
  const [overrideDateOffsetDays, setOverrideDateOffsetDays] = useState<number>(0);

  // Category 2: Molding & Tooling Overrides
  const [overrideCavities, setOverrideCavities] = useState<number | null>(null);
  const [overrideCycleTime, setOverrideCycleTime] = useState<number | null>(null);
  const [overrideDailyHours, setOverrideDailyHours] = useState<number | null>(null);
  const [overrideScrap, setOverrideScrap] = useState<number | null>(null);
  const [overrideRunnerWeight, setOverrideRunnerWeight] = useState<number | null>(null);

  // Category 3: Quality & Inventory Overrides
  const [overrideYield, setOverrideYield] = useState<number | null>(null);
  const [overrideWipQty, setOverrideWipQty] = useState<number | null>(null);
  const [overrideFgReadyQty, setOverrideFgReadyQty] = useState<number | null>(null);
  const [overrideRmOnHand, setOverrideRmOnHand] = useState<number | null>(null);
  const [overrideRmInTransit, setOverrideRmInTransit] = useState<number | null>(null);

  // Category 4: SCM & Procurement Overrides
  const [overrideLeadTime, setOverrideLeadTime] = useState<number | null>(null);
  const [overrideMoq, setOverrideMoq] = useState<number | null>(null);
  const [overrideSafetyStock, setOverrideSafetyStock] = useState<number | null>(null);
  const [overrideUnitPrice, setOverrideUnitPrice] = useState<number | null>(null);

  // Active Simulation Applied Values
  const simDesignCav = currentMoldRecord?.design_cavities || activeMrp?.designCavities || 16;
  const simActiveCav = Math.min(
    simDesignCav,
    Math.max(1, overrideCavities !== null ? overrideCavities : (currentMoldRecord?.active_cavities || activeMrp?.activeCavities || 16))
  );
  const simCycleTime = overrideCycleTime !== null ? overrideCycleTime : (currentMoldRecord?.cycle_time_sec || activeMrp?.cycleTimeSec || 27.1);
  const simDailyHours = overrideDailyHours !== null ? overrideDailyHours : (params?.dailyOperatingHours || 24);
  const simScrap = overrideScrap !== null ? overrideScrap : (currentBomRecord?.std_mfg_scrap_rate || activeMrp?.stdScrapRate || 0.03);
  const simNetMoldWeight = currentBomRecord?.net_mold_weight_g || 14.5;
  const simRunnerWeight = overrideRunnerWeight !== null ? overrideRunnerWeight : (currentBomRecord?.runner_weight_g || 3.45);
  const simTotalShotWeight = simNetMoldWeight + simRunnerWeight;
  const simUnitWeight = Number((simTotalShotWeight / simActiveCav).toFixed(3));

  const simForecast = overrideForecast !== null ? overrideForecast : (activeMrp?.forecastQty || 100000);
  const simActualOrder = overrideActualOrder !== null ? overrideActualOrder : (activeMrp?.actualOrderQty || 0);
  const simDemandMode = overrideDemandMode || params?.demandConsumptionMode || 'additive';

  // Calculate Total Demand according to mode
  let simTotalDemand = simForecast + simActualOrder;
  if (simDemandMode === 'po_consume') {
    simTotalDemand = Math.max(simForecast, simActualOrder);
  } else if (simDemandMode === 'actual_only') {
    simTotalDemand = simActualOrder;
  } else if (simDemandMode === 'forecast_only') {
    simTotalDemand = simForecast;
  }

  const simYield = overrideYield !== null ? overrideYield : (activeMrp?.sortingYield || 0.98);
  const simWipQty = overrideWipQty !== null ? overrideWipQty : (activeMrp?.wipPendingQty || 0);
  const simFgReady = overrideFgReadyQty !== null ? overrideFgReadyQty : (activeMrp?.fgReadyQty || 0);
  const simWipEffective = Math.round(simWipQty * simYield);

  // Phase 1: Real FG Net Gap
  const simFgGap = Math.max(0, simTotalDemand - simFgReady - simWipEffective);

  // Phase 2: Capacity & RM Requirement
  const simDailyCap = Math.round(((simDailyHours * 3600) / simCycleTime) * simActiveCav);
  const simGrossRMKg = Number(((simFgGap * simUnitWeight) / 1000 / (1 - simScrap)).toFixed(2));

  // Phase 3: SCM Procurement
  const simRmOnHand = overrideRmOnHand !== null ? overrideRmOnHand : (activeMrp?.rmOnHandKg || 0);
  const simRmInTransit = overrideRmInTransit !== null ? overrideRmInTransit : (activeMrp?.rmInTransitKg || 0);
  const simLeadTime = overrideLeadTime !== null ? overrideLeadTime : (activeMrp?.leadTimeDays || supplierRule?.lead_time_days || 90);
  const simMoq = overrideMoq !== null ? overrideMoq : (activeMrp?.moqKg || supplierRule?.moq_kg || 1000);
  const simSafetyStock = overrideSafetyStock !== null ? overrideSafetyStock : (activeMrp?.safetyStockKg || supplierRule?.safety_stock_kg || 500);
  const simUnitPrice = overrideUnitPrice !== null ? overrideUnitPrice : 3.2; // V2.0: unit_price removed from schema, use default

  const simNetRMKg = Math.max(0, Number((simGrossRMKg - simRmOnHand - simRmInTransit + simSafetyStock).toFixed(2)));
  const simSuggestedPOKg = simNetRMKg > 0 ? Math.ceil(simNetRMKg / simMoq) * simMoq : 0;
  const simTotalCostUsd = Math.round(simSuggestedPOKg * simUnitPrice);

  // Date Simulation
  const baseTargetDate = new Date(activeMrp?.targetDate || '2026-09-30');
  const simTargetDateObj = new Date(baseTargetDate.getTime() + overrideDateOffsetDays * 86400000);
  const simTargetDateStr = simTargetDateObj.toISOString().split('T')[0];

  const simOrderDateObj = new Date(simTargetDateObj.getTime() - simLeadTime * 86400000);
  const simSuggestedOrderDate = simOrderDateObj.toISOString().split('T')[0];

  const now = new Date();
  const simDaysUntilLatestOrder = Math.ceil((simOrderDateObj.getTime() - now.getTime()) / (1000 * 3600 * 24));

  // Delta calculations against baseline
  const baseDailyCap = activeMrp?.dailyCapacityPcs || 1;
  const baseUnitWeight = activeMrp?.unitWeightG || 1;
  const baseFgGap = activeMrp?.fgNetRequirementQty || 0;
  const baseNetRM = activeMrp?.rmNetRequirementKg || 0;
  const baseSuggestedPO = activeMrp?.suggestedOrderQtyKg || 0;
  const baseCost = Math.round(baseSuggestedPO * 3.2); // V2.0: unit_price removed from schema
  const baseDaysRemaining = activeMrp?.daysUntilLatestOrder || 0;

  const deltaDailyCap = simDailyCap - baseDailyCap;
  const deltaUnitWeight = Number((simUnitWeight - baseUnitWeight).toFixed(3));
  const deltaFgGap = simFgGap - baseFgGap;
  const deltaNetRM = Number((simNetRMKg - baseNetRM).toFixed(2));
  const deltaSuggestedPO = simSuggestedPOKg - baseSuggestedPO;
  const deltaCost = simTotalCostUsd - baseCost;
  const deltaDaysRemaining = simDaysUntilLatestOrder - baseDaysRemaining;

  // Reset Sandbox Overrides
  const handleResetSandbox = () => {
    setOverrideMoldId(null);
    setOverrideForecast(null);
    setOverrideActualOrder(null);
    setOverrideDemandMode(null);
    setOverrideDateOffsetDays(0);
    setOverrideCavities(null);
    setOverrideCycleTime(null);
    setOverrideDailyHours(null);
    setOverrideScrap(null);
    setOverrideRunnerWeight(null);
    setOverrideYield(null);
    setOverrideWipQty(null);
    setOverrideFgReadyQty(null);
    setOverrideRmOnHand(null);
    setOverrideRmInTransit(null);
    setOverrideLeadTime(null);
    setOverrideMoq(null);
    setOverrideSafetyStock(null);
    setOverrideUnitPrice(null);
  };

  // Scenario Presets Handlers
  const applyPreset = (presetName: string) => {
    handleResetSandbox();
    switch (presetName) {
      case 'clogged_cavities':
        // Clogged 2 cavities
        setOverrideCavities(Math.max(1, simDesignCav - 2));
        break;
      case 'peak_demand':
        // +50% forecast, expedited delivery -10 days
        setOverrideForecast(Math.round((activeMrp?.forecastQty || 100000) * 1.5));
        setOverrideDateOffsetDays(-10);
        break;
      case 'shipping_delay':
        // +30 days lead time
        setOverrideLeadTime((activeMrp?.leadTimeDays || 90) + 30);
        break;
      case 'wip_defect':
        // Sorting yield down to 80%, scrap up to 6%
        setOverrideYield(0.80);
        setOverrideScrap(0.06);
        break;
      case 'zero_inventory':
        // On hand = 0, In transit = 0
        setOverrideRmOnHand(0);
        setOverrideRmInTransit(0);
        break;
      case 'full_overtime':
        // 24h, 100% cavities, 10% faster cycle
        setOverrideDailyHours(24);
        setOverrideCavities(simDesignCav);
        setOverrideCycleTime(Math.max(10, Math.round((currentMoldRecord?.cycle_time_sec || 27) * 0.9)));
        setOverrideScrap(0.01);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Empty State Pure Production Notice Banner */}
      {db.item_master.length === 0 && (
        <div className="bg-white dark:bg-slate-900/90 border border-sky-300 dark:border-sky-800/60 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-pms-cobalt dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm bg-sky-100 dark:bg-sky-950 text-pms-cobalt dark:text-sky-300 border border-sky-300 dark:border-sky-800/60 font-bold px-2 py-0.5 rounded font-mono">
                  PURE DATABASE READY
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">目前系統為純淨空資料庫狀態</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                尚未載入品號與模具資料。您可分發正式空白範本給權責單位填報，或載入示範數據包立即體驗全套 MRP 運算。
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onNavigateToExchange ?? onNavigateToSettings}
              className="px-4 py-2 bg-pms-pass hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
            >
              前往資料交換中心匯入
            </button>
          </div>
        </div>
      )}

      {/* 1. Top Metrics Bento Grid Quick View (4 Tiles with QC Accent Borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Shortage Count */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-l-4 border-l-pms-alert rounded-2xl p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex flex-col">
            <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
              預期缺料 Shortage Risk
            </span>
            <span className="text-3xl font-mono font-bold text-red-600 dark:text-red-400 mt-1">
              0{redAlerts.length}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              最晚下單期吃緊 / 逾期
            </span>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Metric 2: Overstock / Excess & Capacity Count */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-l-4 border-l-pms-warning rounded-2xl p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex flex-col">
            <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
              超備呆滯 / 實體爆倉
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
                0{yellowAlerts.length} <span className="text-sm font-sans font-normal text-slate-500 dark:text-slate-400">呆滯</span>
              </span>
              <span className="text-slate-400 dark:text-slate-600 font-bold">|</span>
              <span className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400">
                0{orangeAlerts.length} <span className="text-sm font-sans font-normal text-slate-500 dark:text-slate-400">超容</span>
              </span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              供需比失衡 / 倉容上限超載
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Metric 3: Total Forecast Demand */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-l-4 border-l-pms-cobalt rounded-2xl p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex flex-col">
            <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
              業務監控總需求 Total Demand
            </span>
            <span className="text-2xl font-mono font-bold text-pms-cobalt dark:text-blue-400 mt-1">
              {totalForecastPCS.toLocaleString()} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">PCS</span>
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              成品淨缺口: {totalFGGapPcs.toLocaleString()} PCS
            </span>
          </div>
          <div className="w-12 h-12 bg-sky-50 dark:bg-blue-500/10 border border-sky-200 dark:border-blue-500/20 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-pms-cobalt dark:text-blue-400" />
          </div>
        </div>

        {/* Metric 4: Molds & Cavities Status */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-l-4 border-l-pms-iso rounded-2xl p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg shadow-black/5 dark:shadow-black/20">
          <div className="flex flex-col">
            <span className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
              模具妥善監控 Molds Active
            </span>
            <span className="text-2xl font-mono font-bold text-pms-iso dark:text-purple-400 mt-1">
              0{db.mold_master.length} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">套模具</span>
            </span>
            <span className="text-sm text-amber-600 dark:text-amber-400/90 mt-1 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400"></span>
              {db.mold_master.length > 0 ? 'MI20224 塞穴 (22/24 穴)' : '目前無模具主檔'}
            </span>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl flex items-center justify-center">
            <Cpu className="w-6 h-6 text-pms-iso dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* 2. Full-Featured High-Caliber What-If Simulation Sandbox */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-500/40 rounded-3xl p-6 lg:p-7 shadow-xs relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>

        {/* Sandbox Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>多維度 What-If 模擬試算沙盒</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-50 dark:bg-blue-500/20 text-sky-700 dark:text-blue-400 border border-sky-200 dark:border-blue-500/30">
                    Full Parameter Simulator
                  </span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  全方位自由調校「需求、訂單、模具穴數、成型週期、全檢良率、在庫在途、交期與 MOQ」，即時推演對 MRP 採購與產能的量化衝擊
                </p>
              </div>
            </div>
          </div>

          {/* Sku Selector & Reset Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 shadow-xs">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">模擬目標品號:</span>
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  handleResetSandbox();
                }}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-hidden cursor-pointer px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700"
              >
                {mrpResults.map((r) => (
                  <option key={r.sku} value={r.sku} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {r.sku} ({r.customerId}) - {r.productName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleResetSandbox}
              title="還原所有調整為標準主檔基準值"
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>還原基準值</span>
            </button>

            <button
              onClick={() => toggleSection('what_if_sandbox')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isCollapsed('what_if_sandbox') ? '展開沙盒演練 ▾' : '收合沙盒 ▴'}</span>
            </button>
          </div>
        </div>

        {!isCollapsed('what_if_sandbox') && (
        <>
        {/* Quick Scenario Preset Buttons */}
        <div className="mt-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>一鍵情境快速套用 (Scenario Quick Presets)</span>
            </span>
            <span className="text-sm text-slate-500 font-mono">點擊立即注入極端壓力測試</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button
              onClick={() => applyPreset('clogged_cavities')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 dark:bg-slate-950/80 dark:hover:bg-red-950/40 border border-slate-200 hover:border-red-300 dark:border-slate-800 dark:hover:border-red-500/40 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <Flame className="w-4 h-4 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-200">極限塞 2 穴</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">克重飆升/日產能降</div>
              </div>
            </button>

            <button
              onClick={() => applyPreset('peak_demand')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 dark:bg-slate-950/80 dark:hover:bg-blue-950/40 border border-slate-200 hover:border-sky-300 dark:border-slate-800 dark:hover:border-blue-500/40 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-blue-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <TrendingUp className="w-4 h-4 text-sky-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-blue-200">旺季爆單 (+50%)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">需求急增/交期提前</div>
              </div>
            </button>

            <button
              onClick={() => applyPreset('shipping_delay')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 dark:bg-slate-950/80 dark:hover:bg-amber-950/40 border border-slate-200 hover:border-amber-300 dark:border-slate-800 dark:hover:border-amber-500/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <Truck className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-200">海運延誤 (+30天)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">倒推下單日告急</div>
              </div>
            </button>

            <button
              onClick={() => applyPreset('wip_defect')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50 dark:bg-slate-950/80 dark:hover:bg-orange-950/40 border border-slate-200 hover:border-orange-300 dark:border-slate-800 dark:hover:border-orange-500/40 text-slate-700 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-200">WIP 良率降 (80%)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">挑檢損耗激增</div>
              </div>
            </button>

            <button
              onClick={() => applyPreset('zero_inventory')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 dark:bg-slate-950/80 dark:hover:bg-purple-950/40 border border-slate-200 hover:border-purple-300 dark:border-slate-800 dark:hover:border-purple-500/40 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <Warehouse className="w-4 h-4 text-purple-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-200">零在庫斷料</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">無在手無在途</div>
              </div>
            </button>

            <button
              onClick={() => applyPreset('full_overtime')}
              className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-950/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-300 dark:border-slate-800 dark:hover:border-emerald-500/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all text-xs font-medium text-left cursor-pointer group"
            >
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-200">24h 滿載加班</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">全穴滿載/縮短週期</div>
              </div>
            </button>
          </div>
        </div>

        {/* Simulator Workspace Grid: Controls on Left (7 cols), Comparison Matrix & Live Delta on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Controls Container (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <div>
              {/* Category Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pb-4 border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSandboxTab('demand')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    sandboxTab === 'demand'
                      ? 'bg-pms-cobalt-light text-pms-cobalt border-pms-cobalt shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 hover:bg-pms-bg-subtle'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>1. 業務需求與訂單 (Demand & PO)</span>
                </button>

                <button
                  onClick={() => setSandboxTab('molding')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    sandboxTab === 'molding'
                      ? 'bg-pms-iso-bg text-pms-iso border-pms-iso shadow-xs dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 hover:bg-pms-bg-subtle'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>2. 模具與射出製程 (Molding & Tooling)</span>
                </button>

                <button
                  onClick={() => setSandboxTab('quality_stock')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    sandboxTab === 'quality_stock'
                      ? 'bg-pms-pass-bg text-pms-pass border-pms-pass shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 hover:bg-pms-bg-subtle'
                  }`}
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>3. 全檢良率與庫存 (Quality & Stock)</span>
                </button>

                <button
                  onClick={() => setSandboxTab('procure')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    sandboxTab === 'procure'
                      ? 'bg-pms-cyan-light text-pms-cyan border-pms-cyan shadow-xs dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:text-slate-900 hover:bg-pms-bg-subtle'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>4. 採購交期與 SCM (Procure & SCM)</span>
                </button>
              </div>

              {/* Sub-Panel 1: Demand & PO Settings */}
              {sandboxTab === 'demand' && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Forecast Qty */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">業務預估量 Forecast (PCS)</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-blue-400 text-sm">
                          {simForecast.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5000"
                        max="300000"
                        step="5000"
                        value={simForecast}
                        onChange={(e) => setOverrideForecast(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>5,000</span>
                        <span>基準: {activeMrp?.forecastQty.toLocaleString()}</span>
                        <span>300,000</span>
                      </div>
                    </div>

                    {/* Actual PO Qty */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">實際訂單量 PO Qty (PCS)</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-cyan-400 text-sm">
                          {simActualOrder.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="200000"
                        step="5000"
                        value={simActualOrder}
                        onChange={(e) => setOverrideActualOrder(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>基準: {activeMrp?.actualOrderQty.toLocaleString()}</span>
                        <span>200,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Demand Consumption Mode */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="text-sm font-semibold text-slate-900 dark:text-slate-200 block">需求沖銷模式 (Consumption Mode)</label>
                      <select
                        value={simDemandMode}
                        onChange={(e) => setOverrideDemandMode(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
                      >
                        <option value="additive">疊加模式 (Forecast + 實際訂單 PO)</option>
                        <option value="po_consume">實單沖銷 (Max[Forecast, 實際訂單])</option>
                        <option value="forecast_only">僅計預估需求 (Forecast Only)</option>
                        <option value="actual_only">僅計正式實單 (Actual PO Only)</option>
                      </select>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        目前總需求計算值: <strong className="text-slate-900 dark:text-white font-mono">{simTotalDemand.toLocaleString()} PCS</strong>
                      </span>
                    </div>

                    {/* Delivery Target Date Offset */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">交期調整 (Offset Days)</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {overrideDateOffsetDays > 0 ? `+${overrideDateOffsetDays}` : overrideDateOffsetDays} 天 ({simTargetDateStr})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-30"
                        max="60"
                        step="5"
                        value={overrideDateOffsetDays}
                        onChange={(e) => setOverrideDateOffsetDays(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>提前 30 天</span>
                        <span>基準: {activeMrp?.targetDate}</span>
                        <span>延後 60 天</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Panel 2: Molding & Tooling Settings */}
              {sandboxTab === 'molding' && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mold Switcher (If multi-mold available) */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="text-sm font-semibold text-slate-900 dark:text-slate-200 block">成型模具選擇 (Mold Selection)</label>
                      <select
                        value={currentMoldId}
                        onChange={(e) => {
                          setOverrideMoldId(e.target.value);
                          setOverrideCavities(null);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-purple-700 dark:text-purple-300 font-mono font-semibold focus:outline-hidden cursor-pointer"
                      >
                        {relatedBoms.map((b) => {
                          const m = db.mold_master.find((mold) => mold.mold_id === b.mold_id);
                          return (
                            <option key={b.mold_id} value={b.mold_id}>
                              {b.mold_id} ({b.is_primary_mold ? '主模 Primary' : '備用模 Secondary'}) - 設計 {m?.design_cavities || 16} 穴
                            </option>
                          );
                        })}
                      </select>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        目前模具: <strong className="text-slate-900 dark:text-white font-mono">{currentMoldId}</strong> (整模淨重 {simNetMoldWeight}g)
                      </span>
                    </div>

                    {/* Active Cavities */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">妥善穴數 (Active Cavities)</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                          {simActiveCav} / {simDesignCav} 穴 {simActiveCav < simDesignCav ? `(塞 ${simDesignCav - simActiveCav} 穴)` : '(全穴正常)'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max={simDesignCav}
                        step="1"
                        value={simActiveCav}
                        onChange={(e) => setOverrideCavities(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>1 穴 (極限)</span>
                        <span>基準: {currentMoldRecord?.active_cavities} 穴</span>
                        <span>設計: {simDesignCav} 穴</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Cycle Time */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">成型週期 Cycle Time</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {simCycleTime}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="0.5"
                        value={simCycleTime}
                        onChange={(e) => setOverrideCycleTime(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>10s</span>
                        <span>基準: {currentMoldRecord?.cycle_time_sec}s</span>
                        <span>60s</span>
                      </div>
                    </div>

                    {/* Daily Operating Hours */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">日稼動工時</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-cyan-300 text-sm">
                          {simDailyHours} 小時/日
                        </span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        step="2"
                        value={simDailyHours}
                        onChange={(e) => setOverrideDailyHours(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>8h (單班)</span>
                        <span>16h (雙班)</span>
                        <span>24h (全天)</span>
                      </div>
                    </div>

                    {/* Mfg Scrap Rate */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">射出生產損耗率</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-300 text-sm">
                          {(simScrap * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.15"
                        step="0.005"
                        value={simScrap}
                        onChange={(e) => setOverrideScrap(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-red-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0%</span>
                        <span>基準: {((currentBomRecord?.std_mfg_scrap_rate || 0.03) * 100).toFixed(1)}%</span>
                        <span>15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Panel 3: Quality & Stock Settings */}
              {sandboxTab === 'quality_stock' && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sorting Yield */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Sorting 全檢良率</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {(simYield * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.60"
                        max="1.00"
                        step="0.01"
                        value={simYield}
                        onChange={(e) => setOverrideYield(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>60%</span>
                        <span>基準: {((activeMrp?.sortingYield || 0.98) * 100).toFixed(1)}%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* WIP Pending Qty */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">待驗品庫存 WIP (PCS)</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {simWipQty.toLocaleString()} (有效良品: {simWipEffective.toLocaleString()})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60000"
                        step="1000"
                        value={simWipQty}
                        onChange={(e) => setOverrideWipQty(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>基準: {activeMrp?.wipPendingQty.toLocaleString()}</span>
                        <span>60,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* FG Ready Qty */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">成品良品庫存 (PCS)</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-blue-300 text-sm">
                          {simFgReady.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50000"
                        step="1000"
                        value={simFgReady}
                        onChange={(e) => setOverrideFgReadyQty(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>基準: {activeMrp?.fgReadyQty.toLocaleString()}</span>
                        <span>50,000</span>
                      </div>
                    </div>

                    {/* RM On-Hand */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">原料在庫庫存 (KG)</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-300 text-sm">
                          {simRmOnHand.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="200"
                        value={simRmOnHand}
                        onChange={(e) => setOverrideRmOnHand(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>基準: {activeMrp?.rmOnHandKg.toLocaleString()}</span>
                        <span>10,000</span>
                      </div>
                    </div>

                    {/* RM In-Transit */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">原料在途訂單 (KG)</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-300 text-sm">
                          {simRmInTransit.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="200"
                        value={simRmInTransit}
                        onChange={(e) => setOverrideRmInTransit(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0</span>
                        <span>基準: {activeMrp?.rmInTransitKg.toLocaleString()}</span>
                        <span>10,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Panel 4: Procurement & SCM Settings */}
              {sandboxTab === 'procure' && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Lead Time Days */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">採購交期 Lead Time</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {simLeadTime} 天 (海運/空運)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="7"
                        max="180"
                        step="1"
                        value={simLeadTime}
                        onChange={(e) => setOverrideLeadTime(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>7天 (特急空運)</span>
                        <span>基準: {activeMrp?.leadTimeDays}天</span>
                        <span>180天 (海運延遲)</span>
                      </div>
                    </div>

                    {/* MOQ (KG) */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">最小起訂量 MOQ (KG)</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-cyan-400 text-sm">
                          {simMoq.toLocaleString()} KG
                        </span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={simMoq}
                        onChange={(e) => setOverrideMoq(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>100 KG</span>
                        <span>基準: {activeMrp?.moqKg.toLocaleString()} KG</span>
                        <span>5,000 KG</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Safety Stock (KG) */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">安全庫存量 Safety Stock (KG)</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {simSafetyStock.toLocaleString()} KG
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3000"
                        step="50"
                        value={simSafetyStock}
                        onChange={(e) => setOverrideSafetyStock(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>0 KG</span>
                        <span>基準: {activeMrp?.safetyStockKg.toLocaleString()} KG</span>
                        <span>3,000 KG</span>
                      </div>
                    </div>

                    {/* Unit Price (USD) */}
                    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">原料預估單價 Unit Price</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-blue-300 text-sm">
                          ${simUnitPrice.toFixed(2)} USD/KG
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="0.1"
                        value={simUnitPrice}
                        onChange={(e) => setOverrideUnitPrice(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                        <span>$1.00</span>
                        <span>基準: $3.20</span>
                        <span>$15.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Tip */}
            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600 dark:text-blue-400" />
                <span>所有滑桿與選單皆即時驅動 MRP 核心數學模型計算</span>
              </span>
              <button
                onClick={() => onNavigateToMRP(selectedSku)}
                className="text-sky-600 dark:text-cyan-400 hover:text-sky-700 dark:hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>前往 3 階推導明細</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Impact Comparison Matrix & Live Delta (5 Cols) */}
          <div className="lg:col-span-5 bg-sky-50/50 dark:bg-gradient-to-b dark:from-blue-950/70 dark:to-slate-950/90 rounded-2xl border border-sky-200 dark:border-blue-500/30 p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-sky-200 dark:border-blue-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-blue-200 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                  <span>基準 vs 模擬 Δ 差異衝擊推演</span>
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    simDaysUntilLatestOrder < 0
                      ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40'
                      : simDaysUntilLatestOrder <= 15
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/40'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40'
                  }`}
                >
                  {simDaysUntilLatestOrder < 0 ? '🔴 下單逾期' : simDaysUntilLatestOrder <= 15 ? '🟡 即刻發單' : '🟢 排程充裕'}
                </span>
              </div>

              {/* Comparison Tiles */}
              <div className="grid grid-cols-2 gap-3 mt-3.5 text-sm">
                {/* Tile 1: Unit Weight */}
                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">動態單穴克重</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-bold font-mono text-sky-700 dark:text-cyan-300">
                      {simUnitWeight.toFixed(3)} <span className="text-xs font-normal">g</span>
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${deltaUnitWeight > 0 ? 'text-red-600 dark:text-red-400' : deltaUnitWeight < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {deltaUnitWeight > 0 ? `+${deltaUnitWeight}` : deltaUnitWeight === 0 ? '±0' : deltaUnitWeight}
                    </span>
                  </div>
                </div>

                {/* Tile 2: Daily Capacity */}
                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">日射出產能</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                      {simDailyCap.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${deltaDailyCap > 0 ? 'text-emerald-600 dark:text-emerald-400' : deltaDailyCap < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {deltaDailyCap > 0 ? `+${deltaDailyCap.toLocaleString()}` : deltaDailyCap === 0 ? '±0' : deltaDailyCap.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tile 3: FG Net Gap */}
                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">成品淨缺口</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-bold font-mono text-sky-600 dark:text-blue-400">
                      {simFgGap.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${deltaFgGap > 0 ? 'text-red-600 dark:text-red-400' : deltaFgGap < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {deltaFgGap > 0 ? `+${deltaFgGap.toLocaleString()}` : deltaFgGap === 0 ? '±0' : deltaFgGap.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tile 4: Net Raw Material */}
                <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">原料淨需求 (KG)</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-bold font-mono text-purple-700 dark:text-purple-300">
                      {simNetRMKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${deltaNetRM > 0 ? 'text-red-600 dark:text-red-400' : deltaNetRM < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {deltaNetRM > 0 ? `+${deltaNetRM.toLocaleString()}` : deltaNetRM === 0 ? '±0' : deltaNetRM.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Major PO Impact Banner */}
              <div className="mt-3.5 bg-sky-100/60 dark:bg-blue-900/40 p-4 rounded-xl border border-sky-300 dark:border-blue-400/30 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-sky-900 dark:text-blue-200 font-semibold">建議發單採購量 (MOQ取整):</span>
                  <span className="text-lg font-bold font-mono text-sky-950 dark:text-white">
                    {simSuggestedPOKg.toLocaleString()} KG
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-sky-200 dark:border-blue-500/20">
                  <span className="text-sky-800 dark:text-blue-300">預估採購總金額 (USD):</span>
                  <span className="font-mono font-bold text-sky-900 dark:text-cyan-300">
                    ${simTotalCostUsd.toLocaleString()} USD
                    <span className={`ml-2 text-[11px] ${deltaCost > 0 ? 'text-red-600 dark:text-red-400' : deltaCost < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      ({deltaCost > 0 ? `+$${deltaCost.toLocaleString()}` : deltaCost === 0 ? '±$0' : `-$${Math.abs(deltaCost).toLocaleString()}`})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-sky-200 dark:border-blue-500/20">
                  <span className="text-sky-800 dark:text-blue-300">最晚下單期限 (Order Date):</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {simSuggestedOrderDate} ({simDaysUntilLatestOrder >= 0 ? `剩 ${simDaysUntilLatestOrder} 天` : `逾期 ${Math.abs(simDaysUntilLatestOrder)} 天`})
                  </span>
                </div>
              </div>

              {/* Decision Protocol Recommendation */}
              <div className="mt-3.5 p-3 bg-white dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 text-sm space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                  <span>沙盒推演決策建言：</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  {simDaysUntilLatestOrder < 0 ? (
                    <span className="text-red-600 dark:text-red-300 font-medium">
                      ⚠️ 警報：因交期 ({simLeadTime}天) 或需求調整，最晚下單日 ({simSuggestedOrderDate}) 已逾期 {Math.abs(simDaysUntilLatestOrder)} 天。建議立即啟動原廠空運特急件或自其他料號調撥在庫！
                    </span>
                  ) : simActiveCav < simDesignCav ? (
                    <span className="text-amber-600 dark:text-amber-300 font-medium">
                      ⚠️ 注意：因塞 {simDesignCav - simActiveCav} 穴，單穴克重提升至 {simUnitWeight.toFixed(3)}g/穴（+{deltaUnitWeight}g），日產能損失 {Math.abs(deltaDailyCap).toLocaleString()} PCS/日。建議排入模具保養或切換備用模。
                    </span>
                  ) : deltaSuggestedPO > 0 ? (
                    <span className="text-sky-700 dark:text-blue-300 font-medium">
                      📈 需求擴增：建議採購量增加 {deltaSuggestedPO.toLocaleString()} KG，請儘速向供應商確認產能並在 {simSuggestedOrderDate} 前完成發單。
                    </span>
                  ) : (
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      ✅ 狀態平穩：排程餘裕充裕 ({simDaysUntilLatestOrder} 天)，物料供需平衡在安全指標內。
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </section>

      {/* 3. Decision War Room Priority Table (Full Width) */}
      <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊 決策戰情室</span>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-normal font-mono">Decision War Room</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              自動辨識長交期物料，倒推最晚採購下單排程與風險處置建議
            </p>
          </div>
          <button
            onClick={() => exportToExcel(db)}
            id="war-room-export-btn"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>匯出建議採購清單 Excel</span>
          </button>
          <button
            onClick={() => toggleSection('warroom')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={isCollapsed('warroom') ? '展開' : '收合'}
          >
            {isCollapsed('warroom') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{isCollapsed('warroom') ? '展開' : '收合'}</span>
          </button>
        </div>

        {!isCollapsed('warroom') && (
        <>
        {/* War Room Priority Table */}
        <div className="overflow-x-auto scrollbar-sm mt-4">
          <table className="w-full text-left text-sm">
            <thead className="text-sm text-slate-400 uppercase border-b border-slate-800 font-semibold">
              <tr>
                <th className="pb-3 px-2">狀態 Status</th>
                <th className="pb-3 px-2">需求品號 SKU</th>
                <th className="pb-3 px-2">客戶 Customer</th>
                <th className="pb-3 px-2">原料 RM SKU</th>
                <th className="pb-3 px-2 text-right">建議下單 Suggested</th>
                <th className="pb-3 px-2 text-right">最晚下單日 Order Date</th>
                <th className="pb-3 px-2 text-center">推導</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {mrpResults.map((item) => {
                const isShortage = item.alerts.some((a) => a.level === 'red');
                const isOvercapacity = item.alerts.some((a) => a.level === 'orange');
                const isOverstock = item.alerts.some((a) => a.level === 'yellow');
                return (
                  <tr key={item.sku} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-2 font-sans">
                      {isShortage ? (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 rounded-md text-sm font-bold whitespace-nowrap">
                          🔴 缺料 Shortage
                        </span>
                      ) : isOvercapacity ? (
                        <span className="px-2.5 py-1 bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 rounded-md text-sm font-bold whitespace-nowrap">
                          🟠 爆倉 Overcapacity
                        </span>
                      ) : isOverstock ? (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-md text-sm font-bold whitespace-nowrap">
                          🟡 超備 Excess
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-sm font-bold whitespace-nowrap">
                          🟢 正常 Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-slate-900 dark:text-white font-bold text-sm">{item.sku}</td>
                    <td className="py-3 px-2 text-slate-600 dark:text-slate-300 font-sans text-sm">{item.customerId}</td>
                    <td className="py-3 px-2 text-purple-700 dark:text-purple-400 font-semibold text-sm">{item.rmSku}</td>
                    <td className="py-3 px-2 text-right text-blue-700 dark:text-blue-400 font-bold text-sm">
                      {item.suggestedOrderQtyKg.toLocaleString()} KG
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-sm">
                      <span className={item.daysUntilLatestOrder < 0 ? 'text-red-600 dark:text-red-400 font-bold' : item.daysUntilLatestOrder <= (params?.shortageAlertBufferDays || 15) ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}>
                        {item.suggestedOrderDate}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-sans">
                      <button
                        onClick={() => onNavigateToMRP(item.sku)}
                        className="px-2.5 py-1 text-sm font-medium text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200 dark:border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                      >
                        明細
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
        )}
      </section>

      {/* 3.5. 3-Way Demand Cross-Comparison & Forecast Bias Alert Board (OBJ-01 & OBJ-02) */}
      <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  三向需求交叉比對看板 (預示量 vs 實單 vs 歷年同期)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  OBJ-01 & OBJ-02 前瞻防斷料
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                同屏交叉比對客戶滾動預測 (Forecast)、確認訂單 (Actual PO) 與歷年歷史同期下單基準，自動示警異常偏差率 (Bias%) 與斷料/呆滯風險。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Customer Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">客戶:</span>
              <select
                value={deviationCustomerFilter}
                onChange={(e) => setDeviationCustomerFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
              >
                <option value="ALL">全部客戶 (All)</option>
                {Array.from(new Set(db.item_master.map((d) => d.customer_id))).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* SKU Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">品號:</span>
              <select
                value={demandCrossSkuFilter}
                onChange={(e) => setDemandCrossSkuFilter(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono font-semibold cursor-pointer max-w-[160px]"
              >
                <option value="all">全品號 (All SKUs)</option>
                {db.item_master.filter((i) => !i.material_class || ['PART', 'COMP', 'SET'].includes(i.material_class)).map((item) => (
                  <option key={item.sku} value={item.sku}>{item.sku}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => toggleSection('forecast_deviation')}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isCollapsed('forecast_deviation') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed('forecast_deviation') && (
          <div className="mt-5 space-y-6">
            {/* Top Aggregate Summary KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/60">
                <span className="text-sky-700 dark:text-sky-300 uppercase block font-semibold">客戶預示總量 (Forecast)</span>
                <div className="font-mono font-bold text-lg text-sky-900 dark:text-sky-200 mt-1">
                  {demandCrossSummaries.reduce((s, d) => s + d.totalForecastQty, 0).toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-emerald-700 dark:text-emerald-300 uppercase block font-semibold">確認實單總量 (Actual PO)</span>
                <div className="font-mono font-bold text-lg text-emerald-900 dark:text-emerald-200 mt-1">
                  {demandCrossSummaries.reduce((s, d) => s + d.totalActualOrderQty, 0).toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60">
                <span className="text-purple-700 dark:text-purple-300 uppercase block font-semibold">歷年同期基準 (Historical)</span>
                <div className="font-mono font-bold text-lg text-purple-900 dark:text-purple-200 mt-1">
                  {demandCrossSummaries.reduce((s, d) => s + d.totalHistoricalQty, 0).toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <span className="text-amber-700 dark:text-amber-300 uppercase block font-semibold">高危異常品項 (Bias &gt; 25%)</span>
                <div className="font-mono font-bold text-lg text-amber-900 dark:text-amber-200 mt-1">
                  {demandCrossSummaries.filter((d) => d.overallAlertLevel === 'critical').length} <span className="text-xs font-normal">項品號告警</span>
                </div>
              </div>
            </div>

            {/* Detailed 3-Way Comparison Table */}
            <div className="overflow-x-auto scrollbar-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">成品料號 / 客戶</th>
                    <th className="px-3.5 py-3 text-right">預示量 (Forecast)</th>
                    <th className="px-3.5 py-3 text-right">實下訂單 (Actual PO)</th>
                    <th className="px-3.5 py-3 text-right">歷年同期 (History)</th>
                    <th className="px-3.5 py-3 text-center">三向對比長條圖</th>
                    <th className="px-3.5 py-3 text-center">偏差率 (Bias %)</th>
                    <th className="px-3.5 py-3 text-center">趨勢狀態</th>
                    <th className="px-3.5 py-3">前瞻防斷料決策建言</th>
                    <th className="px-3.5 py-3 text-center">MRP 推導</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-sm">
                  {demandCrossSummaries.map((row) => {
                    const maxVal = Math.max(row.totalForecastQty, row.totalActualOrderQty, row.totalHistoricalQty, 1);
                    const forecastWidth = Math.round((row.totalForecastQty / maxVal) * 100);
                    const actualWidth = Math.round((row.totalActualOrderQty / maxVal) * 100);
                    const histWidth = Math.round((row.totalHistoricalQty / maxVal) * 100);

                    const alertBadgeClass = row.overallAlertLevel === 'critical'
                      ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold'
                      : row.overallAlertLevel === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';

                    return (
                      <tr key={row.sku} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3.5 py-3.5 font-sans">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{row.sku}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{row.customer_id}</div>
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-medium text-sky-700 dark:text-sky-300">
                          {row.totalForecastQty.toLocaleString()} PCS
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-bold text-emerald-700 dark:text-emerald-300">
                          {row.totalActualOrderQty.toLocaleString()} PCS
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-medium text-purple-700 dark:text-purple-300">
                          {row.totalHistoricalQty.toLocaleString()} PCS
                        </td>
                        <td className="px-3.5 py-3.5 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="w-8 text-sky-600 font-sans">預測</span>
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-sky-500 h-full rounded-full" style={{ width: `${forecastWidth}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="w-8 text-emerald-600 font-sans">實單</span>
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${actualWidth}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="w-8 text-purple-600 font-sans">歷史</span>
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${histWidth}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${alertBadgeClass}`}>
                            {row.overallBiasPct > 0 ? `+${row.overallBiasPct}%` : `${row.overallBiasPct}%`}
                          </span>
                        </td>
                        <td className="px-3.5 py-3.5 text-center font-sans text-xs">
                          {row.trendSignal === 'surging' ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">🔥 暴增追加</span>
                          ) : row.trendSignal === 'shrinking' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">📉 急遽萎縮</span>
                          ) : row.trendSignal === 'volatile' ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold">⚡ 劇烈波動</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">🟢 平穩吻合</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3.5 font-sans text-xs max-w-[280px]">
                          {row.recommendations.map((rec, rIdx) => (
                            <div key={rIdx} className="text-slate-700 dark:text-slate-300 leading-snug">
                              • {rec}
                            </div>
                          ))}
                        </td>
                        <td className="px-3.5 py-3.5 text-center">
                          <button
                            onClick={() => onNavigateToMRP(row.sku)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-cyan-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 rounded-lg transition-colors cursor-pointer"
                          >
                            MRP 推導
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 4. Risk Alerts Bento Grid (3 Cols) */}
      <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">即時物料與產能預警中心</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                自動監控海運交期倒數、在途採購 PO、妥善穴數塞穴產能與 Forecast 下修呆滯
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToOrderTension && (
              <button
                onClick={onNavigateToOrderTension}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>🔍 檢索緊張訂單與卡關環節</span>
              </button>
            )}
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700">
              {allAlerts.length} 項預警狀態
            </span>
          </div>
        </div>

        {!isCollapsed('alerts') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {allAlerts.map((alert, idx) => {
            const isRed = alert.level === 'red';
            const isYellow = alert.level === 'yellow';
            const isPurple = alert.level === 'purple';

            return (
              <div
                key={idx}
                className={`rounded-xl p-5 border transition-all flex flex-col justify-between shadow-xs ${
                  isRed
                    ? 'bg-white dark:bg-red-950/20 border-slate-200 dark:border-red-500/30 border-l-4 border-l-pms-alert'
                    : isYellow
                    ? 'bg-white dark:bg-amber-950/20 border-slate-200 dark:border-amber-500/30 border-l-4 border-l-pms-warning'
                    : isPurple
                    ? 'bg-white dark:bg-purple-950/20 border-slate-200 dark:border-purple-500/30 border-l-4 border-l-pms-iso'
                    : 'bg-white dark:bg-emerald-950/20 border-slate-200 dark:border-emerald-500/30 border-l-4 border-l-pms-pass'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold font-mono bg-sky-50 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-sky-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 shadow-xs">
                      {alert.sku}
                    </span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 font-mono">{alert.customer}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2.5 flex items-center gap-1.5">
                    <span>{alert.title}</span>
                  </h4>
                  <p className="text-sm mt-2 leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                    {alert.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-400 flex items-center space-x-1">
                    <span>💡 處置對策建議：</span>
                  </div>
                  <p className="text-xs font-medium mt-1 text-slate-800 dark:text-slate-200 leading-relaxed">
                    {alert.actionRecommendation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* 5. Full Procurement Schedule Bento Table */}
      <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">MRP 建議採購下單排程表</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              整合原料單價、MOQ 取整、安全庫存與海運 Lead Time 倒推排程
            </p>
          </div>
          <button
            onClick={() => onNavigateToTables('item_master')}
            id="view-supplier-rules-btn"
            className="text-xs text-sky-600 dark:text-cyan-400 font-semibold hover:text-sky-700 dark:hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
          >
            <span>維護品號與採購規則</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isCollapsed('procurement') && (
        <div className="overflow-x-auto scrollbar-sm mt-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-3">需求品號 / 客戶</th>
                <th className="px-3.5 py-3">預估版本</th>
                <th className="px-3.5 py-3">使用原料</th>
                <th className="px-3.5 py-3 text-right">成品缺口 (PCS)</th>
                <th className="px-3.5 py-3 text-right">原料淨需求 (KG)</th>
                <th className="px-3.5 py-3 text-right font-bold text-sky-600 dark:text-blue-400">建議下單量 (KG)</th>
                <th className="px-3.5 py-3">交期 Lead Time</th>
                <th className="px-3.5 py-3">最晚下單日</th>
                <th className="px-3.5 py-3 text-center">排程狀態</th>
                <th className="px-3.5 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
              {mrpResults.map((item) => (
                <tr key={item.sku} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-3.5 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{item.sku}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">{item.productName} ({item.customerId})</div>
                  </td>
                  <td className="px-3.5 py-3.5">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-xs">
                      {item.versionNo}
                    </span>
                  </td>
                  <td className="px-3.5 py-3.5">
                    <div className="font-semibold text-purple-700 dark:text-purple-400 text-sm">{item.rmSku}</div>
                  </td>
                  <td className="px-3.5 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200 text-sm">
                    {item.fgNetRequirementQty.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3.5 text-right font-medium text-slate-800 dark:text-slate-200 text-sm">
                    {item.rmNetRequirementKg.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3.5 text-right font-bold text-sky-600 dark:text-blue-400 text-sm">
                    {item.suggestedOrderQtyKg.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3.5 text-slate-600 dark:text-slate-300 font-sans text-xs">
                    {item.leadTimeDays} 天 (MOQ: {item.moqKg} KG)
                  </td>
                  <td className="px-3.5 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{item.suggestedOrderDate}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                      {item.daysUntilLatestOrder >= 0
                        ? `剩餘 ${item.daysUntilLatestOrder} 天`
                        : `已逾期 ${Math.abs(item.daysUntilLatestOrder)} 天`}
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5 text-center font-sans">
                    {item.daysUntilLatestOrder < 0 ? (
                      <span className="bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        緊急逾期
                      </span>
                    ) : item.daysUntilLatestOrder < 15 ? (
                      <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        即刻發單
                      </span>
                    ) : (
                      <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        排程充裕
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-3.5 text-center font-sans">
                    <button
                      onClick={() => onNavigateToMRP(item.sku)}
                      className="px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-cyan-400 bg-sky-50 dark:bg-cyan-950/50 hover:bg-sky-100 dark:hover:bg-cyan-900/50 border border-sky-200 dark:border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      MRP 明細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  );
};
