/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Boxes,
  Truck,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Users
} from 'lucide-react';
import { SystemDatabase, SystemParameters, ItemMaster } from '../types';

interface ShipScheduleClearanceViewProps {
  db: SystemDatabase;
  params?: SystemParameters;
  onNavigateToMRP: (sku: string) => void;
  onNavigateToTables: (tableName: string) => void;
}

export interface ScheduleClearanceItem {
  sku: string;
  customer_id: string;
  category: string;
  description?: string;
  scheduledQty: number; // 2週出貨排程需求 (PCS)
  fgReadyQty: number; // 成品在庫良品 (PCS)
  wipPendingQty: number; // 3樓待驗 WIP (PCS)
  sortingYield: number; // 標準良率
  wipEffectiveQty: number; // 經良率折算之有效 WIP (PCS)
  totalAvailableSupply: number; // 總可用供給 (FG + 有效 WIP)
  balanceQty: number; // 結算餘裕/缺口 (供給 - 排程)
  status: 'clear' | 'wip_dependent' | 'deficit';
  deficitQty: number; // 若缺貨時的赤字數量
  actionNote: string;
}

export const ShipScheduleClearanceView: React.FC<ShipScheduleClearanceViewProps> = ({
  db,
  params,
  onNavigateToMRP,
  onNavigateToTables,
}) => {
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'clear' | 'wip_dependent' | 'deficit'>('ALL');
  const [simulatedMultipliers, setSimulatedMultipliers] = useState<Record<string, number>>({});

  // 1. 取得所有 SET 類成品
  const finishedGoods = useMemo(() => {
    return db.item_master.filter((i) => i.material_class === 'SET' || !i.material_class);
  }, [db.item_master]);

  // 2. 彙整各品號之 2 週出貨排程與在庫 WIP 資料
  const clearanceData: ScheduleClearanceItem[] = useMemo(() => {
    return finishedGoods.map((item) => {
      // 抓取快照庫存
      const latestSnapshot = db.inventory_wip_snapshot
        .filter((s) => s.sku === item.sku)
        .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

      const fgReadyQty = latestSnapshot ? latestSnapshot.fg_ready_qty : 0;
      const wipPendingQty = latestSnapshot ? latestSnapshot.wip_pending_qty : 0;

      // 良率
      const yieldRecord = db.yield_master.find((y) => y.sku === item.sku);
      const sortingYield = yieldRecord ? yieldRecord.std_sorting_yield : (params?.defaultSortingYield || 0.98);
      const wipEffectiveQty = Math.round(wipPendingQty * sortingYield);

      // 排程需求：優先取 2 週內 actual_order 或 demand_forecast
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const activeOrders = db.actual_order.filter((o) => {
        if (o.sku !== item.sku || o.status === 'cancelled') return false;
        const target = new Date(o.target_date);
        return target >= now && target <= twoWeeksLater;
      });

      const orderSum = activeOrders.reduce((sum, o) => sum + o.order_qty, 0);

      // 若無特定 2 週訂單，抓取最新預測作為基準排程
      let baseScheduledQty = orderSum;
      if (baseScheduledQty === 0) {
        const latestForecast = db.demand_forecast_log
          .filter((f) => f.sku === item.sku)
          .sort((a, b) => new Date(b.created_at || b.target_date).getTime() - new Date(a.created_at || a.target_date).getTime())[0];
        // 預測通常為月度，換算 2 週約為 50%
        baseScheduledQty = latestForecast ? Math.round(latestForecast.demand_qty * 0.5) : 10000;
      }

      // 套用即時模擬倍率 (What-If)
      const multiplier = simulatedMultipliers[item.sku] ?? 1.0;
      const scheduledQty = Math.round(baseScheduledQty * multiplier);

      const totalAvailableSupply = fgReadyQty + wipEffectiveQty;
      const balanceQty = totalAvailableSupply - scheduledQty;

      let status: 'clear' | 'wip_dependent' | 'deficit' = 'clear';
      let deficitQty = 0;
      let actionNote = '';

      if (fgReadyQty >= scheduledQty) {
        status = 'clear';
        actionNote = '🟢 成品庫存充足，可直接放行 100% 出貨';
      } else if (totalAvailableSupply >= scheduledQty) {
        status = 'wip_dependent';
        const requiredFromWip = scheduledQty - fgReadyQty;
        actionNote = `🟡 現貨不足需仰賴 3樓 WIP 挑選！需於出貨日前完成全檢 ${requiredFromWip.toLocaleString()} PCS`;
      } else {
        status = 'deficit';
        deficitQty = scheduledQty - totalAvailableSupply;
        actionNote = `🔴 實質供給赤字缺口 ${deficitQty.toLocaleString()} PCS！請週二會議協調減量出貨或緊急加開產能`;
      }

      return {
        sku: item.sku,
        customer_id: item.customer_id,
        category: item.category,
        description: item.description,
        scheduledQty,
        fgReadyQty,
        wipPendingQty,
        sortingYield,
        wipEffectiveQty,
        totalAvailableSupply,
        balanceQty,
        status,
        deficitQty,
        actionNote,
      };
    });
  }, [finishedGoods, db, params, simulatedMultipliers]);

  // 客戶清單
  const customers = useMemo(() => {
    const set = new Set(finishedGoods.map((i) => i.customer_id).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [finishedGoods]);

  // 篩選後資料
  const filteredData = useMemo(() => {
    return clearanceData.filter((item) => {
      const matchCustomer = customerFilter === 'ALL' || item.customer_id === customerFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchCustomer && matchStatus;
    });
  }, [clearanceData, customerFilter, statusFilter]);

  // 統計指標
  const kpis = useMemo(() => {
    const total = clearanceData.length;
    const clearCount = clearanceData.filter((i) => i.status === 'clear').length;
    const wipCount = clearanceData.filter((i) => i.status === 'wip_dependent').length;
    const deficitCount = clearanceData.filter((i) => i.status === 'deficit').length;
    const totalScheduledPcs = clearanceData.reduce((s, i) => s + i.scheduledQty, 0);
    const totalDeficitPcs = clearanceData.reduce((s, i) => s + i.deficitQty, 0);
    return {
      total,
      clearCount,
      wipCount,
      deficitCount,
      clearRate: total > 0 ? Math.round(((clearCount + wipCount) / total) * 100) : 100,
      totalScheduledPcs,
      totalDeficitPcs,
    };
  }, [clearanceData]);

  const handleMultiplierChange = (sku: string, val: number) => {
    setSimulatedMultipliers((prev) => ({ ...prev, [sku]: val }));
  };

  const handleResetSimulations = () => {
    setSimulatedMultipliers({});
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <CalendarCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                週二雙週出貨排程可行性審查看板
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                業務協調專用
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              專為業務（Iris / AB）與廠長每週二出貨協調會設計。依據最新 2 週出貨排程（Ship Schedule），即時比對成品良品現貨與 3 樓待驗 WIP，5 分鐘內決策可承接出貨量與急迫挑選工單。
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {Object.keys(simulatedMultipliers).length > 0 && (
              <button
                onClick={handleResetSimulations}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                重置模擬量
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>列印週二決策清單</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 總排程需求 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-sm font-medium">雙週出貨排程總量</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {kpis.totalScheduledPcs.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-500">PCS</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            涵蓋 {kpis.total} 筆主力成品料號
          </div>
        </div>

        {/* KPI 2: 現貨充足可放行 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-sm font-medium">現貨充足 (100% 放行)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {kpis.clearCount}{' '}
            <span className="text-sm font-normal text-slate-500">項品號</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            庫房已有足量良品，可立即裝箱
          </div>
        </div>

        {/* KPI 3: 需仰賴 WIP 挑選 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-sm font-medium">需 3F WIP 挑選支援</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {kpis.wipCount}{' '}
            <span className="text-sm font-normal text-slate-500">項品號</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            需通知品保/挑選課優先排單檢驗
          </div>
        </div>

        {/* KPI 4: 實質短缺赤字 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
            <span className="text-sm font-medium">排程缺口 (赤字警戒)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {kpis.totalDeficitPcs.toLocaleString()}{' '}
            <span className="text-sm font-normal text-slate-500">PCS ({kpis.deficitCount}項)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            現貨+WIP皆不足，需週二協調調整
          </div>
        </div>
      </div>

      {/* 3. Filter & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Customer Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">客戶篩選:</span>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {customers.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? '全部客戶 (All Customers)' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">狀態審查:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                全部 ({kpis.total})
              </button>
              <button
                onClick={() => setStatusFilter('clear')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'clear'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
                }`}
              >
                🟢 現貨足 ({kpis.clearCount})
              </button>
              <button
                onClick={() => setStatusFilter('wip_dependent')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'wip_dependent'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:text-amber-800'
                }`}
              >
                🟡 需挑選 ({kpis.wipCount})
              </button>
              <button
                onClick={() => setStatusFilter('deficit')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  statusFilter === 'deficit'
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'text-red-700 dark:text-red-400 hover:text-red-800'
                }`}
              >
                🔴 赤字缺貨 ({kpis.deficitCount})
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          💡 拖曳「模擬排程」滑桿可即時預算客戶臨時增單/減單之交貨可行性
        </div>
      </div>

      {/* 4. Main Clearance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3.5 px-4">客戶 / 成品料號</th>
                <th className="py-3.5 px-4 text-right">2週出貨排程</th>
                <th className="py-3.5 px-4 text-right">成品現貨良品</th>
                <th className="py-3.5 px-4 text-right">3F WIP (折算良品)</th>
                <th className="py-3.5 px-4 text-right">總可用供給</th>
                <th className="py-3.5 px-4 text-center">可交付狀態</th>
                <th className="py-3.5 px-4">週二協調行動建議</th>
                <th className="py-3.5 px-4 text-center">動作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    目前篩選條件下無任何出貨排程項目。
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const currentMultiplier = simulatedMultipliers[row.sku] ?? 1.0;
                  return (
                    <tr
                      key={row.sku}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 料號與客戶 */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {row.customer_id}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {row.sku}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-xs">
                          {row.category} {row.description ? `• ${row.description}` : ''}
                        </div>
                      </td>

                      {/* 2週出貨排程需求 (含互動滑桿) */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.scheduledQty.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-500">PCS</span>
                        </div>
                        {/* Interactive Demand Simulator */}
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {currentMultiplier.toFixed(1)}x
                          </span>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={currentMultiplier}
                            onChange={(e) => handleMultiplierChange(row.sku, parseFloat(e.target.value))}
                            className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            title="拖曳模擬客戶排程增減"
                          />
                        </div>
                      </td>

                      {/* 成品良品現貨 */}
                      <td className="py-4 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {row.fgReadyQty.toLocaleString()} PCS
                      </td>

                      {/* 3F WIP (折算有效良品) */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-medium text-amber-700 dark:text-amber-400">
                          +{row.wipEffectiveQty.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-500">PCS</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          (待驗 {row.wipPendingQty.toLocaleString()} × {(row.sortingYield * 100).toFixed(0)}%)
                        </div>
                      </td>

                      {/* 總可用供給 */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.totalAvailableSupply.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-500">PCS</span>
                        </div>
                        <div
                          className={`text-xs font-semibold ${
                            row.balanceQty >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {row.balanceQty >= 0 ? `餘裕 +${row.balanceQty.toLocaleString()}` : `赤字 -${row.deficitQty.toLocaleString()}`}
                        </div>
                      </td>

                      {/* 狀態燈號 */}
                      <td className="py-4 px-4 text-center">
                        {row.status === 'clear' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            100% 可放行
                          </span>
                        )}
                        {row.status === 'wip_dependent' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            需挑選 WIP
                          </span>
                        )}
                        {row.status === 'deficit' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
                            缺貨赤字
                          </span>
                        )}
                      </td>

                      {/* 行動建議 */}
                      <td className="py-4 px-4">
                        <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 max-w-sm">
                          {row.actionNote}
                        </div>
                      </td>

                      {/* MRP 連結 */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onNavigateToMRP(row.sku)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                          title="查看完整 MRP 原料與模具推導"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tuesday Meeting Coordination Guideline Bento */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            週二內部協調會議決策 SOP (Tuesday Meeting Action Protocol)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
            <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              步驟 1：確認 🟢 放行品號
            </div>
            現貨在庫良品已大於需求，業務會後即可通知客戶下達正式訂單，安排本週常態出貨船期。
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
            <div className="font-bold text-amber-600 dark:text-amber-400 mb-1">
              步驟 2：派發 🟡 WIP 優先挑選工單
            </div>
            現場主管（廠長/課長）即刻將三樓暫存區之對應批號移轉至人工挑選線，於出貨日前驗收入庫。
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40">
            <div className="font-bold text-red-600 dark:text-red-400 mb-1">
              步驟 3：協商 🔴 赤字料號分批交付
            </div>
            業務依據「實質可承接量」向客戶提出第一批出貨協議，並點擊右側箭頭進入 MRP 計算緊急開機排程。
          </div>
        </div>
      </div>
    </div>
  );
};
