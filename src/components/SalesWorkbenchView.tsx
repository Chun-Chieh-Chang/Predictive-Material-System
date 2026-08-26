/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SalesWorkbenchView.tsx
 * 業務工作台 (Sales Hub)
 * 一體化整合：客戶/品號/PO 三向查詢、客戶預示量波動與 Bias% 追單、
 * 訂單物料狀況與交期回覆、出貨排程放行審查。
 */

import React, { useState, useMemo } from 'react';
import {
  SystemDatabase,
  SystemParameters,
} from '../types';
import { analyzeDemandCrossComparison } from '../utils/demandAnalysisEngine';
import {
  Search,
  Activity,
  CalendarCheck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SalesWorkbenchProps {
  db: SystemDatabase;
  params: SystemParameters;
  onNavigateToDashboard: (sku?: string) => void;
  onNavigateToOrderTension: () => void;
  onNavigateToShipClearance: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

export const SalesWorkbenchView: React.FC<SalesWorkbenchProps> = ({
  db,
  params,
  onNavigateToDashboard,
  onNavigateToOrderTension,
  onNavigateToShipClearance,
  onNotify,
}) => {
  // ── 查詢維度與狀態 ──────────────────────────────────────────────────────────
  const [queryType, setQueryType] = useState<'customer' | 'sku' | 'po'>('customer');
  const [searchKeyword, setSearchKeyword] = useState('A客戶');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // 所有客戶清單
  const customerList = useMemo(() => {
    const set = new Set<string>();
    db.item_master.forEach(i => set.add(i.customer_id));
    db.demand_forecast_log.forEach(d => set.add(d.customer_id));
    return Array.from(set).filter(Boolean);
  }, [db]);

  // 所有品號清單
  const skuList = useMemo(() => {
    return db.item_master.filter(i => !i.material_class || ['SET', 'PART', 'COMP'].includes(i.material_class));
  }, [db]);

  // 所有實際訂單清單
  const orderList = useMemo(() => {
    return db.actual_order || [];
  }, [db]);

  // ── 依查詢條件過濾物料與訂單 ─────────────────────────────────────────────────
  const relevantSkus = useMemo(() => {
    if (queryType === 'customer') {
      return db.item_master.filter(i => i.customer_id.toLowerCase() === searchKeyword.toLowerCase());
    }
    if (queryType === 'sku') {
      return db.item_master.filter(i => i.sku.toLowerCase().includes(searchKeyword.toLowerCase()));
    }
    if (queryType === 'po') {
      const order = orderList.find(o => o.order_id.toLowerCase().includes(searchKeyword.toLowerCase()));
      if (order) {
        return db.item_master.filter(i => i.sku === order.sku);
      }
    }
    return db.item_master.slice(0, 4);
  }, [queryType, searchKeyword, db.item_master, orderList]);

  const activeSku = relevantSkus[0]?.sku || 'A01-200-131';
  const selectedCustomer = relevantSkus[0]?.customer_id || (queryType === 'customer' ? searchKeyword : 'A客戶');

  // ── 計算當前品號的預測偏差與分析 ─────────────────────────────────────────────
  const demandSummaries = useMemo(() => {
    return analyzeDemandCrossComparison(db, activeSku);
  }, [activeSku, db]);

  const activeSummary = demandSummaries[0] || {
    totalForecastQty: 0,
    totalActualOrderQty: 0,
    totalHistoricalQty: 0,
    overallBiasPct: 0,
    overallAlertLevel: 'info' as const,
    recommendations: ['查無該品號之業務預估或訂單記錄，請至「資料表維護」新增需求。'],
  };

  // ── 關聯訂單與備料狀況分析計算 ─────────────────────────────────────────────────
  const relevantOrders = useMemo(() => {
    if (queryType === 'customer') {
      return orderList.filter(o => o.customer_id.toLowerCase() === searchKeyword.toLowerCase());
    }
    if (queryType === 'sku') {
      return orderList.filter(o => o.sku.toLowerCase().includes(searchKeyword.toLowerCase()));
    }
    if (queryType === 'po') {
      return orderList.filter(o => o.order_id.toLowerCase().includes(searchKeyword.toLowerCase()));
    }
    return orderList;
  }, [queryType, searchKeyword, orderList]);

  // ── 週二放行出貨概況計算 ─────────────────────────────────────────────────────
  const clearanceSummary = useMemo(() => {
    let totalTarget = 0;
    let readyCovered = 0;
    let wipNeeded = 0;
    let deficitCount = 0;

    relevantSkus.forEach(item => {
      const snap = db.inventory_wip_snapshot.find(s => s.sku === item.sku);
      const ready = snap?.fg_ready_qty || 0;
      const wip = snap?.wip_pending_qty || 0;
      const yieldRate = item.std_sorting_yield || 0.95;
      const effectiveWip = Math.round(wip * yieldRate);

      const orders = orderList.filter(o => o.sku === item.sku && o.status !== 'cancelled');
      const orderQty = orders.reduce((sum, o) => sum + o.order_qty, 0);
      totalTarget += orderQty;

      const totalAvailable = ready + effectiveWip;
      if (totalAvailable >= orderQty) {
        readyCovered += Math.min(ready, orderQty);
        wipNeeded += Math.max(0, orderQty - ready);
      } else {
        readyCovered += ready;
        wipNeeded += effectiveWip;
        deficitCount++;
      }
    });

    const coveragePct = totalTarget > 0 ? Math.min(100, Math.round(((readyCovered + wipNeeded) / totalTarget) * 100)) : 100;

    return {
      totalTarget,
      readyCovered,
      wipNeeded,
      deficitCount,
      coveragePct,
      status: deficitCount > 0 ? 'deficit' : wipNeeded > 0 ? 'need_wip' : 'pass',
    };
  }, [relevantSkus, db, orderList]);

  // ── 複製交期回覆話術 ────────────────────────────────────────────────────────
  const handleCopyScript = (orderId: string, scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScriptId(orderId);
    onNotify(`已複製訂單 ${orderId} 之客戶交期回覆話術至剪貼簿！`, 'success');
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── 頂部 Hero Banner ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-sky-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                SALES HUB
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">需求預估 · 訂單狀況 · 交期確認</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              業務工作台
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              提供業務人員快速檢索客戶預示量變化、訂單備料狀況與出貨排程放行資訊。
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateToDashboard(activeSku)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-300" />
              <span>物料需求總覽</span>
            </button>
            <button
              onClick={onNavigateToOrderTension}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>訂單缺料分析</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-Way Query Hub (客戶 / 品號 / PO 三向快速檢索樞紐) ─────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                快速查詢 (客戶 / 品號 / 訂單)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                切換查詢維度，即時查看關聯物料與訂單數據
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Query Dimension Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => { setQueryType('customer'); setSearchKeyword(customerList[0] || 'A客戶'); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  queryType === 'customer'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                🏢 按客戶
              </button>
              <button
                onClick={() => { setQueryType('sku'); setSearchKeyword(skuList[0]?.sku || activeSku); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  queryType === 'sku'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                📦 按品號
              </button>
              <button
                onClick={() => { setQueryType('po'); setSearchKeyword(orderList[0]?.order_id || ''); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  queryType === 'po'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                📑 按 PO 訂單
              </button>
            </div>

            {/* Quick Selector Dropdown / Search Input */}
            <div className="flex items-center gap-2">
              {queryType === 'customer' && (
                <select
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  {customerList.map(c => (
                    <option key={c} value={c}>{c} 客戶專案</option>
                  ))}
                </select>
              )}

              {queryType === 'sku' && (
                <select
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  {skuList.map(s => (
                    <option key={s.sku} value={s.sku}>{s.sku} ({s.category})</option>
                  ))}
                </select>
              )}

              {queryType === 'po' && (
                <select
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  {orderList.map(o => (
                    <option key={o.order_id} value={o.order_id}>{o.order_id} ({o.customer_id} - {o.sku})</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 業務四大核心卡片佈局 (2x2 Bento Grid) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── 卡片 1: 預示量波動與 Bias% 追單決策 ────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    預示量波動與 Bias% 追單決策
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    品號：<span className="font-mono font-bold text-slate-700 dark:text-slate-200">{activeSku}</span> ({selectedCustomer})
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                activeSummary.overallAlertLevel === 'normal'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : activeSummary.overallAlertLevel === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
              }`}>
                偏差率 Bias: {activeSummary.overallBiasPct > 0 ? `+${activeSummary.overallBiasPct}` : activeSummary.overallBiasPct}%
              </span>
            </div>

            {/* 三向數據對照柱狀條 */}
            <div className="my-5 space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">當月滾動預示量 (Forecast)</span>
                  <span className="font-mono text-slate-900 dark:text-white">{activeSummary.totalForecastQty.toLocaleString()} PCS</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">已確認正式實單 (Actual Order)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{activeSummary.totalActualOrderQty.toLocaleString()} PCS</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((activeSummary.totalActualOrderQty / (activeSummary.totalForecastQty || 1)) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">去年同期歷史提貨基準 (LY Benchmark)</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{activeSummary.totalHistoricalQty.toLocaleString()} PCS</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((activeSummary.totalHistoricalQty / (activeSummary.totalForecastQty || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 業務決策處置建言卡片 */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
              activeSummary.overallAlertLevel === 'normal'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-200'
                : activeSummary.overallAlertLevel === 'warning'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-950 dark:text-amber-200'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-sm">
                {activeSummary.overallAlertLevel === 'normal' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                <span>業務處置建言：</span>
              </div>
              <p className="opacity-90">{activeSummary.recommendations[0] || '排程平穩，請按既定計畫安排交運。'}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigateToDashboard(activeSku)}
              className="text-xs text-sky-700 dark:text-sky-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>查看三向比對歷史趨勢</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 卡片 2: 週二出貨可行性放行快報 ───────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center font-bold">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    本週二出貨放行快報 (Ship Clearance)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    雙週出貨可行性即時審查
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                clearanceSummary.status === 'pass'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : clearanceSummary.status === 'need_wip'
                  ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
              }`}>
                {clearanceSummary.status === 'pass' ? '🟢 100% 安全放行' : clearanceSummary.status === 'need_wip' ? '🟡 需 WIP 檢驗支援' : '🔴 實質缺料赤字'}
              </span>
            </div>

            {/* 核心數據指標 */}
            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[0.9333rem] text-slate-500 dark:text-slate-400 block">待出貨目標量</span>
                <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-1">
                  {clearanceSummary.totalTarget.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>

              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[0.9333rem] text-emerald-700 dark:text-emerald-300 font-semibold block">在庫現貨良品</span>
                <div className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                  {clearanceSummary.readyCovered.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>

              <div className="bg-sky-50/60 dark:bg-sky-950/30 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/40">
                <span className="text-[0.9333rem] text-sky-700 dark:text-sky-300 font-semibold block">WIP 折算支援</span>
                <div className="text-lg font-mono font-bold text-sky-700 dark:text-sky-400 mt-1">
                  {clearanceSummary.wipNeeded.toLocaleString()} <span className="text-xs font-normal">PCS</span>
                </div>
              </div>
            </div>

            {/* 放行進度條 */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">雙週出貨覆蓋率</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{clearanceSummary.coveragePct}%</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((clearanceSummary.readyCovered / (clearanceSummary.totalTarget || 1)) * 100))}%` }} title="良品在庫覆蓋" />
                <div className="h-full bg-sky-400" style={{ width: `${Math.min(100, Math.round((clearanceSummary.wipNeeded / (clearanceSummary.totalTarget || 1)) * 100))}%` }} title="WIP 待驗覆蓋" />
              </div>
              <div className="flex justify-between text-[0.8667rem] text-slate-500 font-mono">
                <span>🟢 成品良品在庫 ({clearanceSummary.readyCovered.toLocaleString()} PCS)</span>
                <span>🔵 在製品 WIP 檢驗 ({clearanceSummary.wipNeeded.toLocaleString()} PCS)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onNavigateToShipClearance}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>進入週二協調放行看板</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 卡片 3: 訂單備料狀況分析與交期回覆參考 (Full Width) ──── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                訂單物料狀況與客戶交期回覆參考
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                點擊任一訂單即可複製客戶交期回覆訊息
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToOrderTension}
            className="text-xs text-purple-700 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>查看各供應鏈環節明細</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 訂單列表與話術展示 */}
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {relevantOrders.slice(0, 5).map(order => {
            const item = db.item_master.find(i => i.sku === order.sku);
            const snap = db.inventory_wip_snapshot.find(s => s.sku === order.sku);
            const readyQty = snap?.fg_ready_qty || 0;
            const wipQty = snap?.wip_pending_qty || 0;
            const isReadyCovered = readyQty >= order.order_qty;

            // 自動生成客戶回覆話術
            const replyScript = isReadyCovered
              ? `【交期回覆】${order.customer_id} 採購您好，關於訂單 ${order.order_id}（品號：${order.sku}，數量：${order.order_qty.toLocaleString()} PCS）：目前成品倉庫良品現貨在庫充足（在庫量 ${readyQty.toLocaleString()} PCS），可於預定交期（${order.target_date}）準時放行出貨！`
              : `【交期回覆】${order.customer_id} 採購您好，關於訂單 ${order.order_id}（品號：${order.sku}，數量：${order.order_qty.toLocaleString()} PCS）：目前成品良品現貨 ${readyQty.toLocaleString()} PCS，在製品待驗區 (WIP) 待驗品 ${wipQty.toLocaleString()} PCS 已排定品檢優先支援，預計於 ${order.target_date} 順利交運。`;

            const isCopied = copiedScriptId === order.order_id;

            return (
              <div key={order.order_id} className="py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-3 rounded-xl transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {order.order_id}
                    </span>
                    <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 text-[0.9333rem] font-bold px-2 py-0.5 rounded-md font-mono">
                      {order.customer_id}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {order.sku} ({item?.category || '成品'})
                    </span>
                    <span className={`text-[0.9333rem] font-bold px-2 py-0.5 rounded-md ${
                      isReadyCovered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {isReadyCovered ? '🟢 良品現貨滿足' : '🟡 WIP 檢驗支援中'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>訂單數量: <strong className="text-slate-700 dark:text-slate-300 font-mono">{order.order_qty.toLocaleString()} PCS</strong></span>
                    <span>目標交期: <strong className="text-slate-700 dark:text-slate-300 font-mono">{order.target_date}</strong></span>
                    <span>成品在庫: <strong className="text-slate-700 dark:text-slate-300 font-mono">{readyQty.toLocaleString()} PCS</strong></span>
                    <span>WIP待驗: <strong className="text-slate-700 dark:text-slate-300 font-mono">{wipQty.toLocaleString()} PCS</strong></span>
                  </div>
                </div>

                {/* 話術快捷複製鈕 */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyScript(order.order_id, replyScript)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                    title="複製給客戶的專業交期回覆話術"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                    <span>{isCopied ? '已複製話術！' : '複製交期回覆話術'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
