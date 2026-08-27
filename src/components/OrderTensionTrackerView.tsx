/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Filter,
  Flame,
  ShieldCheck,
  Activity,
  RotateCcw,
  Info
} from 'lucide-react';
import { SystemDatabase, SystemParameters } from '../types';
import {
  diagnoseAllOrderTensions,
  OrderTensionDiagnostic,
  BottleneckStageType
} from '../utils/orderTensionEngine';

interface OrderTensionTrackerViewProps {
  db: SystemDatabase;
  params?: SystemParameters;
  onNavigateToMRP: (sku: string) => void;
  onNavigateToTables: (tableName: string) => void;
}

export const OrderTensionTrackerView: React.FC<OrderTensionTrackerViewProps> = ({
  db,
  params,
  onNavigateToMRP,
  onNavigateToTables
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tensionLevelFilter, setTensionLevelFilter] = useState<'ALL' | 'critical' | 'high' | 'medium' | 'normal'>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Run Tension Engine Diagnostics
  const diagnostics: OrderTensionDiagnostic[] = useMemo(() => {
    return diagnoseAllOrderTensions(db, params);
  }, [db, params]);

  // Statistics KPI
  const stats = useMemo(() => {
    const total = diagnostics.length;
    const criticalCount = diagnostics.filter((d) => d.overallTensionLevel === 'critical').length;
    const highCount = diagnostics.filter((d) => d.overallTensionLevel === 'high').length;
    const mediumCount = diagnostics.filter((d) => d.overallTensionLevel === 'medium').length;
    const normalCount = diagnostics.filter((d) => d.overallTensionLevel === 'normal').length;
    const healthyRate = total > 0 ? Math.round((normalCount / total) * 100) : 100;

    return {
      total,
      criticalCount,
      highCount,
      mediumCount,
      normalCount,
      healthyRate
    };
  }, [diagnostics]);

  // Filtered List
  const filteredDiagnostics = useMemo(() => {
    return diagnostics.filter((item) => {
      // 1. Search filter
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.orderId.toLowerCase().includes(query) ||
        item.customerId.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query);

      // 2. Tension Level filter
      const matchLevel =
        tensionLevelFilter === 'ALL' || item.overallTensionLevel === tensionLevelFilter;

      // 3. Stage Bottleneck filter
      const matchStage =
        stageFilter === 'ALL' || item.bottlenecks.some((b) => b.stage === stageFilter);

      return matchSearch && matchLevel && matchStage;
    });
  }, [diagnostics, searchQuery, tensionLevelFilter, stageFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-800">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                訂單缺料分析與瓶頸診斷
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                自動預警中
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              即時檢索全廠訂單，精確定位<strong className="font-semibold text-slate-800 dark:text-slate-200">「原料交期、模具產能、WIP待挑選、在途船期、色母配色、倉容超載」</strong>等 6 大供應鏈卡關環節，提供一鍵應變處置 SOP。
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setSearchQuery('');
                setTensionLevelFilter('ALL');
                setStageFilter('ALL');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置條件</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 極度危急訂單 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
            <span className="text-sm font-medium">🔴 極度危急訂單</span>
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.criticalCount}{' '}
            <span className="text-sm font-normal text-slate-500">筆訂單</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            原料下單逾期或實質缺貨赤字
          </div>
        </div>

        {/* KPI 2: 高風險 (產能/船期) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-sm font-medium">🟣 產能/船期高風險</span>
            <Cpu className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.highCount}{' '}
            <span className="text-sm font-normal text-slate-500">筆訂單</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            射出排產天數吃緊或在途 PO 延遲
          </div>
        </div>

        {/* KPI 3: WIP待檢驗/中度緊張 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-sm font-medium">🟡 WIP 待挑選支援</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.mediumCount}{' '}
            <span className="text-sm font-normal text-slate-500">筆訂單</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            現貨良品不足，需 3F WIP 優先全檢
          </div>
        </div>

        {/* KPI 4: 健康履約率 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-sm font-medium">🟢 安全備料覆蓋率</span>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.healthyRate}%{' '}
            <span className="text-sm font-normal text-slate-500">({stats.normalCount}/{stats.total} 筆)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            各環節備料充足，可如期交付
          </div>
        </div>
      </div>

      {/* 3. Omni Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="輸入訂單號 (如 PO-202608-001)、客戶代碼 (A客戶 / B客戶) 或品號 (A01-200-131) 即時檢索..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700"
            >
              清除
            </button>
          )}
        </div>

        {/* Quick Tension Level & Bottleneck Stage Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Tension Level Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">缺料等級篩選:</span>
            <button
              onClick={() => setTensionLevelFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                tensionLevelFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              全部 ({stats.total})
            </button>
            <button
              onClick={() => setTensionLevelFilter('critical')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                tensionLevelFilter === 'critical'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              }`}
            >
              🔴 極度危急 ({stats.criticalCount})
            </button>
            <button
              onClick={() => setTensionLevelFilter('high')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                tensionLevelFilter === 'high'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
              }`}
            >
              🟣 產能/船期風險 ({stats.highCount})
            </button>
            <button
              onClick={() => setTensionLevelFilter('medium')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                tensionLevelFilter === 'medium'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              🟡 WIP 待挑選 ({stats.mediumCount})
            </button>
            <button
              onClick={() => setTensionLevelFilter('normal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                tensionLevelFilter === 'normal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              🟢 安全無虞 ({stats.normalCount})
            </button>
          </div>

          {/* Stage Bottleneck Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">特定卡關環節:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">全部供應鏈環節 (All Stages)</option>
              <option value="raw_material_leadtime">🔴 原料採購交期環節</option>
              <option value="molding_capacity">🟣 模具射出產能環節</option>
              <option value="wip_sorting">🟡 WIP 檢驗驗收環節</option>
              <option value="in_transit_shipping">🟠 在途海運船期環節</option>
              <option value="colorant_shortage">🔵 色母配色缺料環節</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Diagnostics Order List */}
      <div className="space-y-4">
        {filteredDiagnostics.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            查無符合條件之物料緊張訂單。所有排程均在健康掌握中！
          </div>
        ) : (
          filteredDiagnostics.map((item) => {
            const isExpanded = expandedOrders.has(item.orderId);

            return (
              <div
                key={item.orderId}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs transition-all ${
                  item.overallTensionLevel === 'critical'
                    ? 'border-red-300 dark:border-red-900/60 ring-1 ring-red-500/20'
                    : item.overallTensionLevel === 'high'
                    ? 'border-purple-300 dark:border-purple-900/60'
                    : item.overallTensionLevel === 'medium'
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Summary Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Order Info & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                        {item.orderId}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {item.customerId}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {item.sku}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        ({item.productName})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        訂單量: <strong className="text-slate-900 dark:text-white font-mono">{item.orderQty.toLocaleString()} PCS</strong>
                      </span>
                      <span>
                        約定交期: <strong className="text-slate-900 dark:text-white font-mono">{item.targetDate}</strong>
                        <span className={`ml-1 font-semibold ${item.daysToDeliver < 7 ? 'text-red-500' : 'text-slate-500'}`}>
                          ({item.daysToDeliver >= 0 ? `倒數 ${item.daysToDeliver} 天` : `已逾期 ${Math.abs(item.daysToDeliver)} 天`})
                        </span>
                      </span>
                      <span>
                        成品現貨: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.fgReadyQty.toLocaleString()} PCS</strong>
                      </span>
                      <span>
                        3F 待驗: <strong className="text-amber-600 dark:text-amber-400 font-mono">{item.wipPendingQty.toLocaleString()} PCS</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Bottleneck Stage Tags & Action */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Stage Badges List */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.bottlenecks.length === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          備料充足
                        </span>
                      ) : (
                        item.bottlenecks.map((b, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              b.level === 'red'
                                ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : b.level === 'purple'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : b.level === 'orange'
                                ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                : b.level === 'yellow'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {b.stageBadge}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateToMRP(item.sku)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="查看該品號 3 階 MRP 推導"
                      >
                        <span>MRP 推導</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleExpandOrder(item.orderId)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
                        title={isExpanded ? '收合環節診斷明細' : '展開缺料分析明細'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Diagnostic Drawer */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Flame className="w-4 h-4 text-purple-500" />
                      <span>缺料原因分析與處置建議 (Root Cause Breakdown)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {item.bottlenecks.map((b, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>【{b.stageName}】</span>
                              <span>{b.title}</span>
                            </span>
                            <span className="font-mono text-[0.9333rem] text-slate-500 font-semibold">
                              {b.metricText}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {b.detail}
                          </p>
                          <div className="pt-1.5 mt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 font-medium">
                            💡 <strong className="text-indigo-600 dark:text-indigo-400">處置指引：</strong>{b.actionGuide}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
