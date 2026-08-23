/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Layers,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Package,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Boxes,
  Truck,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SystemDatabase, MRPCalculationResult, SystemParameters, isShippableMaterialClass } from '../types';
import { calculateMRPForSKU } from '../utils/mrpEngine';

interface MrpCalculatorViewProps {
  db: SystemDatabase;
  params?: SystemParameters;
  initialSku?: string;
  onNavigateToSettings?: () => void;
}

export const MrpCalculatorView: React.FC<MrpCalculatorViewProps> = ({
  db,
  params,
  initialSku,
  onNavigateToSettings
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(initialSku || 'A01-200-131');
  const [activeMoldId, setActiveMoldId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const toggleStage = (id: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // High-priority light-mode color overrides injected as inline styles
  const lightModeOverrides = `
    .light label.text-white,
    .light .text-white,
    .light span.text-white,
    .light strong.text-white { color: #0f172a !important; }
    .light .text-slate-400 { color: #475569 !important; }
    .light .text-slate-500 { color: #374151 !important; }
    .light .text-slate-300 { color: #334155 !important; }
    .light .text-red-400 { color: #dc2626 !important; }
    .light .text-amber-400 { color: #d97706 !important; }
    .light .text-purple-400 { color: #7c3aed !important; }
    .light .text-cyan-400 { color: #0891b2 !important; }
    .light .text-emerald-400 { color: #059669 !important; }
    .light .text-blue-400 { color: #0284c7 !important; }
    .light .text-purple-300 { color: #6d28d9 !important; }
    .light .text-slate-200 { color: #1e293b !important; }
  `;
  const isStageCollapsed = (id: string) => collapsedStages.has(id);

  // Available finished goods / shippable SKUs (SET / PART / COMP 類可出貨品)
  const availableSkus = db.item_master.filter((i) => isShippableMaterialClass(i.material_class));

  // Related molds for this SKU
  const relatedBoms = db.product_mold_bom.filter((b) => b.sku === selectedSku);
  const currentMoldId = activeMoldId || relatedBoms.find((b) => b.is_primary_mold)?.mold_id || relatedBoms[0]?.mold_id;

  // Run MRP Calculation with System Parameters
  const result: MRPCalculationResult | null = calculateMRPForSKU(
    db,
    selectedSku,
    currentMoldId,
    undefined,
    params
  );

  if (!result) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        查無此料號之 MRP 運算設定或相關主檔資料。
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & SKU Selector Bento Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 text-xs font-mono font-bold px-2.5 py-0.5 rounded-md">
                3-STAGE MRP ENGINE
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                3 階 MRP 智能需求推導中心
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              由客戶 Forecast 與實際訂單出發，扣減在庫良品與 Sorting 待驗品，經模具妥善穴數展開算出原料淨需求
            </p>
          </div>

          {/* SKU Pill Selector & Settings Link */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-semibold">切換品號:</span>
            {availableSkus.map((item) => (
              <button
                key={item.sku}
                onClick={() => {
                  setSelectedSku(item.sku);
                  setActiveMoldId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-sm font-mono font-bold transition-all border cursor-pointer ${
                  selectedSku === item.sku
                    ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.sku}
              </button>
            ))}

            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors ml-2 cursor-pointer"
                title="調整 MRP 運算策略與告警門檻"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>運算參數</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic System Strategy Indicator */}
        {params && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">當前套用參數策略:</span>
            <span className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-sky-700 dark:text-blue-400 font-mono font-medium">
              需求: {params.demandConsumptionMode === 'additive' ? 'Forecast+PO 疊加' : 'PO 沖銷'}
            </span>
            <span className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-cyan-700 dark:text-cyan-400 font-mono font-medium">
              選模: {params.multiMoldStrategy === 'conservative_max_weight' ? '最重克重原則' : params.multiMoldStrategy === 'primary_mold_only' ? '主模優先' : '精實最輕'}
            </span>
            <span className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-purple-700 dark:text-purple-400 font-mono font-medium">
              日工時: {params.dailyOperatingHours}h
            </span>
            <span className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-amber-700 dark:text-amber-400 font-mono font-medium">
              安全庫存: {params.safetyStockMultiplier}x
            </span>
            <span className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-red-700 dark:text-red-400 font-mono font-medium">
              警戒期: &le;{params.shortageAlertBufferDays}天
            </span>
          </div>
        )}

        {/* Selected SKU Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">產品名稱 / 客戶</span>
            <span className="font-bold text-slate-900 dark:text-white mt-1 block text-sm">{result.productName} ({result.customerId})</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">需求版本 / 交期</span>
            <span className="font-mono font-bold text-sky-700 dark:text-cyan-400 mt-1 block text-sm">{result.versionNo} ({result.targetDate})</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">指定塑料 (RM SKU)</span>
            <span className="font-mono font-bold text-purple-700 dark:text-purple-400 mt-1 block text-sm">{result.rmSku}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">最晚採購下單日</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400 mt-1 block text-sm">{result.suggestedOrderDate}</span>
          </div>
        </div>

        {/* Dynamic MRP Status Alerts */}
        {result.alerts && result.alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
            {result.alerts.map((alert, idx) => {
              const isRed = alert.level === 'red';
              const isOrange = alert.level === 'orange';
              const isYellow = alert.level === 'yellow';
              const isPurple = alert.level === 'purple';

              const borderClass = isRed
                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                : isOrange
                ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300'
                : isYellow
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                : isPurple
                ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300'
                : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300';

              return (
                <div key={idx} className={`p-4 rounded-xl border ${borderClass} flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm`}>
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                      <span>{alert.title}</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                      {alert.description}
                    </p>
                  </div>
                  <div className="shrink-0 bg-white/80 dark:bg-slate-950/70 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    💡 建議處置: {alert.actionRecommendation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: Finished Goods (FG) Net Requirement */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-blue-500/10 text-sky-600 dark:text-blue-400 border border-sky-200 dark:border-blue-500/20 font-bold flex items-center justify-center text-sm font-mono">
              01
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                第 1 階：成品淨需求運算 (FG Net Requirement Calculation)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                公式：Max(0, (預估需求 + 實際訂單) - 在庫良品 - (Sorting 待驗品 × 全檢良率))
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleStage('stage1')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={isStageCollapsed('stage1') ? '展開' : '收合'}
          >
            {isStageCollapsed('stage1') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{isStageCollapsed('stage1') ? '展開' : '收合'}</span>
          </button>
        </div>

        {!isStageCollapsed('stage1') && (<>

        {/* Calculation Visual Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 my-6 items-center">
          {/* Step 1: Demand */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-sky-700 dark:text-blue-400 font-semibold block uppercase">A. 總需求量 Demand</span>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
              {(result.forecastQty + result.actualOrderQty).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Forecast: {result.forecastQty.toLocaleString()} + 實單: {result.actualOrderQty.toLocaleString()}
            </div>
          </div>

          <div className="flex justify-center text-slate-400 dark:text-slate-600">
            <span className="text-xl font-bold font-mono">－</span>
          </div>

          {/* Step 2: FG Ready */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block uppercase">B. 成品在庫良品 FG Ready</span>
            <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {result.fgReadyQty.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              即時可出貨現貨
            </div>
          </div>

          <div className="flex justify-center text-slate-400 dark:text-slate-600">
            <span className="text-xl font-bold font-mono">－</span>
          </div>

          {/* Step 3: WIP Pending × Yield */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-purple-700 dark:text-purple-400 font-semibold block uppercase">C. 待驗品有效良品 WIP Net</span>
            <div className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
              {result.wipEffectiveQty.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {result.wipPendingQty.toLocaleString()} × {(result.sortingYield * 100).toFixed(0)}% (良率)
            </div>
          </div>
        </div>

        {/* Stage 1 Result Callout */}
        <div className="bg-sky-50 dark:bg-blue-950/40 border border-sky-200 dark:border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-cyan-400 shrink-0" />
            <div>
              <span className="text-xs text-sky-800 dark:text-blue-200 block">第 1 階計算結果：成品淨需求量 (FG Net Requirement)</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                需射出製造 <span className="text-sky-600 dark:text-cyan-300 font-mono">{result.fgNetRequirementQty.toLocaleString()}</span> PCS
              </span>
            </div>
          </div>
          <span className="text-xs font-mono bg-white dark:bg-blue-900/60 text-sky-800 dark:text-blue-200 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-blue-700/50">
            = Max(0, {result.forecastQty + result.actualOrderQty} - {result.fgReadyQty} - {result.wipEffectiveQty})
          </span>
        </div>
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 2: Mold BOM Explosion & Cavities Analysis */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 font-bold flex items-center justify-center text-sm font-mono">
              02
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                第 2 階：模具 M:N 關聯展開與妥善穴數 (Mold BOM Explosion)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                單穴耗料克重 = (整模成品重 + 流道重) ÷ 妥善穴數 (Active Cavities)
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleStage('stage2')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={isStageCollapsed('stage2') ? '展開' : '收合'}
          >
            {isStageCollapsed('stage2') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{isStageCollapsed('stage2') ? '展開' : '收合'}</span>
          </button>
        </div>

        {!isStageCollapsed('stage2') && (<>

        {/* Mold Switchers if Multi-Mold */}
        <div className="mt-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">可適合成型模具清單 (M:N 多模具關聯支援)：</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedBoms.map((bom) => {
              const moldInfo = db.mold_master.find((m) => m.mold_id === bom.mold_id);
              const isCurrent = moldInfo?.mold_id === currentMoldId;
              const isDegraded = (moldInfo?.active_cavities || 0) < (moldInfo?.design_cavities || 0);

              return (
                <div
                  key={bom.mold_id}
                  onClick={() => setActiveMoldId(bom.mold_id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/60 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{bom.mold_id}</span>
                    {bom.is_primary_mold ? (
                      <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        ★ 主模 (Primary)
                      </span>
                    ) : (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        備用模 (Secondary)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">妥善/設計穴數</span>
                      <span className={`font-mono font-bold ${isDegraded ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-300'}`}>
                        {moldInfo?.active_cavities} / {moldInfo?.design_cavities} 穴
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">成型週期</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">{moldInfo?.cycle_time_sec} 秒</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">日產能 (PCS/日)</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-blue-400">
                        {Math.round((86400 / (moldInfo?.cycle_time_sec || 30)) * (moldInfo?.active_cavities || 16)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isDegraded && (
                    <div className="mt-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>塞穴警示：塞 { (moldInfo?.design_cavities || 0) - (moldInfo?.active_cavities || 0) } 穴，單穴耗料上升</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Mold Weight Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">整模克重 (Total Shot Weight)</span>
            <div className="font-mono font-bold text-base text-slate-900 dark:text-white mt-1">
              {result.totalShotWeightG} <span className="text-xs font-normal text-slate-500">g</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 mt-1 block">
              成品重 {result.netMoldWeightG}g + 流道 {result.runnerWeightG}g
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">計算分母：妥善穴數 (Active)</span>
            <div className="font-mono font-bold text-base text-purple-600 dark:text-purple-400 mt-1">
              {result.activeCavities} <span className="text-xs font-normal text-slate-500">穴</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 mt-1 block">
              設計為 {result.designCavities} 穴
            </span>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-500/40">
            <span className="text-purple-700 dark:text-purple-300 uppercase block font-semibold">單穴耗用原料克重 (Unit Weight)</span>
            <div className="font-mono font-bold text-lg text-purple-800 dark:text-purple-200 mt-1">
              {result.unitWeightG.toFixed(3)} <span className="text-xs font-normal">g/穴</span>
            </div>
            <span className="text-purple-600/80 dark:text-purple-300/80 mt-1 block">
              = {result.totalShotWeightG} ÷ {result.activeCavities}
            </span>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 3: Raw Material Net Requirement & Procurement */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold flex items-center justify-center text-sm font-mono">
              03
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                第 3 階：原料淨需求與採購建議排程 (RM Net Requirement & PO Recommendation)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                考量製程損耗、原料在手庫存、在途採購 PO、安全庫存與最小起訂量 (MOQ)
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleStage('stage3')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0 cursor-pointer"
            title={isStageCollapsed('stage3') ? '展開' : '收合'}
          >
            {isStageCollapsed('stage3') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{isStageCollapsed('stage3') ? '展開' : '收合'}</span>
          </button>
        </div>

        {!isStageCollapsed('stage3') && (<>

        {/* Calculation Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-6 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 uppercase font-semibold block">A. 毛需求 (含製程損耗)</span>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-1">
              {result.rmGrossRequirementKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 mt-1 block">
              損耗率: {(result.stdScrapRate * 100).toFixed(0)}%
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 uppercase font-semibold block">B. 原料可用庫存 (在庫+在途)</span>
            <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {(result.rmOnHandKg + result.rmInTransitKg).toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 mt-1 block">
              在庫: {result.rmOnHandKg.toLocaleString()} | 在途: {result.rmInTransitKg.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 uppercase font-semibold block">C. 原料淨缺口 (含安全庫存)</span>
            <div className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
              {result.rmNetRequirementKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 mt-1 block">
              安全庫存: {result.safetyStockKg.toLocaleString()} KG
            </span>
          </div>

          <div className="bg-sky-50 dark:bg-blue-950/40 p-4 rounded-xl border border-sky-200 dark:border-blue-500/40">
            <span className="text-sky-700 dark:text-blue-300 uppercase font-bold block">D. 建議採購下單量 (取整 MOQ)</span>
            <div className="text-xl font-mono font-bold text-sky-700 dark:text-blue-400 mt-1">
              {result.suggestedOrderQtyKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <span className="text-sky-600/80 dark:text-blue-300/80 mt-1 block">
              MOQ: {result.moqKg.toLocaleString()} KG
            </span>
          </div>
        </div>

        {/* Virtual Backflush Callout (if active) */}
        {result.virtualBackflushDeductedKg !== undefined && result.virtualBackflushDeductedKg > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>月內自用料虛擬預扣已生效：</strong>已依 3樓 WIP 待驗量自動預扣原料 <strong>{result.virtualBackflushDeductedKg.toLocaleString()} KG</strong>（ERP 帳面 {result.rmOnHandKg.toLocaleString()} KG $\rightarrow$ 真實可用 {result.effectiveRmOnHandKg?.toLocaleString()} KG）。
              </span>
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold whitespace-nowrap">
              消滅時序差
            </span>
          </div>
        )}

        {/* Final Procurement Callout Bento Box */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
              <span className="font-bold text-slate-900 dark:text-white text-sm">採購時間表與交期倒推結果</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              交期 (Lead Time)：<strong className="text-slate-900 dark:text-white font-mono">{result.leadTimeDays}</strong> 天 | 需求到達日：<strong className="text-slate-900 dark:text-white font-mono">{result.targetDate}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">建議最晚下單發 PO 日期</span>
              <span className="text-lg font-mono font-bold text-red-600 dark:text-red-400">{result.suggestedOrderDate}</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 uppercase block font-medium">下單倒數計時</span>
              <span className={`text-base font-bold font-mono ${result.daysUntilLatestOrder < 0 ? 'text-red-600 dark:text-red-400' : result.daysUntilLatestOrder < 15 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {result.daysUntilLatestOrder >= 0 ? `剩餘 ${result.daysUntilLatestOrder} 天` : `已逾期 ${Math.abs(result.daysUntilLatestOrder)} 天`}
              </span>
            </div>
          </div>
        </div>

        {/* Phased Delivery Inbound Schedule (Subtask 3.1) */}
        {result.phasedDeliveryPlan && result.phasedDeliveryPlan.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-slate-950/90 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  建議分批/階段性到港排程 (防範 8,000 萬爆倉與倉容超載)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                拆為 {result.phasedDeliveryPlan.length} 批進貨
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {result.phasedDeliveryPlan.map((batch) => (
                <div
                  key={batch.batchNo}
                  className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      第 {batch.batchNo} 批進貨: {batch.qtyKg.toLocaleString()} KG
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      約 {Math.ceil(batch.qtyKg / 25)} 包
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">
                    最晚下單: <strong className="text-slate-900 dark:text-white font-mono">{batch.orderDate}</strong> ➔ 預計到廠: <strong className="text-slate-900 dark:text-white font-mono">{batch.etaDate}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {batch.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};
