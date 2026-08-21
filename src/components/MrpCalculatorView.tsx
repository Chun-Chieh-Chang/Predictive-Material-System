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
  SlidersHorizontal
} from 'lucide-react';
import { SystemDatabase, MRPCalculationResult, SystemParameters } from '../types';
import { calculateMRPForSku } from '../utils/mrpEngine';

interface MrpCalculatorViewProps {
  db: SystemDatabase;
  params?: SystemParameters;
  initialSku?: string;
  onNavigateToSettings?: () => void;
}

export const MrpCalculatorView: React.FC<MrpCalculatorViewProps> = ({
  db,
  params,
  initialSku = 'A01-200-131',
  onNavigateToSettings
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const [activeMoldId, setActiveMoldId] = useState<string | null>(null);

  // Available finished goods SKUs
  const availableSkus = db.item_master.filter((i) => i.category === 'FinishedGoods');

  // Related molds for this SKU
  const relatedBoms = db.product_mold_bom.filter((b) => b.sku === selectedSku);
  const currentMoldId = activeMoldId || relatedBoms.find((b) => b.is_primary_mold)?.mold_id || relatedBoms[0]?.mold_id;

  // Run MRP Calculation with System Parameters
  const result: MRPCalculationResult | null = calculateMRPForSku(
    db,
    selectedSku,
    currentMoldId,
    undefined,
    params
  );

  if (!result) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        查無此料號之 MRP 運算設定或相關主檔資料。
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & SKU Selector Bento Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-950 text-blue-400 border border-blue-800/60 text-xs font-mono px-2 py-0.5 rounded-md">
                3-STAGE MRP ENGINE
              </span>
              <h2 className="text-xl font-bold text-white">
                3 階 MRP 智能需求推導中心
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              由客戶 Forecast 與實際訂單出發，扣減在庫良品與 Sorting 待驗品，經模具妥善穴數展開算出原料淨需求
            </p>
          </div>

          {/* SKU Pill Selector & Settings Link */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">切換品號:</span>
            {availableSkus.map((item) => (
              <button
                key={item.sku}
                onClick={() => {
                  setSelectedSku(item.sku);
                  setActiveMoldId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                  selectedSku === item.sku
                    ? 'bg-[#e0f2fe] text-[#0284c7] border-[#0284c7] shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-[#f8fafc] hover:text-slate-900'
                }`}
              >
                {item.sku}
              </button>
            ))}

            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-800/60 transition-colors ml-2"
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
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">當前套用參數策略:</span>
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-blue-400 font-mono">
              需求: {params.demandConsumptionMode === 'additive' ? 'Forecast+PO 疊加' : 'PO 沖銷'}
            </span>
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-cyan-400 font-mono">
              選模: {params.multiMoldStrategy === 'conservative_max_weight' ? '最重克重原則' : params.multiMoldStrategy === 'primary_mold_only' ? '主模優先' : '精實最輕'}
            </span>
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-purple-400 font-mono">
              日工時: {params.dailyOperatingHours}h
            </span>
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-amber-400 font-mono">
              安全庫存: {params.safetyStockMultiplier}x
            </span>
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-red-400 font-mono">
              警戒期: &le;{params.shortageAlertBufferDays}天
            </span>
          </div>
        )}

        {/* Selected SKU Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-400 uppercase block font-medium">產品名稱 / 客戶</span>
            <span className="font-bold text-white mt-1 block text-sm">{result.productName} ({result.customerId})</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-400 uppercase block font-medium">需求版本 / 交期</span>
            <span className="font-mono font-bold text-cyan-400 mt-1 block text-sm">{result.versionNo} ({result.targetDate})</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-400 uppercase block font-medium">指定塑料 (RM SKU)</span>
            <span className="font-mono font-bold text-purple-400 mt-1 block text-sm">{result.rmSku}</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-400 uppercase block font-medium">最晚採購下單日</span>
            <span className="font-mono font-bold text-red-400 mt-1 block text-sm">{result.suggestedOrderDate}</span>
          </div>
        </div>

        {/* Dynamic MRP Status Alerts */}
        {result.alerts && result.alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
            {result.alerts.map((alert, idx) => {
              const isRed = alert.level === 'red';
              const isOrange = alert.level === 'orange';
              const isYellow = alert.level === 'yellow';
              const isPurple = alert.level === 'purple';
              const isGreen = alert.level === 'green';

              const borderClass = isRed
                ? 'border-red-500/40 bg-red-950/20 text-red-300'
                : isOrange
                ? 'border-orange-500/40 bg-orange-950/20 text-orange-300'
                : isYellow
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                : isPurple
                ? 'border-purple-500/40 bg-purple-950/20 text-purple-300'
                : 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';

              return (
                <div key={idx} className={`p-4 rounded-xl border ${borderClass} flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}>
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-sm text-white">
                      <span>{alert.title}</span>
                    </div>
                    <p className="mt-1.5 text-slate-200 leading-relaxed text-xs">
                      {alert.description}
                    </p>
                  </div>
                  <div className="shrink-0 bg-slate-950/70 px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-sans font-medium text-slate-200">
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
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold flex items-center justify-center text-sm font-mono">
            01
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              第 1 階：成品淨需求運算 (FG Net Requirement Calculation)
            </h3>
            <p className="text-xs text-slate-400">
              公式：Max(0, (預估需求 + 實際訂單) - 在庫良品 - (Sorting 待驗品 × 全檢良率))
            </p>
          </div>
        </div>

        {/* Calculation Visual Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 my-6 items-center">
          {/* Step 1: Demand */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-blue-400 font-semibold block uppercase">A. 總需求量 Demand</span>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {(result.forecastQty + result.actualOrderQty).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Forecast: {result.forecastQty.toLocaleString()} + 實單: {result.actualOrderQty.toLocaleString()}
            </div>
          </div>

          <div className="flex justify-center text-slate-600">
            <span className="text-xl font-bold font-mono">－</span>
          </div>

          {/* Step 2: FG Ready */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-emerald-400 font-semibold block uppercase">B. 成品在庫良品 FG Ready</span>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {result.fgReadyQty.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              即時可出貨現貨
            </div>
          </div>

          <div className="flex justify-center text-slate-600">
            <span className="text-xl font-bold font-mono">－</span>
          </div>

          {/* Step 3: WIP Pending × Yield */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-purple-400 font-semibold block uppercase">C. 待驗品有效良品 WIP Net</span>
            <div className="text-xl font-mono font-bold text-purple-400 mt-1">
              {result.wipEffectiveQty.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">PCS</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {result.wipPendingQty.toLocaleString()} × {(result.sortingYield * 100).toFixed(0)}% (良率)
            </div>
          </div>
        </div>

        {/* Stage 1 Result Callout */}
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-xs text-blue-200 block">第 1 階計算結果：成品淨需求量 (FG Net Requirement)</span>
              <span className="text-lg font-bold text-white">
                需射出製造 <span className="text-cyan-300 font-mono">{result.fgNetRequirementQty.toLocaleString()}</span> PCS
              </span>
            </div>
          </div>
          <span className="text-xs font-mono bg-blue-900/60 text-blue-200 px-3 py-1.5 rounded-lg border border-blue-700/50">
            = Max(0, {result.forecastQty + result.actualOrderQty} - {result.fgReadyQty} - {result.wipEffectiveQty})
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 2: Mold BOM Explosion & Cavities Analysis */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold flex items-center justify-center text-sm font-mono">
            02
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              第 2 階：模具 M:N 關聯展開與妥善穴數 (Mold BOM Explosion)
            </h3>
            <p className="text-xs text-slate-400">
              單穴耗料克重 = (整模成品重 + 流道重) ÷ 妥善穴數 (Active Cavities)
            </p>
          </div>
        </div>

        {/* Mold Switchers if Multi-Mold */}
        <div className="mt-4">
          <span className="text-xs font-semibold text-slate-400 block mb-2">可適合成型模具清單 (M:N 多模具關聯支援)：</span>
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
                      ? 'bg-purple-950/30 border-purple-500/60 shadow-lg shadow-purple-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-sm">{bom.mold_id}</span>
                    {bom.is_primary_mold ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        ★ 主模 (Primary)
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full">
                        備用模 (Secondary)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-xs text-slate-400 block">妥善/設計穴數</span>
                      <span className={`font-mono font-bold ${isDegraded ? 'text-amber-400' : 'text-purple-300'}`}>
                        {moldInfo?.active_cavities} / {moldInfo?.design_cavities} 穴
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">成型週期</span>
                      <span className="font-mono text-slate-200">{moldInfo?.cycle_time_sec} 秒</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">日產能 (PCS/日)</span>
                      <span className="font-mono font-bold text-blue-400">
                        {Math.round((86400 / (moldInfo?.cycle_time_sec || 30)) * (moldInfo?.active_cavities || 16)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isDegraded && (
                    <div className="mt-2.5 text-xs text-amber-400 flex items-center gap-1.5">
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
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase block font-medium">整模克重 (Total Shot Weight)</span>
            <div className="font-mono font-bold text-base text-white mt-1">
              {result.totalShotWeightG} <span className="text-xs font-normal text-slate-400">g</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              成品重 {result.netMoldWeightG}g + 流道 {result.runnerWeightG}g
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase block font-medium">計算分母：妥善穴數 (Active)</span>
            <div className="font-mono font-bold text-base text-purple-400 mt-1">
              {result.activeCavities} <span className="text-xs font-normal text-slate-400">穴</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              設計為 {result.designCavities} 穴
            </span>
          </div>

          <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-500/40">
            <span className="text-xs text-purple-300 uppercase block font-semibold">單穴耗用原料克重 (Unit Weight)</span>
            <div className="font-mono font-bold text-lg text-purple-200 mt-1">
              {result.unitWeightG.toFixed(3)} <span className="text-xs font-normal">g/穴</span>
            </div>
            <span className="text-xs text-purple-300/80 mt-1 block">
              = {result.totalShotWeightG} ÷ {result.activeCavities}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 3: Raw Material Net Requirement & Procurement */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center justify-center text-sm font-mono">
            03
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              第 3 階：原料淨需求與採購建議排程 (RM Net Requirement & PO Recommendation)
            </h3>
            <p className="text-xs text-slate-400">
              考量製程損耗、原料在手庫存、在途採購 PO、安全庫存與最小起訂量 (MOQ)
            </p>
          </div>
        </div>

        {/* Calculation Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-6">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold block">A. 毛需求 (含製程損耗)</span>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {result.rmGrossRequirementKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              損耗率: {(result.stdScrapRate * 100).toFixed(0)}%
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold block">B. 原料可用庫存 (在庫+在途)</span>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {(result.rmOnHandKg + result.rmInTransitKg).toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              在庫: {result.rmOnHandKg.toLocaleString()} | 在途: {result.rmInTransitKg.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold block">C. 原料淨缺口 (含安全庫存)</span>
            <div className="text-xl font-mono font-bold text-purple-400 mt-1">
              {result.rmNetRequirementKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              安全庫存: {result.safetyStockKg.toLocaleString()} KG
            </span>
          </div>

          <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-500/40">
            <span className="text-xs text-blue-300 uppercase font-bold block">D. 建議採購下單量 (取整 MOQ)</span>
            <div className="text-xl font-mono font-bold text-blue-400 mt-1">
              {result.suggestedOrderQtyKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
            </div>
            <span className="text-xs text-blue-300/80 mt-1 block">
              MOQ: {result.moqKg.toLocaleString()} KG
            </span>
          </div>
        </div>

        {/* Final Procurement Callout Bento Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-white text-sm">採購時間表與交期倒推結果</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              交期 (Lead Time)：<strong className="text-white font-mono">{result.leadTimeDays}</strong> 天 | 需求到達日：<strong className="text-white font-mono">{result.targetDate}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase block font-medium">建議最晚下單發 PO 日期</span>
              <span className="text-lg font-mono font-bold text-red-400">{result.suggestedOrderDate}</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-800"></div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase block font-medium">下單倒數計時</span>
              <span className={`text-base font-bold font-mono ${result.daysUntilLatestOrder < 0 ? 'text-red-400' : result.daysUntilLatestOrder < 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {result.daysUntilLatestOrder >= 0 ? `剩餘 ${result.daysUntilLatestOrder} 天` : `已逾期 ${Math.abs(result.daysUntilLatestOrder)} 天`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
