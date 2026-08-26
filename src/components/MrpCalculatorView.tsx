/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  Search,
  X,
  Check,
  Calculator,
  HelpCircle,
  Clock3,
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
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [expandedMathStage, setExpandedMathStage] = useState<'stage1' | 'stage2' | 'stage3' | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'SET' | 'COMP' | 'PART'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available finished goods / shippable SKUs (SET / PART / COMP 類可出貨品)
  const availableSkus = db.item_master.filter((i) => isShippableMaterialClass(i.material_class));

  // Filtered SKUs based on category tab & search keyword
  const filteredSkus = availableSkus.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.material_class === selectedCategory;
    const matchesSearch = searchTerm === '' ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.customer_id && item.customer_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelectSku = (sku: string) => {
    setSelectedSku(sku);
    setActiveMoldId(null);
    setSelectedVersion(null);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Related molds for this SKU
  const relatedBoms = db.product_mold_bom.filter((b) => b.sku === selectedSku);
  const currentMoldId = activeMoldId || relatedBoms.find((b) => b.is_primary_mold)?.mold_id || relatedBoms[0]?.mold_id;

  // 版本管理：該 SKU 全部版本（依最新→最舊排序），null = 最新版
  const skuForecasts = db.demand_forecast_log.filter((f) => f.sku === selectedSku);
  const versionOptions = Array.from(new Set(skuForecasts.map((f) => f.version_no))).sort((a, b) => {
    const la = skuForecasts.filter((f) => f.version_no === a).reduce((m, f) => (f.created_at > m ? f.created_at : m), '');
    const lb = skuForecasts.filter((f) => f.version_no === b).reduce((m, f) => (f.created_at > m ? f.created_at : m), '');
    return lb > la ? 1 : -1;
  });
  const latestVersionNo = versionOptions[0] || null;
  const activeVersionNo = selectedVersion && versionOptions.includes(selectedVersion) ? selectedVersion : latestVersionNo;

  // Run MRP Calculation with System Parameters
  const result: MRPCalculationResult | null = calculateMRPForSKU(
    db,
    selectedSku,
    currentMoldId,
    activeVersionNo ?? undefined,
    params
  );

  // 版本衝擊分析：以前一版（相同模具與系統參數）重算，比對需求與採購建議差異
  const prevVersionNo = activeVersionNo && versionOptions.indexOf(activeVersionNo) >= 0
    ? versionOptions[versionOptions.indexOf(activeVersionNo) + 1] || null
    : null;
  const prevResult: MRPCalculationResult | null = prevVersionNo
    ? calculateMRPForSKU(db, selectedSku, currentMoldId, prevVersionNo, params)
    : null;

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

          {/* Smart SKU Selector & Settings Link */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              {(['ALL', 'SET', 'COMP', 'PART'] as const).map((cat) => {
                const count = cat === 'ALL'
                  ? availableSkus.length
                  : availableSkus.filter(s => s.material_class === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 font-bold shadow-xs border border-slate-200 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat === 'ALL' ? '全部' : cat === 'SET' ? '成品 SET' : cat === 'COMP' ? '組件 COMP' : '單品 PART'}
                    <span className="ml-1 text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Searchable SKU Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between min-w-[260px] sm:min-w-[300px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 shadow-xs cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-2 truncate mr-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono font-bold text-sm text-sky-700 dark:text-sky-400">
                    {selectedSku}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {result?.productName}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu Popup */}
              {isDropdownOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-[320px] sm:w-[380px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
                  {/* Search Input Box */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2 bg-slate-50 dark:bg-slate-950/60">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜尋品號、品名或客戶..."
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtered SKU List */}
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                    {filteredSkus.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        查無符合「{searchTerm}」的品號
                      </div>
                    ) : (
                      filteredSkus.map((item) => {
                        const isSelected = item.sku === selectedSku;
                        const classColor = item.material_class === 'SET'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : item.material_class === 'COMP'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                        return (
                          <div
                            key={item.sku}
                            onClick={() => handleSelectSku(item.sku)}
                            className={`p-3 flex items-center justify-between hover:bg-sky-50/50 dark:hover:bg-sky-950/30 cursor-pointer transition-colors ${
                              isSelected ? 'bg-sky-50 dark:bg-sky-950/60 font-semibold' : ''
                            }`}
                          >
                            <div className="flex flex-col truncate mr-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {item.sku}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${classColor}`}>
                                  {item.material_class}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {item.category} {item.description ? `• ${item.description}` : ''}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-colors shrink-0 cursor-pointer"
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
            {versionOptions.length > 1 ? (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <select
                  value={activeVersionNo || ''}
                  onChange={(e) => setSelectedVersion(e.target.value === latestVersionNo ? null : e.target.value)}
                  id="mrp-version-select"
                  className="font-mono font-bold text-sm text-sky-700 dark:text-cyan-400 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
                >
                  {versionOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}{v === latestVersionNo ? '（最新）' : ''}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">({result.targetDate})</span>
              </div>
            ) : (
              <span className="font-mono font-bold text-sky-700 dark:text-cyan-400 mt-1 block text-sm">{result.versionNo} ({result.targetDate})</span>
            )}
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

      {/* Version Impact Analysis: 現版 vs 前一版（相同模具與系統參數下重算） */}
      {versionOptions.length > 1 && prevVersionNo && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                版本衝擊分析：{result.versionNo} vs 前一版 {prevVersionNo}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                相同模具與系統參數下分別重算，比對預估版本更新對需求與採購建議的衝擊
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {result.calcError || (prevResult && prevResult.calcError) ? '⚠️ 含缺值版本，比對數字僅供參考' : '✔ 兩版主檔完整'}
            </span>
          </div>
          {prevResult && !result.calcError && !prevResult.calcError ? (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-sm" id="mrp-version-diff-table">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5">指標</th>
                    <th className="px-3 py-2.5 text-right">前版 {prevVersionNo}</th>
                    <th className="px-3 py-2.5 text-right">現版 {result.versionNo}</th>
                    <th className="px-3 py-2.5 text-right">差異</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {([
                    { label: '總需求量 (PCS)', cur: result.totalDemandQty, prev: prevResult.totalDemandQty },
                    { label: '成品淨需求 (PCS)', cur: result.fgNetRequirementQty, prev: prevResult.fgNetRequirementQty },
                    { label: '原料毛需求 (KG)', cur: result.rmGrossRequirementKg, prev: prevResult.rmGrossRequirementKg },
                    { label: '原料淨需求 (KG)', cur: result.rmNetRequirementKg, prev: prevResult.rmNetRequirementKg },
                    { label: '建議採購量 (KG)', cur: result.suggestedOrderQtyKg, prev: prevResult.suggestedOrderQtyKg }
                  ]).map((row) => {
                    const delta = Number((row.cur - row.prev).toFixed(2));
                    return (
                      <tr key={row.label}>
                        <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{row.prev.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{row.cur.toLocaleString()}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-bold ${delta > 0 ? 'text-red-600 dark:text-red-400' : delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {delta > 0 ? `▲ +${delta.toLocaleString()}` : delta < 0 ? `▼ ${delta.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">最晚下單日</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">{prevResult.suggestedOrderDate}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">{result.suggestedOrderDate}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-500 dark:text-slate-400">
                      {result.suggestedOrderDate === prevResult.suggestedOrderDate ? '—' : `${Math.round((new Date(result.suggestedOrderDate).getTime() - new Date(prevResult.suggestedOrderDate).getTime()) / 86400000)} 天`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              ⚠️ 前一版或現版存在主檔缺值（{result.calcError || prevResult?.calcError}），無法產出可信比對，請先至資料表維護補齊。
            </p>
          )}
        </div>
      )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandedMathStage(expandedMathStage === 'stage1' ? null : 'stage1')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-blue-900/60 hover:bg-sky-100 dark:hover:bg-blue-800 text-sky-800 dark:text-cyan-300 border border-sky-300 dark:border-blue-700 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{expandedMathStage === 'stage1' ? '收合公式明細' : '📐 展開計算公式明細'}</span>
            </button>
            <span className="text-xs font-mono bg-white dark:bg-blue-900/60 text-sky-800 dark:text-blue-200 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-blue-700/50">
              = Max(0, {result.forecastQty + result.actualOrderQty} - {result.fgReadyQty} - {result.wipEffectiveQty})
            </span>
          </div>
        </div>

        {/* Explainable Math Card for Stage 1 (OBJ-08) */}
        {expandedMathStage === 'stage1' && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-sky-300 dark:border-sky-500/40 text-xs font-mono space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-sky-700 dark:text-cyan-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>第 1 階計算公式明細 (Formula Breakdown)</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">標準 3 階 MRP 模型</span>
            </div>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              <div><strong>數學公式：</strong><code className="text-sky-800 dark:text-cyan-300 font-mono font-bold">FG_Net_Gap = Max(0, Total_Demand - FG_Ready - (WIP_Pending × Yield))</code></div>
              <div><strong>帶入實務變數：</strong></div>
              <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <li><span className="text-slate-800 dark:text-slate-200 font-semibold">Total_Demand:</span> 預示量 {result.forecastQty.toLocaleString()} + 實單 {result.actualOrderQty.toLocaleString()} = {(result.forecastQty + result.actualOrderQty).toLocaleString()} PCS</li>
                <li><span className="text-slate-800 dark:text-slate-200 font-semibold">FG_Ready (成品良品現貨):</span> {result.fgReadyQty.toLocaleString()} PCS (已在庫檢驗合格)</li>
                <li><span className="text-slate-800 dark:text-slate-200 font-semibold">WIP_Effective (待驗品折算):</span> {result.wipPendingQty.toLocaleString()} PCS × {(result.sortingYield * 100).toFixed(0)}% (標準良率) = {result.wipEffectiveQty.toLocaleString()} PCS</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 font-bold font-mono">
                ➜ 最終結果：Max(0, {(result.forecastQty + result.actualOrderQty).toLocaleString()} - {result.fgReadyQty.toLocaleString()} - {result.wipEffectiveQty.toLocaleString()}) = {result.fgNetRequirementQty.toLocaleString()} PCS
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between">
              <span className="text-purple-700 dark:text-purple-300 uppercase block font-semibold">單穴耗用原料克重 (Unit Weight)</span>
              <button
                onClick={() => setExpandedMathStage(expandedMathStage === 'stage2' ? null : 'stage2')}
                className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Calculator className="w-3 h-3" />
                <span>{expandedMathStage === 'stage2' ? '收合' : '算式履歷'}</span>
              </button>
            </div>
            <div className="font-mono font-bold text-lg text-purple-800 dark:text-purple-200 mt-1">
              {result.unitWeightG.toFixed(3)} <span className="text-xs font-normal">g/穴</span>
            </div>
            <span className="text-purple-600/80 dark:text-purple-300/80 mt-1 block">
              = {result.totalShotWeightG} ÷ {result.activeCavities}
            </span>
          </div>
        </div>

        {/* Explainable Math Card for Stage 2 (OBJ-08) */}
        {expandedMathStage === 'stage2' && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-purple-300 dark:border-purple-500/40 text-xs font-mono space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>第 2 階計算公式明細 (Mold & Cavities Math Breakdown)</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">模具 M:N 與穴數損耗折算</span>
            </div>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              <div><strong>單穴用量公式：</strong><code className="text-purple-800 dark:text-purple-300 font-mono font-bold">Unit_Weight_g = (Net_Mold_Weight + Runner_Weight) / Active_Cavities</code></div>
              <div><strong>實務變數帶入：</strong></div>
              <ul className="list-disc list-inside pl-2 space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <li>整模成品重: {result.netMoldWeightG}g + 流道重: {result.runnerWeightG}g = 整模克重 {result.totalShotWeightG}g</li>
                <li>妥善穴數: {result.activeCavities} 穴 (設計穴數: {result.designCavities} 穴{result.activeCavities < result.designCavities ? `，因塞 ${result.designCavities - result.activeCavities} 穴導致單穴分攤上升` : '，全穴滿載'})</li>
                <li>日產能推估: (86,400秒 ÷ {result.cycleTimeSec}秒週期) × {result.activeCavities}穴 = {result.dailyCapacityPcs.toLocaleString()} PCS/日</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 font-bold font-mono">
                ➜ 最終單穴耗量：{result.totalShotWeightG}g ÷ {result.activeCavities} = {result.unitWeightG.toFixed(3)} g/穴
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center justify-between">
              <span className="text-sky-700 dark:text-blue-300 uppercase font-bold block">D. 建議採購下單量 (取整 MOQ)</span>
              <button
                onClick={() => setExpandedMathStage(expandedMathStage === 'stage3' ? null : 'stage3')}
                className="text-[11px] font-semibold text-sky-700 dark:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Calculator className="w-3 h-3" />
                <span>{expandedMathStage === 'stage3' ? '收合' : '算式履歷'}</span>
              </button>
            </div>
            <div className="text-xl font-mono font-bold text-sky-700 dark:text-blue-400 mt-1">
              {result.suggestedOrderQtyKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <span className="text-sky-600/80 dark:text-blue-300/80 mt-1 block">
              MOQ: {result.moqKg.toLocaleString()} KG
            </span>
          </div>
        </div>

        {/* Explainable Math Card for Stage 3 (OBJ-08) */}
        {expandedMathStage === 'stage3' && (
          <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-emerald-300 dark:border-emerald-500/40 text-xs font-mono space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>第 3 階計算公式明細 (Procurement Formula Breakdown)</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">採購補貨與安全庫存整補</span>
            </div>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              <div><strong>原料毛需求公式：</strong><code className="text-emerald-800 dark:text-emerald-300 font-mono font-bold">RM_Gross_Kg = (FG_Net_Gap × Unit_Weight_g / 1000) / (1 - Scrap_Rate)</code></div>
              <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <li>FG 成品淨缺口: {result.fgNetRequirementQty.toLocaleString()} PCS × 單穴重 {result.unitWeightG}g ÷ 1,000 = {((result.fgNetRequirementQty * result.unitWeightG) / 1000).toFixed(2)} KG</li>
                <li>製程損耗率: {(result.stdScrapRate * 100).toFixed(0)}% ➜ 毛需求 = {result.rmGrossRequirementKg.toLocaleString()} KG</li>
              </ul>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800"><strong>原料淨缺口與採購建議公式：</strong><code className="text-emerald-800 dark:text-emerald-300 font-mono font-bold">RM_Net_Gap = RM_Gross - (RM_OnHand + InTransit) + SafetyStock</code></div>
              <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <li>可用在庫: {result.rmOnHandKg.toLocaleString()} KG + 在途 PO: {result.rmInTransitKg.toLocaleString()} KG</li>
                <li>安全庫存防線: {result.safetyStockKg.toLocaleString()} KG</li>
                <li>算式結果: {result.rmGrossRequirementKg.toLocaleString()} - {(result.rmOnHandKg + result.rmInTransitKg).toLocaleString()} + {result.safetyStockKg.toLocaleString()} = {result.rmNetRequirementKg.toLocaleString()} KG</li>
                <li>MOQ 向上整補: Ceil({result.rmNetRequirementKg} / {result.moqKg}) × {result.moqKg} = <span className="text-emerald-700 dark:text-emerald-400 font-bold">{result.suggestedOrderQtyKg.toLocaleString()} KG</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* Virtual Backflush Callout (if active) */}
        {result.virtualBackflushDeductedKg !== undefined && result.virtualBackflushDeductedKg > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>月內自用料虛擬預扣已生效：</strong>已依在製品 (WIP) 待驗量自動預扣原料 <strong>{result.virtualBackflushDeductedKg.toLocaleString()} KG</strong>（ERP 帳面 {result.rmOnHandKg.toLocaleString()} KG $\rightarrow$ 真實可用 {result.effectiveRmOnHandKg?.toLocaleString()} KG）。
              </span>
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold whitespace-nowrap">
              消滅時序差
            </span>
          </div>
        )}

        {/* Final Procurement Callout Bento Box & Visual Timeline (OBJ-03) */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">採購時間表與交期倒推結果 (OBJ-03)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                供應商前置交期 (Lead Time)：<strong className="text-slate-900 dark:text-white font-mono">{result.leadTimeDays}</strong> 天 | 需求到達日：<strong className="text-slate-900 dark:text-white font-mono">{result.targetDate}</strong>
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

          {/* SCM Visual Timeline Bar (OBJ-03) */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
              <span>採購到貨排程時間軸與防斷料倒數：</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs font-sans">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 text-[10px]">1. 當前日期</div>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{new Date().toISOString().split('T')[0]}</div>
                <div className="text-[10px] text-emerald-600 font-medium">系統監控中</div>
              </div>
              <div className={`p-2 rounded border ${result.daysUntilLatestOrder < 0 ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300'}`}>
                <div className="text-[10px]">2. 最晚採購下單日</div>
                <div className="font-mono font-bold mt-0.5">{result.suggestedOrderDate}</div>
                <div className="text-[10px] font-bold">{result.daysUntilLatestOrder < 0 ? `逾期 ${Math.abs(result.daysUntilLatestOrder)} 天` : `倒數 ${result.daysUntilLatestOrder} 天`}</div>
              </div>
              <div className="p-2 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200">
                <div className="text-[10px]">3. 採購前置交期</div>
                <div className="font-mono font-bold mt-0.5">{result.leadTimeDays} 天</div>
                <div className="text-[10px] text-sky-600">在途運送 + 檢驗</div>
              </div>
              <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200">
                <div className="text-[10px]">4. 客戶約定交期</div>
                <div className="font-mono font-bold mt-0.5">{result.targetDate}</div>
                <div className="text-[10px] text-purple-600">產線完工出貨</div>
              </div>
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
