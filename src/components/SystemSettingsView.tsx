/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Layers,
  Clock,
  CheckCircle2,
  Download,
  Upload,
  Info,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Cpu,
  Boxes,
  Percent,
  SlidersHorizontal,
  Flame,
  Shield,
  Activity
} from 'lucide-react';
import {
  SystemDatabase,
  SystemParameters,
  DEFAULT_SYSTEM_PARAMETERS,
  MultiMoldStrategy,
  DemandConsumptionMode
} from '../types';
import { calculateAllMRP } from '../utils/mrpEngine';

interface SystemSettingsViewProps {
  db: SystemDatabase;
  params: SystemParameters;
  setParams: React.Dispatch<React.SetStateAction<SystemParameters>>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  onNavigateToMRP?: (sku: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  db,
  params,
  setParams,
  onNotify,
  onNavigateToMRP
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'mrp' | 'yield'>('all');

  // Real-time calculation with current parameters
  const mrpResults = calculateAllMRP(db, undefined, params);
  const redAlerts = mrpResults.flatMap((r) => r.alerts.filter((a) => a.level === 'red'));
  const yellowAlerts = mrpResults.flatMap((r) => r.alerts.filter((a) => a.level === 'yellow'));
  const purpleAlerts = mrpResults.flatMap((r) => r.alerts.filter((a) => a.level === 'purple'));
  const totalPOQtyKg = mrpResults.reduce((sum, r) => sum + r.suggestedOrderQtyKg, 0);
  const totalFGGapPcs = mrpResults.reduce((sum, r) => sum + r.fgNetRequirementQty, 0);

  // Preset profiles
  const applyPreset = (presetName: 'balance' | 'resilience' | 'lean') => {
    if (presetName === 'balance') {
      setParams(DEFAULT_SYSTEM_PARAMETERS);
      onNotify('已套用【PRD 標準平衡模式】參數！', 'success');
    } else if (presetName === 'resilience') {
      setParams({
        ...params,
        shortageAlertBufferDays: 30,
        overstockMultiplier: 2.0,
        capacityBufferDays: 3,
        cavityAlertThresholdPercent: 100,
        multiMoldStrategy: 'conservative_max_weight',
        demandConsumptionMode: 'additive',
        dailyOperatingHours: 24.0,
        defaultSortingYield: 0.97,
        defaultMfgScrapRate: 0.04,
        safetyStockMultiplier: 1.25
      });
      onNotify('已套用【高安全抗斷線模式】（30天下單預警、1.25x 安全庫存）！', 'success');
    } else if (presetName === 'lean') {
      setParams({
        ...params,
        shortageAlertBufferDays: 7,
        overstockMultiplier: 1.2,
        capacityBufferDays: 0,
        cavityAlertThresholdPercent: 90,
        multiMoldStrategy: 'lowest_weight',
        demandConsumptionMode: 'po_consume',
        dailyOperatingHours: 24.0,
        defaultSortingYield: 0.99,
        defaultMfgScrapRate: 0.02,
        safetyStockMultiplier: 0.8
      });
      onNotify('已套用【精實低庫存模式】（7天預警、訂單沖銷、0.8x 安全庫存）！', 'success');
    }
  };

  const handleResetToPRD = () => {
    if (window.confirm('確定要將所有系統運算參數與告警門檻還原回 PRD 原廠標準預設值嗎？')) {
      setParams(DEFAULT_SYSTEM_PARAMETERS);
      onNotify('已成功還原回 PRD 標準預設參數！', 'success');
    }
  };

  const handleExportParamsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(params, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PMS_System_Parameters_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify('已匯出系統參數設定檔 (.json)！', 'success');
  };

  const handleImportParamsJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed.shortageAlertBufferDays === 'number') {
          setParams({ ...DEFAULT_SYSTEM_PARAMETERS, ...parsed });
          onNotify('參數設定檔載入成功！', 'success');
        } else {
          onNotify('設定檔格式不相符', 'error');
        }
      } catch (err: any) {
        onNotify(`JSON 解析錯誤: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bento Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-950 text-purple-400 border border-purple-800/60 text-sm font-bold px-2.5 py-0.5 rounded-md font-mono">
              SYSTEM CONFIGURATION MATRIX
            </span>
            <span className="text-sm text-slate-500">動態業務規則與告警門檻</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            系統運算參數與排程規則設定中心
          </h2>
          <p className="text-sm text-slate-400 mt-0.5 max-w-2xl">
            提供用戶自主配置「採購下單警戒天數」、「防爆倉呆滯倍數」、「多模備料選模策略」、「需求沖銷模式」與「每日有效工時」，設定即時反應於全系統推導。
          </p>
        </div>

        {/* Quick Action Presets & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-sm">
            <span className="text-[11px] text-slate-500 px-2 font-medium">快捷情境:</span>
            <button
              onClick={() => applyPreset('balance')}
              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition-colors"
              title="PRD 標準平衡模式"
            >
              標準平衡
            </button>
            <button
              onClick={() => applyPreset('resilience')}
              className="px-2.5 py-1.5 rounded-lg hover:bg-purple-950/60 text-purple-300 font-medium transition-colors"
              title="高安全防斷線模式 (30天預警/1.25x庫存)"
            >
              高防斷線
            </button>
            <button
              onClick={() => applyPreset('lean')}
              className="px-2.5 py-1.5 rounded-lg hover:bg-emerald-950/60 text-emerald-300 font-medium transition-colors"
              title="精實低庫存模式 (7天預警/訂單沖銷)"
            >
              精實 JIT
            </button>
          </div>

          <button
            onClick={handleResetToPRD}
            id="settings-reset-prd-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="還原原廠 PRD 預設參數"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置預設</span>
          </button>

          <button
            onClick={handleExportParamsJSON}
            id="settings-export-json-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-colors"
            title="匯出設定檔"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯出參數</span>
          </button>

          <label className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer transition-colors">
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>匯入</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportParamsJSON}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Live Impact Telemetry Bar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              即時參數影響推演 (Real-Time Impact Simulation)
            </span>
          </div>
          <span className="text-sm text-slate-400 font-mono">
            目前監控 {mrpResults.length} 項成品品號
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-red-900/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">缺料紅燈危機</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <div className="text-xl font-bold font-mono text-red-400 mt-1">
              {redAlerts.length}{' '}
              <span className="text-sm font-normal text-slate-500">筆品號</span>
            </div>
            <span className="text-sm text-slate-500">
              下單期 &le; {params.shortageAlertBufferDays} 天
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-amber-900/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">超備/爆倉預警</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {yellowAlerts.length}{' '}
              <span className="text-sm font-normal text-slate-500">筆品號</span>
            </div>
            <span className="text-sm text-slate-500">
              供需比 &gt; {params.overstockMultiplier}x | 倉容 {params.defaultWarehouseCapacityKg?.toLocaleString()} KG
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-purple-900/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">產能紫燈告警</span>
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-1">
              {purpleAlerts.length}{' '}
              <span className="text-sm font-normal text-slate-500">筆品號</span>
            </div>
            <span className="text-sm text-slate-500">
              日工時 {params.dailyOperatingHours}h
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">全廠成品總缺口</span>
              <Boxes className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-blue-400 mt-1">
              {totalFGGapPcs.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">PCS</span>
            </div>
            <span className="text-sm text-slate-500">
              模式: {params.demandConsumptionMode === 'additive' ? '疊加' : '沖銷'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">建議總採購量</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {totalPOQtyKg.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">KG</span>
            </div>
            <span className="text-sm text-slate-500">
              安全係數 {params.safetyStockMultiplier}x
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'all'
              ? 'bg-pms-iso-bg text-pms-iso border-pms-iso shadow-xs dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-pms-bg-subtle dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>全體參數總覽 (All Settings)</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-pms-alert-bg text-pms-alert border-pms-alert shadow-xs dark:bg-red-950/60 dark:text-red-300 dark:border-red-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-pms-bg-subtle dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>預警與風險門檻 (Alert Thresholds)</span>
        </button>

        <button
          onClick={() => setActiveTab('mrp')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'mrp'
              ? 'bg-pms-cobalt-light text-pms-cobalt border-pms-cobalt shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-pms-bg-subtle dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>MRP 運算與排程策略 (Calculation Strategies)</span>
        </button>

        <button
          onClick={() => setActiveTab('yield')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'yield'
              ? 'bg-pms-pass-bg text-pms-pass border-pms-pass shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-pms-bg-subtle dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>全局良率與供應商基準 (Global Baselines)</span>
        </button>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: 預警與風險門檻 (6 Cols or Full) */}
        {(activeTab === 'all' || activeTab === 'alerts') && (
          <div className="lg:col-span-6 bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  預警引擎與風險判定門檻 (Alert Thresholds)
                </h3>
                <p className="text-sm text-slate-400">
                  控制缺料紅燈警戒天數、防爆倉倍數與塞穴告警靈敏度
                </p>
              </div>
            </div>

            {/* Parameter 1.1: Shortage Alert Days */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>採購緊急警戒天數 (Shortage Alert Days)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={params.shortageAlertBufferDays}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        shortageAlertBufferDays: Math.max(1, Number(e.target.value))
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-red-400 text-sm focus:outline-hidden focus:border-red-500"
                  />
                  <span className="text-sm text-slate-400">天</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={params.shortageAlertBufferDays}
                onChange={(e) =>
                  setParams({
                    ...params,
                    shortageAlertBufferDays: Number(e.target.value)
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                當「距離最晚下單日 &le; <strong>{params.shortageAlertBufferDays} 天</strong>」或已逾期時，系統觸發 🔴 缺料採購警戒通知。（PRD 標準: 15天）
              </p>
            </div>

            {/* Parameter 1.2: Overstock Multiplier */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>供需超備 / 呆滯料倍數門檻 (Overstock Multiplier)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={params.overstockMultiplier}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        overstockMultiplier: Number(e.target.value)
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-amber-400 text-sm focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="text-sm text-slate-400">倍</span>
                </div>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={params.overstockMultiplier}
                onChange={(e) =>
                  setParams({
                    ...params,
                    overstockMultiplier: Number(e.target.value)
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                當「原料庫存 + 在途量 &gt; 需求量 &times; <strong>{params.overstockMultiplier} 倍</strong>」時，觸發 🟡 供需超備與呆滯料過剩警示。（PRD 標準: 1.6倍）
              </p>
            </div>

            {/* Parameter 1.2b: Warehouse Physical Capacity Limit */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>預設單項原料實體倉容上限 (Warehouse Capacity Limit)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={params.defaultWarehouseCapacityKg || 12000}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        defaultWarehouseCapacityKg: Number(e.target.value)
                      })
                    }
                    className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-orange-400 text-sm focus:outline-hidden focus:border-orange-500"
                  />
                  <span className="text-sm text-slate-400">KG</span>
                </div>
              </div>
              <input
                type="range"
                min="3000"
                max="30000"
                step="1000"
                value={params.defaultWarehouseCapacityKg || 12000}
                onChange={(e) =>
                  setParams({
                    ...params,
                    defaultWarehouseCapacityKg: Number(e.target.value)
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                當「原料庫存 + 在途總量 &gt; 實體倉容上限 <strong>{(params.defaultWarehouseCapacityKg || 12000).toLocaleString()} KG</strong>」時，觸發 🟠 實體倉容超載爆倉預警。（可在主檔依品號個別覆蓋）
              </p>
            </div>

            {/* Parameter 1.3: Capacity Deficit Buffer Days */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>產能排產安全裕度天數 (Capacity Safety Buffer)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={params.capacityBufferDays}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        capacityBufferDays: Math.max(0, Number(e.target.value))
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-purple-400 text-sm focus:outline-hidden focus:border-purple-500"
                  />
                  <span className="text-sm text-slate-400">天</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={params.capacityBufferDays}
                onChange={(e) =>
                  setParams({
                    ...params,
                    capacityBufferDays: Number(e.target.value)
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                當「連續生產所需天數 + <strong>{params.capacityBufferDays} 天安全裕度</strong> &gt; 距離交期天數」時，觸發 🟣 產能不足排產警報。（PRD 標準: 0天）
              </p>
            </div>

            {/* Parameter 1.4: Cavity Alert Threshold */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>模具妥善率告警門檻 (Cavity Alert Threshold)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={params.cavityAlertThresholdPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        cavityAlertThresholdPercent: Number(e.target.value)
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-indigo-400 text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={params.cavityAlertThresholdPercent}
                onChange={(e) =>
                  setParams({
                    ...params,
                    cavityAlertThresholdPercent: Number(e.target.value)
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                當「妥善穴數 / 設計穴數 &lt; <strong>{params.cavityAlertThresholdPercent}%</strong>」時提示塞穴維修警告。（預設 100%，即任一穴停用立即提醒）
              </p>
            </div>
          </div>
        )}

        {/* Section 2: MRP 運算與排程策略 (6 Cols or Full) */}
        {(activeTab === 'all' || activeTab === 'mrp') && (
          <div className="lg:col-span-6 bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  MRP 運算與排程策略 (Calculation Strategies)
                </h3>
                <p className="text-sm text-slate-400">
                  多模備料選模準則、需求沖銷邏輯與每日生產工時設定
                </p>
              </div>
            </div>

            {/* Parameter 2.1: Multi-Mold Selection Strategy */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <label className="text-sm font-bold text-white block">
                多模備料選模策略 (Multi-Mold Strategy)
              </label>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-start space-x-3 transition-all ${
                    params.multiMoldStrategy === 'conservative_max_weight'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="multiMoldStrategy"
                    value="conservative_max_weight"
                    checked={params.multiMoldStrategy === 'conservative_max_weight'}
                    onChange={() =>
                      setParams({ ...params, multiMoldStrategy: 'conservative_max_weight' })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-white flex items-center space-x-1.5">
                      <span>保守最重克重原則 (Conservative Max Weight)</span>
                      <span className="text-[10px] bg-pms-cobalt-light dark:bg-blue-950/60 text-pms-cobalt dark:text-blue-300 border border-pms-cobalt-border dark:border-blue-800/60 px-1.5 py-0.5 rounded font-mono font-bold">
                        PRD 預設
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      當品號有多副模具時，自動取<strong>單穴克重最大</strong>之模具進行備料推算，從源頭杜絕原料不足停線。
                    </p>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-start space-x-3 transition-all ${
                    params.multiMoldStrategy === 'primary_mold_only'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="multiMoldStrategy"
                    value="primary_mold_only"
                    checked={params.multiMoldStrategy === 'primary_mold_only'}
                    onChange={() =>
                      setParams({ ...params, multiMoldStrategy: 'primary_mold_only' })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-white">主模優先原則 (Primary Mold Only)</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      嚴格僅依據 BOM 中標記為 <code className="text-cyan-300">Is_Primary_Mold = TRUE</code> 之主模具參數計算。
                    </p>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer flex items-start space-x-3 transition-all ${
                    params.multiMoldStrategy === 'lowest_weight'
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="multiMoldStrategy"
                    value="lowest_weight"
                    checked={params.multiMoldStrategy === 'lowest_weight'}
                    onChange={() =>
                      setParams({ ...params, multiMoldStrategy: 'lowest_weight' })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-white">精實最輕原則 (Lowest Unit Weight)</div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      成本導向，取單穴克重最低之模具備料（適合原料單價極高之特用工程塑料）。
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Parameter 2.2: Demand Consumption Mode */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <label className="text-sm font-bold text-white block">
                需求沖銷與彙總模式 (Demand Calculation Mode)
              </label>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setParams({ ...params, demandConsumptionMode: 'additive' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    params.demandConsumptionMode === 'additive'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-bold">疊加模式 (Additive)</div>
                  <div className="text-[10px] opacity-80 mt-1">
                    Demand = Forecast + 實際 PO (PRD 標準)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setParams({ ...params, demandConsumptionMode: 'po_consume' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    params.demandConsumptionMode === 'po_consume'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-bold">訂單沖銷模式 (PO Consume)</div>
                  <div className="text-[10px] opacity-80 mt-1">
                    Demand = Max(Forecast, PO)
                  </div>
                </button>
              </div>
            </div>

            {/* Parameter 2.3: Daily Production Operating Hours */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>每日有效生產工時 (Daily Production Hours)</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={params.dailyOperatingHours}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        dailyOperatingHours: Math.min(24, Math.max(1, Number(e.target.value)))
                      })
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-cyan-300 text-sm focus:outline-hidden focus:border-blue-500"
                  />
                  <span className="text-sm text-slate-400">小時/天</span>
                </div>
              </div>

              {/* Quick Hours Buttons */}
              <div className="flex items-center space-x-2">
                {[
                  { label: '24h (三班全天)', val: 24 },
                  { label: '20h (雙班加班)', val: 20 },
                  { label: '16h (標準雙班)', val: 16 },
                  { label: '8h (單班制)', val: 8 }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setParams({ ...params, dailyOperatingHours: item.val })}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                      params.dailyOperatingHours === item.val
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                日產能公式: ({params.dailyOperatingHours * 3600} 秒 ÷ 成型週期) &times; 妥善穴數
              </div>
            </div>
          </div>
        )}

        {/* Section 3: 全局預設工藝與良率基準 (12 Cols or Full) */}
        {(activeTab === 'all' || activeTab === 'yield') && (
          <div className="lg:col-span-12 bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  全局預設工藝與良率基準 (Global Baselines)
                </h3>
                <p className="text-sm text-slate-400">
                  當料號良率主檔 (Yield Master) 或 BOM 未個別指定時之全廠標準套用值
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Default Sorting Yield */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white">
                    全檢標準良率預設值
                  </label>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {(params.defaultSortingYield * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.00"
                  step="0.005"
                  value={params.defaultSortingYield}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      defaultSortingYield: Number(e.target.value)
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[10px] text-slate-500">
                  折算 Sorting 待驗品 (WIP) 為有效良品供給
                </p>
              </div>

              {/* Default Scrap Rate */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white">
                    成型生產損耗率預設值
                  </label>
                  <span className="font-mono font-bold text-purple-400 text-sm">
                    {(params.defaultMfgScrapRate * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.10"
                  step="0.005"
                  value={params.defaultMfgScrapRate}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      defaultMfgScrapRate: Number(e.target.value)
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[10px] text-slate-500">
                  原料毛需求公式分母: (1 - 損耗率)
                </p>
              </div>

              {/* Default Lead Time */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white">
                    預設採購前置交期
                  </label>
                  <span className="font-mono font-bold text-cyan-400 text-sm">
                    {params.defaultProcurementLeadTimeDays} 天
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="5"
                  value={params.defaultProcurementLeadTimeDays}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      defaultProcurementLeadTimeDays: Number(e.target.value)
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <p className="text-[10px] text-slate-500">
                  供應商規則缺失時之國外海運預設前置期
                </p>
              </div>

              {/* Safety Stock Multiplier */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white">
                    安全庫存調節係數
                  </label>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {params.safetyStockMultiplier.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={params.safetyStockMultiplier}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      safetyStockMultiplier: Number(e.target.value)
                    })
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[10px] text-slate-500">
                  全廠安全庫存動態放大/縮減係數 (應對海運波動)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Affected SKUs Quick Drilldown Table */}
      <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              各品號在當前參數下之運算狀態速覽 (Parameters Impact Overview)
            </h3>
          </div>
          <span className="text-sm text-slate-500 font-mono">即時連動</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">品號 SKU</th>
                <th className="py-2.5 px-3">客戶</th>
                <th className="py-2.5 px-3">成品總需求</th>
                <th className="py-2.5 px-3">成品缺口</th>
                <th className="py-2.5 px-3">使用模具 / 妥善穴數</th>
                <th className="py-2.5 px-3">單穴克重</th>
                <th className="py-2.5 px-3">建議採購量</th>
                <th className="py-2.5 px-3">最晚下單日</th>
                <th className="py-2.5 px-3">狀態標籤</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {mrpResults.map((res) => {
                const isRed = res.alerts.some((a) => a.level === 'red');
                const isYellow = res.alerts.some((a) => a.level === 'yellow');
                const isPurple = res.alerts.some((a) => a.level === 'purple');

                return (
                  <tr key={res.sku} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white flex items-center space-x-1.5">
                      <span>{res.sku}</span>
                      <span className="text-[10px] font-normal text-slate-500 font-sans">
                        ({res.productName})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{res.customerId}</td>
                    <td className="py-3 px-3 text-slate-300">{res.totalDemandQty.toLocaleString()}</td>
                    <td className="py-3 px-3 font-bold text-cyan-300">{res.fgNetRequirementQty.toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {res.activeMoldId}{' '}
                      <span className="text-slate-500">
                        ({res.activeCavities}/{res.designCavities}穴)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-bold">{res.unitWeightG}g</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {res.suggestedOrderQtyKg > 0 ? `${res.suggestedOrderQtyKg.toLocaleString()} KG` : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {res.suggestedOrderDate}{' '}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          res.daysUntilLatestOrder <= params.shortageAlertBufferDays
                            ? 'bg-red-950 text-red-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {res.daysUntilLatestOrder}天
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1">
                        {isRed && (
                          <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/60 rounded text-[10px] font-sans font-semibold">
                            🔴 缺料
                          </span>
                        )}
                        {isYellow && (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800/60 rounded text-[10px] font-sans font-semibold">
                            🟡 呆滯
                          </span>
                        )}
                        {isPurple && (
                          <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-800/60 rounded text-[10px] font-sans font-semibold">
                            🟣 產能
                          </span>
                        )}
                        {!isRed && !isYellow && !isPurple && (
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded text-[10px] font-sans font-semibold">
                            🟢 正常
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {onNavigateToMRP && (
                        <button
                          onClick={() => onNavigateToMRP(res.sku)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-sans font-medium transition-colors"
                        >
                          查看 MRP
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
