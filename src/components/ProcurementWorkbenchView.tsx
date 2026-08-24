/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProcurementWorkbenchView.tsx
 * 生管採購工作台 (Procurement & Production Workbench)
 * 整合：最晚下單日倒數時程軸、標準 3 階 MRP 淨需求推導（計算公式明細）、
 * 模具妥善穴數與日產能推估、資料表維護快捷操作。
 */

import React, { useState, useMemo } from 'react';
import {
  SystemDatabase,
  SystemParameters,
  MRPCalculationResult,
} from '../types';
import { calculateMRPForSKU, calculateAllMRP } from '../utils/mrpEngine';
import {
  Calculator,
  Database,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  Clock,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ProcurementWorkbenchProps {
  db: SystemDatabase;
  params: SystemParameters;
  onNavigateToMRP: (sku: string) => void;
  onNavigateToTables: (tableKey: string) => void;
  onNavigateToDataExchange: () => void;
  onNotify: (message: string, type: 'success' | 'error') => void;
}

export const ProcurementWorkbenchView: React.FC<ProcurementWorkbenchProps> = ({
  db,
  params,
  onNavigateToMRP,
  onNavigateToTables,
  onNavigateToDataExchange,
  onNotify,
}) => {
  // 可選成品料號清單
  const finishGoodSkus = useMemo(() => {
    return db.item_master.filter(i => !i.material_class || ['SET', 'PART', 'COMP'].includes(i.material_class));
  }, [db]);

  const [selectedSku, setSelectedSku] = useState(finishGoodSkus[0]?.sku || 'A01-200-131');
  const [expandedMathDrawer, setExpandedMathDrawer] = useState(false);

  // 全品項 MRP 運算結果（用於 30 天時程軸與缺料排行）
  const allMrpResults = useMemo(() => {
    return calculateAllMRP(db, undefined, params);
  }, [db, params]);

  // 當前選中料號的 MRP 結果
  const currentMrp = useMemo<MRPCalculationResult | null>(() => {
    return calculateMRPForSKU(db, selectedSku, undefined, undefined, params);
  }, [selectedSku, db, params]);

  // 30 天防斷料時程軸數據
  const timelineData = useMemo(() => {
    const today = new Date();
    return allMrpResults
      .map(res => {
        const item = db.item_master.find(i => i.sku === res.sku);
        const order = db.actual_order.find(o => o.sku === res.sku);
        const hasOrder = !!order;
        const dueDate = order ? new Date(order.target_date) : new Date(today.getTime() + 20 * 86400000);
        const leadTimeDays = item?.lead_time_days || res.leadTimeDays || 14;
        const latestOrderDate = new Date(dueDate.getTime() - leadTimeDays * 86400000);
        const daysRemaining = Math.ceil((latestOrderDate.getTime() - today.getTime()) / 86400000);

        return {
          sku: res.sku,
          category: item?.category || '零件',
          suggestedOrderQtyKg: res.suggestedOrderQtyKg,
          daysRemaining,
          dueDateStr: order?.target_date || dueDate.toISOString().split('T')[0],
          latestOrderDateStr: latestOrderDate.toISOString().split('T')[0],
          hasOrder,
          isUrgent: daysRemaining <= 3,
          isWarning: daysRemaining > 3 && daysRemaining <= 7,
          isSafe: daysRemaining > 7,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [allMrpResults, db]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── 頂部 Hero Banner ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-emerald-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                PROCUREMENT & PRODUCTION
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">採購下單倒數 · 3 階 MRP 推導 · 模具產能 · 資料表維護</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              生管採購工作台
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              整合物料排程與採購推算。自動計算最晚下單日、MOQ 採購整補量與模具日產能。
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateToMRP(selectedSku)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/20 text-xs font-bold transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              <span>進入 3 階 MRP 計算</span>
            </button>
            <button
              onClick={() => onNavigateToTables('item_master')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>資料表維護</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 模組 1: 前瞻防斷料 30 天時程軸（最晚發單日倒數） ───────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                最晚採購下單日倒數 (30 天時程軸)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                依採購交期 (Lead Time) 倒推最晚發單日，逾期標示提醒，按緊急度排序
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            監控品項：{timelineData.length} 項
          </span>
        </div>

        {/* 橫向時程卡片滾動區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {timelineData.slice(0, 4).map(item => (
            <div
              key={item.sku}
              onClick={() => setSelectedSku(item.sku)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedSku === item.sku
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{item.sku}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  item.isUrgent
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                    : item.isWarning
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}>
                  {item.daysRemaining <= 0 ? '⚠️ 已逾期' : `倒數 ${item.daysRemaining} 天`}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>建議採購量:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{item.suggestedOrderQtyKg.toLocaleString()} KG</strong>
                </div>
                <div className="flex justify-between">
                  <span>最晚發單日:</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{item.latestOrderDateStr}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{item.hasOrder ? '客戶交期:' : '預設交期 (無PO):'}</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">{item.dueDateStr}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 模組 2 & 3: 3階MRP算式推導 + 模具產能折算 (2欄佈局) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── 3 階 MRP 推導與公式明細 (佔 2 欄) ────────────────────────────── */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    標準 3 階 MRP 淨需求推導與 MOQ 採購整補
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    品號：<span className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedSku}</span>
                  </p>
                </div>
              </div>

              {/* 切換品號下拉 */}
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {finishGoodSkus.map(s => (
                  <option key={s.sku} value={s.sku}>{s.sku} ({s.category})</option>
                ))}
              </select>
            </div>

            {/* 3 階 MRP 矩陣卡片 */}
            {currentMrp ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
                {/* 階 1 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">第 1 階：FG 成品淨缺口</span>
                  <div className="text-xl font-mono font-bold text-sky-700 dark:text-sky-400 mt-1">
                    {currentMrp.fgNetRequirementQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">PCS</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    在庫良品: {currentMrp.fgReadyQty.toLocaleString()} | WIP待驗: {currentMrp.wipEffectiveQty.toLocaleString()}
                  </span>
                </div>

                {/* 階 2 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">第 2 階：單穴耗量與損耗</span>
                  <div className="text-xl font-mono font-bold text-purple-700 dark:text-purple-400 mt-1">
                    {currentMrp.unitWeightG.toFixed(3)} <span className="text-xs font-normal text-slate-500">g/穴</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                    整模 {currentMrp.totalShotWeightG}g ÷ 妥善 {currentMrp.activeCavities} 穴 (損耗 {(currentMrp.stdScrapRate * 100).toFixed(0)}%)
                  </span>
                </div>

                {/* 階 3 */}
                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-300 dark:border-emerald-500/40">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">第 3 階：建議採購量 (取整 MOQ)</span>
                  <div className="text-xl font-mono font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                    {currentMrp.suggestedOrderQtyKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
                  </div>
                  <span className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-1 block font-mono">
                    淨缺口 {currentMrp.rmNetRequirementKg.toLocaleString()} KG ➜ MOQ {currentMrp.moqKg} KG 整補
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                尚無該品號之預測或成型 BOM 資料
              </div>
            )}

            {/* 公式明細展開開關 */}
            {currentMrp && (
              <button
                onClick={() => setExpandedMathDrawer(!expandedMathDrawer)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{expandedMathDrawer ? '收合計算公式明細' : '📐 展開 3 階 MRP 計算公式明細'}</span>
                </div>
                {expandedMathDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}

            {/* 公式內容 (可收合) */}
            {expandedMathDrawer && currentMrp && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/40 text-xs font-mono space-y-3 animate-in fade-in-50">
                <div className="space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  <div>
                    <strong className="text-sky-800 dark:text-sky-300">[階 1 淨缺口]</strong> <code className="font-mono text-sky-800 dark:text-sky-300">Max(0, 需求 {(currentMrp.forecastQty + currentMrp.actualOrderQty).toLocaleString()} - 在庫 {currentMrp.fgReadyQty} - WIP {currentMrp.wipEffectiveQty}) = {currentMrp.fgNetRequirementQty.toLocaleString()} PCS</code>
                  </div>
                  <div>
                    <strong className="text-purple-800 dark:text-purple-300">[階 2 單穴重]</strong> <code className="font-mono text-purple-800 dark:text-purple-300">整模 {currentMrp.totalShotWeightG}g ÷ 妥善 {currentMrp.activeCavities} 穴 = {currentMrp.unitWeightG.toFixed(3)} g/穴</code>
                  </div>
                  <div>
                    <strong className="text-emerald-800 dark:text-emerald-300">[階 3 採購整補]</strong> <code className="font-mono text-emerald-800 dark:text-emerald-300">毛需求 {currentMrp.rmGrossRequirementKg.toLocaleString()} KG - 在手與在途 {(currentMrp.rmOnHandKg + currentMrp.rmInTransitKg).toLocaleString()} KG + 安全庫存 {currentMrp.safetyStockKg} KG ➜ MOQ 取整 = {currentMrp.suggestedOrderQtyKg.toLocaleString()} KG</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigateToMRP(selectedSku)}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>查看 30 天完整時程明細</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 模具產能與妥善穴數分析 (佔 1 欄) ────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  模具妥善穴數與機台產能
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  即時折算塞穴與損耗影響
                </p>
              </div>
            </div>

            {currentMrp ? (
              <div className="my-5 space-y-4 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block">模具設計穴數 vs 妥善穴數</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                      {currentMrp.activeCavities} <span className="text-xs font-normal text-slate-500">/ {currentMrp.designCavities} 穴</span>
                    </span>
                    {currentMrp.activeCavities < currentMrp.designCavities ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                        塞 {currentMrp.designCavities - currentMrp.activeCavities} 穴
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        全穴妥善
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block">成型週期與日標準產能</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                      {currentMrp.dailyCapacityPcs.toLocaleString()} <span className="text-xs font-normal text-slate-500">PCS/日</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {currentMrp.cycleTimeSec} 秒/模
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block">採購前置時間 (Lead Time)</span>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-1">
                    {currentMrp.leadTimeDays} <span className="text-xs font-normal text-slate-500">天</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                尚無模具產能數據
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigateToTables('mold_master')}
              className="text-xs text-amber-800 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>維護模具妥善穴數</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 模組 4: 8 大核心營運主檔快捷樞紐與 Excel 快速匯入匯出 ─────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                8 大核心營運主檔維護與 Excel 快速範本
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                點選直接進入對應主表在線編輯或批次匯入匯出
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToDataExchange}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 text-xs font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>Excel 雙向交換與情境模擬</span>
          </button>
        </div>

        {/* 8 大主檔快捷按鈕網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
          {[
            { key: 'item_master', name: '料號主檔', count: db.item_master.length, icon: '📦' },
            { key: 'mold_master', name: '模具產能', count: db.mold_master.length, icon: '🔧' },
            { key: 'product_mold_bom', name: '成型 BOM', count: db.product_mold_bom.length, icon: '📑' },
            { key: 'demand_forecast_log', name: '預估需求', count: db.demand_forecast_log.length, icon: '📈' },
            { key: 'actual_order', name: '實際訂單', count: db.actual_order.length, icon: '🎯' },
            { key: 'inventory_wip_snapshot', name: '庫存快照', count: db.inventory_wip_snapshot.length, icon: '🏬' },
            { key: 'po_in_transit', name: '在途採購', count: db.po_in_transit.length, icon: '🚢' },
            { key: 'sorting_actual_yield_log', name: '良率紀錄', count: (db as any).sorting_actual_yield_log?.length ?? 0, icon: '🔬' },
          ].map(tbl => (
            <button
              key={tbl.key}
              onClick={() => onNavigateToTables(tbl.key)}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all cursor-pointer group"
            >
              <div className="text-base">{tbl.icon}</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                {tbl.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {tbl.count} 筆記錄
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
