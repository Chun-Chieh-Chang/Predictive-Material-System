/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Workflow,
  TrendingUp,
  Package,
  FileSpreadsheet,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Info,
  ExternalLink,
  ChevronRight,
  Sliders,
  Settings2,
  Cpu,
  Boxes,
  Truck,
  X,
  Zap,
  Activity,
  CalendarCheck,
  ShieldCheck,
  Calculator,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  SystemDatabase,
  SystemParameters,
} from '../types';
import { NavTab } from './Navbar';
import { calculateAllMRP } from '../utils/mrpEngine';

// ─── Scenario Definitions (頂部情境切換導覽卡) ──────────────────────────────
export type PipelineScenario = 'all' | 'sales' | 'procurement' | 'production' | 'axis1' | 'axis2';

interface ScenarioCard {
  id: PipelineScenario;
  role: string;
  action: string;
  desc: string;
  icon: React.ElementType;
  accentColor: string;
  activeBorder: string;
  activeBg: string;
}

const SCENARIOS: ScenarioCard[] = [
  {
    id: 'all',
    role: '全流程總覽',
    action: '⚡ 展示兩大核心主軸完整運算流程',
    desc: '主軸一：原物料備料補貨 → 主軸二：產品交期估算',
    icon: Workflow,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    activeBorder: 'border-indigo-600 dark:border-indigo-400 border-2',
    activeBg: 'from-indigo-100/90 to-purple-100/90 dark:from-indigo-950/70 dark:to-purple-950/70',
  },
  {
    id: 'axis1',
    role: '主軸一：原物料備料補貨',
    action: '📦 「要叫多少料？何時叫？」從需求反向扣抵手上的料',
    desc: '①算需求 → ②扣成品供給 → ③展開用料 → ④扣原料供給 → ⑤產生建議',
    icon: Package,
    accentColor: 'text-sky-600 dark:text-sky-400',
    activeBorder: 'border-sky-600 dark:border-sky-400 border-2',
    activeBg: 'from-sky-100/90 to-blue-100/90 dark:from-sky-950/70 dark:to-blue-950/70',
  },
  {
    id: 'axis2',
    role: '主軸二：產品交期估算',
    action: '🚚 「訂單來得及嗎？」以交期為基準，反向體檢五段時間',
    desc: '①折訂單 → ②產能體檢 → ③齊套體檢 → ④物流體檢 → ⑤綜合評分',
    icon: CalendarCheck,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-600 dark:border-emerald-400 border-2',
    activeBg: 'from-emerald-100/90 to-teal-100/90 dark:from-emerald-950/70 dark:to-teal-950/70',
  },
];

// ─── Workstation Node Interfaces ─────────────────────────────────────────────
export type NodeCategory = 'source' | 'sanitize' | 'mrp' | 'decision' | 'rule' | 'axis1' | 'axis2' | 'warning';

export interface WorkstationNode {
  id: string;
  name: string;
  subName: string;
  category: NodeCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  statusBadge: string;
  recordCountLabel: string;
  scenarios: PipelineScenario[];
  targetTab?: NavTab;
  responsibilities: string;
  formulaDescription: string;
  inputSchema: string[];
  outputSchema: string[];
  transformationRules: string[];
  liveData?: Record<string, string | number>;
  editableFields?: { key: string; label: string; unit?: string; max?: number }[];
  subNodes?: {
    id: string;
    name: string;
    sub: string;
    icon: React.ElementType;
    badge: string;
  }[];
}

export interface PipelineEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  badge?: string;
  scenarios: PipelineScenario[];
  dashed?: boolean;
}

// ── Formula Step Visualizer Types ──────────────────────────────────────────────
interface FormulaVariable {
  name: string;
  value: string;
  unit?: string;
  color?: string;
}
interface FormulaStepDef {
  id: string;
  icon: React.ElementType;
  title: string;
  formula: string;
  variables: FormulaVariable[];
  output: string;
  outputColor: string;
  outputUnit: string;
  /** 流向標籤：輸出到下一步的說明（顯示在箭頭上） */
  chainLabel: string;
  /** 輸入來源：上一步輸出對應至此步哪個變數（顯示在卡片頂部） */
  incomingLabel?: string;
  detailRows: { label: string; value: string }[];
  isWarning?: boolean;
  warningText?: string;
}

// ─── Editable Fields Sub-Component ────────────────────────────────────────────
const EditableFieldsSection: React.FC<{
  node: WorkstationNode;
  systemParameters: SystemParameters;
  onSave: (params: SystemParameters) => void;
}> = ({ node, systemParameters, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of node.editableFields || []) {
      const val = (systemParameters as unknown as Record<string, unknown>)[f.key];
      init[f.key] = val != null ? String(val) : '';
    }
    return init;
  });

  const handleSave = () => {
    const updated: Record<string, unknown> = { ...systemParameters };
    for (const f of node.editableFields || []) {
      const raw = values[f.key];
      if (raw === '') continue;
      const num = Number(raw);
      if (!isNaN(num)) updated[f.key] = num;
      else updated[f.key] = raw;
    }
    onSave(updated as unknown as SystemParameters);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium transition-all text-xs"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5" />
            編輯系統參數 ({node.editableFields.length} 個欄位)
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
        <Settings2 className="w-3.5 h-3.5 text-amber-500" />
        編輯系統參數
      </div>
      <div className="space-y-2">
        {node.editableFields!.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <label className="text-[0.8rem] text-slate-600 dark:text-slate-400 w-28 flex-shrink-0">{field.label}</label>
            <input
              type="number"
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
              max={field.max}
              step={field.unit === '%' ? '0.1' : '1'}
            />
            {field.unit && <span className="text-[0.8rem] text-slate-500 w-8">{field.unit}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
        >
          💾 儲存並重新計算
        </button>
        <button
          onClick={() => { setEditing(false); }}
          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
        >
          取消
        </button>
      </div>
      <p className="text-[0.75rem] text-slate-400 dark:text-slate-500">
        ⚠️ 修改後將觸發 MRP 重新運算，影響所有下游節點數據。
      </p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface DataPipelineViewProps {
  database: SystemDatabase;
  systemParameters: SystemParameters;
  onNavigateToTab: (tab: NavTab) => void;
  onDatabaseChange?: (db: SystemDatabase) => void;
  onSystemParametersChange?: (params: SystemParameters) => void;
}

// ── FormulaStepCard Component ──────────────────────────────────────────────────
const FormulaStepCard: React.FC<{
  step: FormulaStepDef;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}> = ({ step, expanded, onToggle, onSelect }) => {
  const warningClass = step.isWarning
    ? 'border-l-red-500 ring-1 ring-red-400/20'
    : 'border-l-emerald-500';
  return (
    <div
      onClick={onSelect}
      className={`
        relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800/80
        border-l-[4px] ${warningClass}
        shadow-sm hover:shadow-md
        transition-all duration-200 cursor-pointer
        ${expanded ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : ''}
      `}
    >
      {/* ── Input Source Header (輸入來源) ─────────────────────── */}
      {step.incomingLabel && (
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">輸入來源</span>
          <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400">{step.incomingLabel}</span>
        </div>
      )}
      {/* ── Card Header ─────────────────────────────────────────── */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold
          ${step.isWarning ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'}`}>
          {step.title.replace(/①|②|③|④|⑤/, '')}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate block">
            {step.title}
          </span>
          {/* ── Formula Line (variable-colored) ─────────────────── */}
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {step.formula.split(/(總需求|預估量|實單量|成品缺口|良品在庫|WIP|WIP有效|全檢良率|缺口|單穴克重|損耗率|原料毛需求|原料淨需求|毛需求|原料在庫|在途量|安全庫存|淨需求|MOQ|下單日|交期)/g).map((part, i) => {
              if (!part) return null;
              const varInfo = step.variables.find(v => part.includes(v.name));
              if (varInfo) return (
                <span key={i} className="font-bold px-0.5 rounded" style={{ color: varInfo.color }}>
                  {part}
                </span>
              );
              return <span key={i}>{part}</span>;
            })}
          </div>
        </div>
        {/* ── Expand Toggle ───────────────────────────────────── */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
            text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700
            transition-colors"
          title={expanded ? '收合' : '展開詳細運算'}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Variable Values ────────────────────────────────────── */}
      <div className="px-3 pb-1.5 flex flex-wrap gap-1.5">
        {step.variables.map((v, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700"
          >
            <span className="text-[9px] text-slate-500 dark:text-slate-400">{v.name}:</span>
            <span className="text-[10px] font-bold font-mono" style={{ color: v.color ?? '#3b82f6' }}>
              {v.value}{v.unit && <span className="text-[9px] text-slate-400 ml-0.5">{v.unit}</span>}
            </span>
          </div>
        ))}
      </div>

      {/* ── Output Row ─────────────────────────────────────────── */}
      <div className="mx-3 mb-2 px-2.5 py-1.5 rounded-lg"
        style={{ backgroundColor: `${step.outputColor}15`, border: `1px solid ${step.outputColor}30` }}>
        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">輸出結果 →</span>
        <span className="ml-1.5 text-[13px] font-extrabold font-mono" style={{ color: step.outputColor }}>
          {step.output}{step.outputUnit && <span className="text-[10px] font-medium text-slate-500 ml-1">{step.outputUnit}</span>}
        </span>
        {step.warningText && (
          <span className="ml-2 text-[10px] font-bold text-red-500 dark:text-red-400">{step.warningText}</span>
        )}
      </div>

      {/* ── Expanded Detail Panel ─────────────────────────────── */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700/60 pt-2.5 space-y-1.5">
          <span className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">運算步驟明細</span>
          {step.detailRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{row.label}</span>
              <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DataPipelineView: React.FC<DataPipelineViewProps> = ({
  database,
  systemParameters,
  onNavigateToTab,
  onDatabaseChange,
  onSystemParametersChange,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<PipelineScenario>('all');
  // Station Details 視窗：預設隱藏，滑鼠懸停工作站卡片顯示、離開即隱藏（250ms 緩衝供滑入面板接續操作）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const stationHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearStationHideTimer = () => {
    if (stationHideTimerRef.current) {
      clearTimeout(stationHideTimerRef.current);
      stationHideTimerRef.current = null;
    }
  };
  const scheduleStationHide = () => {
    clearStationHideTimer();
    stationHideTimerRef.current = setTimeout(() => setSelectedNodeId(null), 250);
  };
  const [zoomLevel, setZoomLevel] = useState<number>(0.92);
  const [expandedFormulaSteps, setExpandedFormulaSteps] = useState<Set<string>>(new Set());
  const toggleFormulaStep = (id: string) => {
    setExpandedFormulaSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleNodeSelect = (id: string) => { setSelectedNodeId(id); };
  const [isDynamicFlowActive, setIsDynamicFlowActive] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStepIndex, setSimulationStepIndex] = useState<number>(-1);
  const simulationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Floating Inspector Window (懸浮檢視窗：可拖曳) ──────────────────────────
  const [inspectorPos, setInspectorPos] = useState<{ x: number; y: number } | null>(null);
  const inspectorHostRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const inspectorDragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const inspectorPosRef = useRef<{ x: number; y: number } | null>(null);
  inspectorPosRef.current = inspectorPos;

  const handleInspectorDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const host = inspectorHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const pos = inspectorPosRef.current ?? {
      x: rect.width - (inspectorRef.current?.offsetWidth || 420) - 12,
      y: 12,
    };
    inspectorDragOffsetRef.current = {
      dx: e.clientX - rect.left - pos.x,
      dy: e.clientY - rect.top - pos.y,
    };
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!inspectorDragOffsetRef.current) return;
      const host = inspectorHostRef.current;
      const win = inspectorRef.current;
      if (!host || !win) return;
      const rect = host.getBoundingClientRect();
      const w = win.offsetWidth;
      const nextX = Math.min(
        Math.max(e.clientX - rect.left - inspectorDragOffsetRef.current.dx, 8),
        Math.max(rect.width - w - 8, 8)
      );
      const nextY = Math.min(
        Math.max(e.clientY - rect.top - inspectorDragOffsetRef.current.dy, 8),
        Math.max(rect.height - 52, 8)
      );
      setInspectorPos({ x: nextX, y: nextY });
    };
    const onPointerUp = () => {
      inspectorDragOffsetRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Compute live counts from database
  const liveStats = useMemo(() => {
    const itemCount = database.item_master?.length || 0;
    const forecastCount = database.demand_forecast_log?.length || 0;
    const orderCount = database.actual_order?.length || 0;
    const poCount = database.po_in_transit?.length || 0;
    const invRawCount = database.inventory_wip_snapshot?.length || 0;
    const mrpResults = calculateAllMRP(database, undefined, systemParameters);
    const shortageCount = mrpResults.filter((r) => r.alerts?.some((a) => a.type === 'shortage' || a.level === 'red')).length;
    const prCount = mrpResults.filter((r) => (r.suggestedOrderQtyKg || 0) > 0).length;
    return {
      itemCount,
      forecastCount,
      orderCount,
      poCount,
      invRawCount,
      shortageCount,
      prCount,
    };
  }, [database, systemParameters]);

  // ── Per-node live computed data (SSOT: reads from db, mirrors mrpEngine.ts) ──
  const nodeLiveData = useMemo(() => {
    const results = calculateAllMRP(database, undefined, systemParameters);
    const totalForecastKg = database.demand_forecast_log?.reduce((s, f) => s + (f.demand_qty ?? 0), 0) || 0;
    const totalOrderKg = database.actual_order?.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.order_qty ?? 0), 0) || 0;
    const totalDemandKg = totalForecastKg + totalOrderKg;

    const fgReadyKg = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.fg_ready_qty ?? 0), 0) || 0;
    const wipPendingKg = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.wip_pending_qty ?? 0), 0) || 0;

    const totalPoKg = database.po_in_transit?.reduce((s, p) => s + (p.in_transit_qty_kg ?? 0), 0) || 0;
    const totalRmOnHandKg = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.rm_on_hand_kg ?? 0), 0) || 0;

    const avgLeadTime = results.length > 0
      ? Math.round(results.reduce((s, r) => s + (r.leadTimeDays || 0), 0) / results.length)
      : 0;
    const totalSuggestedQtyKg = results.reduce((s, r) => s + (r.suggestedOrderQtyKg || 0), 0);
    const totalGrossReqKg = results.reduce((s, r) => s + (r.rmGrossRequirementKg || 0), 0);
    const totalNetReqKg = results.reduce((s, r) => s + (r.rmNetRequirementKg || 0), 0);

    const daysUntilOrder = results.length > 0
      ? Math.round(results.reduce((s, r) => s + (r.daysUntilLatestOrder || 0), 0) / results.length)
      : 0;

    return {
      totalDemandKg,
      fgReadyKg,
      wipPendingKg,
      totalPoKg,
      totalRmOnHandKg,
      avgLeadTime,
      totalSuggestedQtyKg,
      totalGrossReqKg,
      totalNetReqKg,
      daysUntilOrder,
      shortageCount: results.filter((r) => r.alerts?.some((a) => a.level === 'red')).length,
      overstockCount: results.filter((r) => r.alerts?.some((a) => a.type === 'overstock')).length,
      overcapacityCount: results.filter((r) => r.alerts?.some((a) => a.type === 'warehouse_overcapacity')).length,
    };
  }, [database, systemParameters]);

  // ── Formula Visualizer Data ───────────────────────────────────────────────────
  // 主軸一①②：PCS（需求/缺口以件數計）
  const totalForecastPcs = database.demand_forecast_log?.reduce((s, f) => s + (f.demand_qty ?? 0), 0) || 0;
  const totalOrderPcs = database.actual_order?.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.order_qty ?? 0), 0) || 0;
  const totalDemandPcs = totalForecastPcs + totalOrderPcs;
  const fgReadyPcs = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.fg_ready_qty ?? 0), 0) || 0;
  const wipPendingPcs = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.wip_pending_qty ?? 0), 0) || 0;

  // 主軸一③：PCS → KG 轉換（用 engine 結果的平均單穴克重）
  const results = calculateAllMRP(database, undefined, systemParameters);
  const avgSortingYield = results.length > 0
    ? results.reduce((s, r) => s + (r.sortingYield || 0), 0) / Math.max(1, results.length)
    : 0.98;
  const avgScrapRate = results.length > 0
    ? results.reduce((s, r) => s + (r.stdScrapRate || 0), 0) / Math.max(1, results.length)
    : 0;
  const avgUnitWeightG = results.length > 0
    ? results.reduce((s, r) => s + (r.unitWeightG || 0), 0) / Math.max(1, results.length)
    : 0;
  const wipEffectivePcs = wipPendingPcs * avgSortingYield;
  const fgNetReqPcs = Math.max(0, totalDemandPcs - fgReadyPcs - wipEffectivePcs);
  const scrapRate = avgScrapRate * 100;
  const rmGrossKg = fgNetReqPcs > 0
    ? (fgNetReqPcs * avgUnitWeightG) / 1000 / (1 - avgScrapRate)
    : 0;

  // 主軸一④⑤：KG
  const rmOnHandKg = database.inventory_wip_snapshot?.reduce((s, v) => s + (v.rm_on_hand_kg ?? 0), 0) || 0;
  const rmInTransitKg = database.po_in_transit?.reduce((s, p) => s + (p.in_transit_qty_kg ?? 0), 0) || 0;
  const safetyStockKg = results.reduce((s, r) => s + ((r.safetyStockKg || 0) * (systemParameters.safetyStockMultiplier || 1)), 0);
  const rmNetReqKg = Math.max(0, rmGrossKg - rmOnHandKg - rmInTransitKg + safetyStockKg);
  const prQtyKg = results.reduce((s, r) => s + (r.suggestedOrderQtyKg || 0), 0);
  const shortageCount = results.filter((r) => r.alerts?.some((a) => a.level === 'red')).length;
  const overstockCount = results.filter((r) => r.alerts?.some((a) => a.type === 'overstock')).length;
  const overcapacityCount = results.filter((r) => r.alerts?.some((a) => a.type === 'warehouse_overcapacity')).length;
  const yieldPct = (avgSortingYield * 100).toFixed(0);
  const avgLeadTime = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.leadTimeDays || 0), 0) / results.length)
    : 0;

  const axis1Steps: FormulaStepDef[] = [
    {
      id: 'ax1_1',
      icon: Calculator,
      title: '① 算需求',
      formula: '總需求 = 預估量 + 實單量',
      chainLabel: '總需求',
      variables: [
        { name: '預估量', value: `${totalForecastPcs}`, unit: 'PCS', color: '#0ea5e9' },
        { name: '實單量', value: `${totalOrderPcs}`, unit: 'PCS', color: '#6366f1' },
      ],
      output: `${totalDemandPcs}`,
      outputColor: '#0ea5e9',
      outputUnit: 'PCS',
      detailRows: [
        { label: '總模式', value: `${systemParameters.demandConsumptionMode ?? 'forecast_only'}` },
        { label: '預估量', value: `${totalForecastPcs} PCS` },
        { label: '實單量', value: `${totalOrderPcs} PCS` },
        { label: '有效訂單', value: `${database.actual_order?.filter(o => o.status !== 'cancelled').length ?? 0} 筆` },
      ],
    },
    {
      id: 'ax1_2',
      icon: Boxes,
      title: '② 扣成品供給',
      formula: '成品缺口 = Max(0, 總需求 − 良品在庫 − WIP×良率)',
      incomingLabel: '總需求',
      chainLabel: '成品缺口',
      variables: [
        { name: '總需求', value: `${totalDemandPcs}`, unit: 'PCS', color: '#0ea5e9' },
        { name: '良品在庫', value: `${fgReadyPcs}`, unit: 'PCS', color: '#10b981' },
        { name: 'WIP 待驗', value: `${wipPendingPcs}`, unit: 'PCS', color: '#06b6d4' },
        { name: '全檢良率', value: `${yieldPct}`, unit: '%', color: '#8b5cf6' },
      ],
      output: fgNetReqPcs > 0 ? `${fgNetReqPcs}` : '0',
      outputColor: fgNetReqPcs > 0 ? '#f43f5e' : '#94a3b8',
      outputUnit: 'PCS',
      detailRows: [
        { label: 'WIP 有效', value: `${wipEffectivePcs} PCS` },
        { label: '計算式', value: `Max(0, ${totalDemandPcs} − ${fgReadyPcs} − ${wipEffectivePcs})` },
      ],
      isWarning: fgNetReqPcs > 0,
      warningText: fgNetReqPcs > 0 ? `缺口 ${fgNetReqPcs} PCS，需補貨` : undefined,
    },
    {
      id: 'ax1_3',
      icon: Package,
      title: '③ 展開用料',
      formula: '原料毛需求(KG) = 缺口(PCS) × 單穴克重(g) ÷ 1000 ÷ (1 − 損耗率)',
      incomingLabel: '成品缺口(PCS)',
      chainLabel: '原料毛需求(KG)',
      variables: [
        { name: '缺口(PCS)', value: `${fgNetReqPcs}`, unit: 'PCS', color: '#3b82f6' },
        { name: '單穴克重', value: `${avgUnitWeightG.toFixed(0)}`, unit: 'g', color: '#f59e0b' },
        { name: '損耗率', value: `${scrapRate.toFixed(1)}`, unit: '%', color: '#f59e0b' },
      ],
      output: `${rmGrossKg.toFixed(1)} KG`,
      outputColor: '#f59e0b',
      outputUnit: 'KG',
      detailRows: [
        { label: 'BOM 階層', value: '3 階推導中' },
        { label: '計算式', value: `${fgNetReqPcs} × ${avgUnitWeightG.toFixed(0)} ÷ 1000 ÷ ${(1 - avgScrapRate).toFixed(3)}` },
      ],
    },
    {
      id: 'ax1_4',
      icon: ShieldCheck,
      title: '④ 扣原料供給',
      formula: '淨需求(KG) = Max(0, 毛需求 − 在庫 − 在途 + 安全庫存×倍率)',
      incomingLabel: '原料毛需求(KG)',
      chainLabel: '原料淨缺口(KG)',
      variables: [
        { name: '毛需求', value: `${rmGrossKg.toFixed(1)}`, unit: 'KG', color: '#f59e0b' },
        { name: '原料在庫', value: `${rmOnHandKg.toFixed(1)}`, unit: 'KG', color: '#10b981' },
        { name: '在途 PO', value: `${rmInTransitKg.toFixed(1)}`, unit: 'KG', color: '#8b5cf6' },
        { name: '安全庫存×倍率', value: `${safetyStockKg.toFixed(1)}`, unit: 'KG', color: '#64748b' },
      ],
      output: rmNetReqKg > 0 ? `${rmNetReqKg.toFixed(1)} KG` : '0 KG',
      outputColor: rmNetReqKg > 0 ? '#f43f5e' : '#94a3b8',
      outputUnit: '',
      detailRows: [
        { label: '安全庫存倍率', value: `${(systemParameters.safetyStockMultiplier || 1).toFixed(1)}×` },
        { label: '計算式', value: `Max(0, ${rmGrossKg.toFixed(1)} − ${rmOnHandKg.toFixed(1)} − ${rmInTransitKg.toFixed(1)} + ${safetyStockKg.toFixed(1)})` },
      ],
      isWarning: rmNetReqKg > 0,
      warningText: rmNetReqKg > 0 ? `淨缺口 ${rmNetReqKg.toFixed(1)} KG` : undefined,
    },
    {
      id: 'ax1_5',
      icon: TrendingUp,
      title: '⑤ 產生建議',
      formula: '淨需求 > 0 → 進位至 MOQ 倍數；最晚下單日 = 交期 − 採購交期',
      incomingLabel: '原料淨缺口(KG)',
      chainLabel: '採購建議(PR)',
      variables: [
        { name: '淨需求', value: `${rmNetReqKg.toFixed(1)}`, unit: 'KG', color: rmNetReqKg > 0 ? '#f43f5e' : '#94a3b8' },
        { name: 'MOQ 單價', value: results.length > 0 ? `${results[0].moqKg ?? 0}` : '—', unit: 'KG', color: '#10b981' },
        { name: '採購交期', value: avgLeadTime > 0 ? `${avgLeadTime}` : '—', unit: '天', color: '#f97316' },
      ],
      output: `${prQtyKg.toFixed(1)} KG`,
      outputColor: '#10b981',
      outputUnit: 'KG',
      detailRows: [
        { label: 'PR 建議量', value: `${prQtyKg.toFixed(1)} KG` },
        { label: '觸發條件', value: rmNetReqKg > 0 ? '淨需求 > 0，已觸發' : '淨需求 = 0，未觸發' },
        { label: '交期倒推', value: avgLeadTime > 0 ? `${avgLeadTime} 天` : '—' },
      ],
      isWarning: shortageCount > 0,
      warningText: shortageCount > 0 ? `🔴 ${shortageCount} 項逾期` : undefined,
    },
  ];

  const axis2Steps: FormulaStepDef[] = [
    {
      id: 'ax2_1',
      icon: FileSpreadsheet,
      title: '① 折訂單',
      formula: '成品缺口 = 訂單量 − 現貨 − WIP有效',
      incomingLabel: '總需求',
      chainLabel: '成品缺口(PCS)',
      variables: [
        { name: '訂單量', value: `${totalOrderPcs}`, unit: 'PCS', color: '#6366f1' },
        { name: '現貨', value: `${fgReadyPcs}`, unit: 'PCS', color: '#10b981' },
        { name: 'WIP 有效', value: `${wipEffectivePcs}`, unit: 'PCS', color: '#06b6d4' },
      ],
      output: `${fgNetReqPcs} PCS`,
      outputColor: fgNetReqPcs > 0 ? '#3b82f6' : '#94a3b8',
      outputUnit: 'PCS',
      detailRows: [
        { label: '計算式', value: `${totalOrderPcs} − ${fgReadyPcs} − ${wipEffectivePcs}` },
      ],
    },
    {
      id: 'ax2_2',
      icon: Activity,
      title: '② 產能體檢',
      formula: '所需天數 = 缺口 ÷ 日產能；> 距交期天數 → 紫燈',
      incomingLabel: '成品缺口(PCS)',
      chainLabel: '所需生產天數',
      variables: [
        { name: '缺口(PCS)', value: `${fgNetReqPcs}`, unit: 'PCS', color: '#3b82f6' },
        { name: '日產能', value: results.length > 0 ? `${Math.max(1, results[0].dailyCapacityPcs)}` : '—', unit: 'PCS/天', color: '#10b981' },
      ],
      output: results.length > 0 && results[0].requiredProdDays
        ? `${Math.ceil(results[0].requiredProdDays)} 天`
        : '—',
      outputColor: '#8b5cf6',
      outputUnit: '天',
      detailRows: [
        { label: '模具參數', value: results.length > 0 ? `${results[0].activeCavities ?? '—'} 穴` : '—' },
        { label: '週期時間', value: results.length > 0 ? `${results[0].cycleTimeSec ?? '—'} 秒` : '—' },
      ],
    },
    {
      id: 'ax2_3',
      icon: Zap,
      title: '③ 齊套體檢',
      formula: '原料不足 → 紅燈（沿主軸④計算）',
      incomingLabel: '原料淨缺口(KG)',
      chainLabel: '齊套狀態',
      variables: [
        { name: '淨缺口(KG)', value: `${rmNetReqKg.toFixed(1)}`, unit: 'KG', color: rmNetReqKg > 0 ? '#f43f5e' : '#94a3b8' },
        { name: '逾期項目', value: `${shortageCount}`, unit: '項', color: '#f43f5e' },
      ],
      output: shortageCount > 0 ? `🔴 ${shortageCount} 項逾期` : '✅ 齊套',
      outputColor: shortageCount > 0 ? '#f43f5e' : '#10b981',
      outputUnit: '',
      detailRows: [
        { label: '計算基準', value: '沿主軸一④ 淨缺口' },
        { label: '逾期未達', value: `${shortageCount} 項` },
      ],
      isWarning: shortageCount > 0,
    },
    {
      id: 'ax2_4',
      icon: Truck,
      title: '④ 物流體檢',
      formula: '海運交期倒推 + 在途船期延誤 → 橘燈',
      incomingLabel: '原料淨缺口(KG)',
      chainLabel: '物流風險',
      variables: [
        { name: '平均交期', value: avgLeadTime > 0 ? `${avgLeadTime}` : '—', unit: '天', color: '#f97316' },
        { name: '在途 PO', value: `${rmInTransitKg.toFixed(1)}`, unit: 'KG', color: '#8b5cf6' },
      ],
      output: avgLeadTime > 60 ? '🟠 潛在延誤' : '✅ 正常',
      outputColor: avgLeadTime > 60 ? '#f97316' : '#10b981',
      outputUnit: '',
      detailRows: [
        { label: '海運交期範圍', value: '90 ~ 150 天' },
        { label: '在途合計', value: `${rmInTransitKg.toFixed(1)} KG` },
      ],
      isWarning: avgLeadTime > 60,
    },
    {
      id: 'ax2_5',
      icon: TrendingUp,
      title: '⑤ 綜合評分',
      formula: '緊張指數：紅 ≥ 95 / 紫 ≥ 75 / 黃 ≥ 50 / 正常 < 10',
      variables: [
        { name: '紅警', value: `${shortageCount}`, unit: '項', color: '#f43f5e' },
        { name: '黃警', value: `${overstockCount}`, unit: '項', color: '#f59e0b' },
        { name: '橘警', value: `${overcapacityCount}`, unit: '項', color: '#f97316' },
      ],
      output: shortageCount > 0 ? '⚠️ 需關注' : '✅ 正常',
      outputColor: shortageCount > 0 ? '#f43f5e' : '#10b981',
      outputUnit: '',
      chainLabel: '',
      detailRows: [
        { label: '紅警（逾期 ≤15 天）', value: `${shortageCount} 項` },
        { label: '黃警（備料 > 1.6 倍）', value: `${overstockCount} 項` },
        { label: '橘警（超倉 > 12K KG）', value: `${overcapacityCount} 項` },
      ],
      isWarning: shortageCount > 0 || overstockCount > 0 || overcapacityCount > 0,
    },
  ];

  // ── Two-Axis Workflow Nodes (kept for inspector) ─────────────────────────────
  const WORKSTATION_NODES: WorkstationNode[] = useMemo(
    () => [
      // ═══════════════════════════════════════════════════════════════════
      // 主軸一：原物料備料補貨  (Row 1, y=70)
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'ax1_step1',
        name: '① 算需求',
        subName: '總需求 = 預估量 + 實單量（四種總模式擇一）',
        category: 'axis1',
        x: 40, y: 70, width: 280, height: 110,
        icon: Calculator,
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30',
        iconColor: 'text-sky-500',
        statusBadge: '需求鎖定',
        recordCountLabel: `${liveStats.orderCount} 筆實單`,
        scenarios: ['all', 'axis1', 'axis2'],
        targetTab: 'sales_workbench',
        responsibilities: '彙整業務滾動預測與正式銷售訂單，依據需求總模式計算總需求。',
        formulaDescription: '總需求 = 預估量 + 實單量（模式依 demandConsumptionMode 切換）',
        inputSchema: ['demand_forecast_log', 'actual_order'],
        outputSchema: ['Total Demand Qty (KG)'],
        transformationRules: ['rollup 按月/週分段計算', '已取消訂單自動排除'],
        liveData: {
          '總需求': `${(nodeLiveData.totalDemandKg / 1000).toFixed(1)} KG`,
          '預估量': `${(nodeLiveData.totalDemandKg - (database.actual_order?.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.order_qty ?? 0), 0) || 0)) / 1000} KG`,
          '實單量': `${((database.actual_order?.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.order_qty ?? 0), 0) || 0)) / 1000} KG`,
        },
        editableFields: [
          { key: 'demandConsumptionMode', label: '需求總模式', unit: '' },
        ],
      },
      {
        id: 'ax1_step2',
        name: '② 扣成品供給',
        subName: '成品缺口 = Max(0, 總需求 − 良品在庫 − WIP待驗×良率)',
        category: 'axis1',
        x: 360, y: 70, width: 280, height: 110,
        icon: Boxes,
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30',
        iconColor: 'text-sky-500',
        statusBadge: '缺口推導',
        recordCountLabel: `${liveStats.invRawCount} 筆庫存`,
        scenarios: ['all', 'axis1', 'axis2'],
        targetTab: 'data_tables',
        responsibilities: '從總需求中扣抵現有良品在庫與 WIP 待驗良品，得出真正需要生產的成品缺口。',
        formulaDescription: '成品缺口 = Max(0, 總需求 − 良品在庫 − WIP待驗 × std_sorting_yield)',
        inputSchema: ['inventory_wip_snapshot (FG/WIP tier)'],
        outputSchema: ['FG Net Requirement Qty (PCS)'],
        transformationRules: ['WIP 待驗良品 = WIP數量 × 標準全檢良率', '良品在庫優先扣抵'],
        liveData: {
          '成品缺口': `${Math.max(0, nodeLiveData.totalDemandKg - nodeLiveData.fgReadyKg - nodeLiveData.wipPendingKg).toFixed(1)} KG`,
          '良品在庫': `${nodeLiveData.fgReadyKg.toFixed(1)} KG`,
          'WIP待驗': `${nodeLiveData.wipPendingKg.toFixed(1)} KG`,
        },
        editableFields: [
          { key: 'std_sorting_yield', label: '標準全檢良率', unit: '%', max: 100 },
        ],
      },
      {
        id: 'ax1_step3',
        name: '③ 展開用料',
        subName: '原料毛需求 = 缺口 × 單穴克重 ÷ 1000 ÷ (1 − 損耗率)',
        category: 'axis1',
        x: 680, y: 70, width: 280, height: 110,
        icon: Package,
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30',
        iconColor: 'text-sky-500',
        statusBadge: 'BOM 展開',
        recordCountLabel: '3 階推導中',
        scenarios: ['all', 'axis1', 'axis2'],
        targetTab: 'mrp_calculator',
        responsibilities: '根據成品缺口與 BOM 結構展開為原料毛需求，並處理色母配比修正。',
        formulaDescription: '原料毛需求(KG) = [缺口 × 單穴克重 ÷ 1000] ÷ (1 − 成型損耗率)',
        inputSchema: ['product_mold_bom', 'mold_master', 'item_master (RAW class)'],
        outputSchema: ['Raw Material Gross Requirement (KG)'],
        transformationRules: ['色母配比修正', 'BOM 找不到時擋回錯誤結果'],
        liveData: {
          '原料毛需求': `${nodeLiveData.totalGrossReqKg.toFixed(1)} KG`,
          '日產能': nodeLiveData.totalDemandKg > 0 ? `${Math.round(nodeLiveData.totalDemandKg / 24 / 3600)} PCS/天` : '—',
          '單穴克重': '—',
        },
        editableFields: [
          { key: 'std_mfg_scrap_rate', label: '成型損耗率', unit: '%', max: 50 },
          { key: 'active_cavities', label: '妥善穴數', unit: '穴' },
        ],
      },
      {
        id: 'ax1_step4',
        name: '④ 扣原料供給',
        subName: '原料淨需求 = Max(0, 毛需求 − 有效在庫 − 在途量 + 安全庫存×係數)',
        category: 'axis1',
        x: 1000, y: 70, width: 280, height: 110,
        icon: ShieldCheck,
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30',
        iconColor: 'text-sky-500',
        statusBadge: '淨需求計算',
        recordCountLabel: `${liveStats.poCount} 筆在途`,
        scenarios: ['all', 'axis1', 'axis2'],
        targetTab: 'procurement_workbench',
        responsibilities: '從原料毛需求中扣抵有效在庫與在途 PO，加上安全庫存倍率，得出淨需求。',
        formulaDescription: '淨需求 = Max(0, 毛需求 − 有效在庫 − 在途PO + 安全庫存 × 倍率係數)',
        inputSchema: ['inventory_wip_snapshot (RM tier)', 'po_in_transit', 'item_master (RM rules)'],
        outputSchema: ['Raw Material Net Requirement (KG)'],
        transformationRules: ['有效在庫 = 物理 − 虛擬後沖銷量', '在途 PO 排除已到達/分批到達狀態'],
        liveData: {
          '原料淨需求': `${nodeLiveData.totalNetReqKg.toFixed(1)} KG`,
          '有效在庫': `${nodeLiveData.totalRmOnHandKg.toFixed(1)} KG`,
          '在途 PO': `${nodeLiveData.totalPoKg.toFixed(1)} KG`,
          '安全庫存×係數': `${(nodeLiveData.totalRmOnHandKg * 0.1).toFixed(1)} KG`,
        },
        editableFields: [
          { key: 'safetyStockMultiplier', label: '安全庫存倍率', unit: '×', max: 3 },
          { key: 'enableVirtualBackflush', label: '虛擬後沖銷', unit: '' },
        ],
      },
      {
        id: 'ax1_step5',
        name: '⑤ 產生建議',
        subName: '淨需求 > 0 才觸發 → 進位至 MOQ 倍數 → 逆推最晚下單日',
        category: 'axis1',
        x: 1320, y: 70, width: 280, height: 110,
        icon: Truck,
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        iconColor: 'text-emerald-500',
        statusBadge: '採購建議',
        recordCountLabel: `${liveStats.prCount} 筆待採購`,
        scenarios: ['all', 'axis1'],
        targetTab: 'procurement_workbench',
        responsibilities: '淨需求大於零時觸發採購建議，進位至 MOQ 倍數，並逆推最晚下單日。',
        formulaDescription: '建議採購量 = ceil(淨需求 / MOQ) × MOQ；最晚下單日 = 需求交期 − 採購交期',
        inputSchema: ['Raw Net Requirement', 'item_master (MOQ, Lead Time)'],
        outputSchema: ['PR Suggestion (Qty, Order Date, Supplier)'],
        transformationRules: ['淨需求 = 0 不觸發', '海運 90~150 天 / 陸運 7 天'],
        liveData: {
          '建議採購量': `${nodeLiveData.totalSuggestedQtyKg.toFixed(1)} KG`,
          '平均前置天數': `${nodeLiveData.avgLeadTime} 天`,
          '距最晚下單日': `${nodeLiveData.daysUntilOrder} 天`,
        },
        editableFields: [
          { key: 'shortageAlertBufferDays', label: '缺料警示天數', unit: '天', max: 60 },
        ],
      },

      // ═══════════════════════════════════════════════════════════════════
      // 主軸二：產品交期估算  (Row 2, y=310)
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'ax2_step1',
        name: '① 折訂單',
        subName: '成品缺口 = 訂單量 − 現貨 − WIP有效',
        category: 'axis2',
        x: 40, y: 310, width: 280, height: 110,
        icon: FileSpreadsheet,
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        iconColor: 'text-emerald-500',
        statusBadge: '訂單拆解',
        recordCountLabel: `${liveStats.orderCount} 筆訂單`,
        scenarios: ['all', 'axis2'],
        targetTab: 'sales_workbench',
        responsibilities: '以客户訂單為基準，拆解出當前需要補足的成品缺口。',
        formulaDescription: '成品缺口 = 訂單量 − 現貨 − WIP有效',
        inputSchema: ['actual_order', 'inventory_wip_snapshot'],
        outputSchema: ['FG Gap per Order (PCS)'],
        transformationRules: ['訂單取消者排除', 'WIP有效 = WIP × std_sorting_yield'],
        liveData: {
          '成品缺口': `${Math.max(0, nodeLiveData.totalDemandKg - nodeLiveData.fgReadyKg - nodeLiveData.wipPendingKg).toFixed(1)} KG`,
          '現貨在庫': `${nodeLiveData.fgReadyKg.toFixed(1)} KG`,
          'WIP有效': `${nodeLiveData.wipPendingKg.toFixed(1)} KG`,
        },
        editableFields: [],
      },
      {
        id: 'ax2_step2',
        name: '② 產能體檢',
        subName: '所需生產天數 = [缺口 ÷ 日產能]，若 > 距交期天數 → 紫燈',
        category: 'axis2',
        x: 360, y: 310, width: 280, height: 110,
        icon: Activity,
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        iconColor: 'text-emerald-500',
        statusBadge: '產能評估',
        recordCountLabel: '模具參數計算中',
        scenarios: ['all', 'axis2'],
        targetTab: 'mrp_calculator',
        responsibilities: '根據模具參數推算所需生產天數；若超距交期亮紫燈。',
        formulaDescription: '日產能 = (24h × 3600s ÷ cycle_time_sec) × active_cavities；所需天數 = ceil(缺口 ÷ 日產能)',
        inputSchema: ['mold_master', 'item_master (daily_capacity_params)'],
        outputSchema: ['Required Production Days'],
        transformationRules: ['以保守最大重量 BOM 估算日產能', '含 capacityBufferDays 安全裕度'],
        liveData: {
          '所需生產天數': '—',
          '距交期天數': '—',
          '日產能估算': `${Math.max(1, Math.round(nodeLiveData.totalDemandKg / (nodeLiveData.avgLeadTime || 1)))} PCS/天`,
        },
        editableFields: [
          { key: 'capacityBufferDays', label: '產能安全裕度', unit: '天', max: 14 },
        ],
      },
      {
        id: 'ax2_step3',
        name: '③ 齊套體檢',
        subName: '原料來不及下單？→ 紅燈（沿主軸一計算鏈）',
        category: 'axis2',
        x: 680, y: 310, width: 280, height: 110,
        icon: Zap,
        iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
        iconColor: 'text-rose-500',
        statusBadge: '齊套率評估',
        recordCountLabel: `${nodeLiveData.shortageCount} 項逾期`,
        scenarios: ['all', 'axis2'],
        targetTab: 'mrp_calculator',
        responsibilities: '沿用主軸一 ④ 的原料淨需求結果，檢查最晚下單日是否在距交期天數內。',
        formulaDescription: 'daysUntilLatestOrder ≤ 15 → 紅燈；< 0 → 嚴重逾期',
        inputSchema: ['MRP Engine (主軸一輸出)'],
        outputSchema: ['齐套率狀態 (Red / Yellow / Green)'],
        transformationRules: ['共用主軸一計算鏈', 'daysUntilLatestOrder ≤ 15 天觸發紅燈'],
        liveData: {
          '距最晚下單日': `${nodeLiveData.daysUntilOrder} 天`,
          '逾期項目': `${nodeLiveData.shortageCount} 項`,
          '齊套狀態': nodeLiveData.daysUntilOrder <= 0 ? '🔴 已逾期' : nodeLiveData.daysUntilOrder <= 15 ? '🔴 緊急' : '🟢 正常',
        },
        editableFields: [],
      },
      {
        id: 'ax2_step4',
        name: '④ 物流體檢',
        subName: '海運交期倒推 + 在途船期延誤 → 橘燈',
        category: 'axis2',
        x: 1000, y: 310, width: 280, height: 110,
        icon: TrendingUp,
        iconBg: 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30',
        iconColor: 'text-orange-500',
        statusBadge: '物流風險評估',
        recordCountLabel: `${liveStats.poCount} 筆在途 PO`,
        scenarios: ['all', 'axis2'],
        targetTab: 'procurement_workbench',
        responsibilities: '根據原料採購交期推算最晚到貨日；若在途 PO 有延遲風險，亮橘燈。',
        formulaDescription: '最晚到貨日 = 需求交期 − 生產所需天數；若 (到貨日 < 需求交期) → 橘燈',
        inputSchema: ['item_master (lead_time_days)', 'po_in_transit (ETA)'],
        outputSchema: ['Logistics Status (Orange Alert if Risk)'],
        transformationRules: ['海運 90~150 天 / 陸運 7 天', '在途船期延誤納入評估'],
        liveData: {
          '在途 PO 總量': `${nodeLiveData.totalPoKg.toFixed(1)} KG`,
          '平均前置天數': `${nodeLiveData.avgLeadTime} 天`,
          '物流風險': nodeLiveData.totalPoKg > nodeLiveData.totalGrossReqKg * 0.8 ? '🟠 潛在延誤' : '🟢 正常',
        },
        editableFields: [],
      },
      {
        id: 'ax2_step5',
        name: '⑤ 綜合評分',
        subName: '緊張指數：紅 95 / 紫 75 / 黃 50 / 正常 10，由高到低排序出清單',
        category: 'axis2',
        x: 1320, y: 310, width: 280, height: 110,
        icon: Workflow,
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30',
        iconColor: 'text-purple-500',
        statusBadge: '緊張指數排序',
        recordCountLabel: `${liveStats.shortageCount} 項待處理`,
        scenarios: ['all', 'axis2'],
        targetTab: 'order_tension_tracker',
        responsibilities: '將產能、齊套、物流三項體檢結果綜合評分，由高至低排序。',
        formulaDescription: '緊張指數：紅 95 / 紫 75 / 黃 50 / 正常 10',
        inputSchema: ['產能體檢結果', '齊套體檢結果', '物流體檢結果'],
        outputSchema: ['Priority Shortage List (Sorted)'],
        transformationRules: ['取三項體檢中最高緊張指數作為該 SKU 綜合分數', '相同分數依距交期天數再由近到遠排'],
        liveData: {
          '待處理項目': `${liveStats.shortageCount} 項`,
          '最高緊張指數': liveStats.shortageCount > 0 ? '95 (紅)' : '10 (正常)',
          '建議處理優先級': liveStats.shortageCount > 0 ? '🔴 立即處理' : '🟢 無需處理',
        },
        editableFields: [],
      },

      // ── 三道預警指示器（主軸一右側） ──────────────────────────────────────
      {
        id: 'warn_red',
        name: '🔴 紅警',
        subName: '距最晚下單日 ≤ 15 天（負值 = 已逾期）',
        category: 'warning',
        x: 1640, y: 55, width: 200, height: 55,
        icon: Zap,
        iconBg: 'bg-rose-500/15 dark:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-2 border-rose-400/60 dark:border-rose-500/50',
        iconColor: 'text-rose-500',
        statusBadge: '逾期警戒',
        recordCountLabel: `${nodeLiveData.shortageCount} 項`,
        scenarios: ['all', 'axis1'],
        responsibilities: '採購交期極度緊迫或已逾期，需即刻開立採購單或啟動加急空運。',
        formulaDescription: 'daysUntilLatestOrder ≤ 15',
        inputSchema: ['主軸一 ⑤ 輸出'],
        outputSchema: ['紅燈警示'],
        transformationRules: ['負值代表已逾期，優先處理', '建議改採空運或加急海運'],
        liveData: { '逾期項目': `${nodeLiveData.shortageCount} 項` },
        editableFields: [],
      },
      {
        id: 'warn_yellow',
        name: '🟡 黃警',
        subName: '備料太多（>需求 1.6 倍）',
        category: 'warning',
        x: 1640, y: 125, width: 200, height: 55,
        icon: Activity,
        iconBg: 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-2 border-amber-400/60 dark:border-amber-500/50',
        iconColor: 'text-amber-500',
        statusBadge: '過備預警',
        recordCountLabel: '監控中',
        scenarios: ['all', 'axis1'],
        responsibilities: '現有庫存+在途超需求 1.6 倍，有呆滯風險，需評估是否踩煞車。',
        formulaDescription: '總供應 / 毛需求 > 1.6',
        inputSchema: ['主軸一 ④ 輸出'],
        outputSchema: ['黃燈警示'],
        transformationRules: ['評估在途 PO 是否延後 ETA', '考量 Forecast 下修影響'],
        liveData: { '超備項目': `${nodeLiveData.overstockCount} 項` },
        editableFields: [],
      },
      {
        id: 'warn_orange',
        name: '🟠 橘警',
        subName: '超倉容（>12,000 KG，建議分批到貨）',
        category: 'warning',
        x: 1640, y: 195, width: 200, height: 55,
        icon: Boxes,
        iconBg: 'bg-orange-500/15 dark:bg-orange-500/25 text-orange-600 dark:text-orange-400 border-2 border-orange-400/60 dark:border-orange-500/50',
        iconColor: 'text-orange-500',
        statusBadge: '爆倉預警',
        recordCountLabel: '監控中',
        scenarios: ['all', 'axis1'],
        responsibilities: '原料庫存+在途已超實體倉庫上限（預設 12,000 KG），需分批到貨或租借倉儲。',
        formulaDescription: '總供應 > defaultWarehouseCapacityKg (預設 12,000 KG)',
        inputSchema: ['主軸一 ④ 輸出'],
        outputSchema: ['橘燈警示'],
        transformationRules: ['建議自動拆分批次到貨（50%/50%，間隔 30 天）', '協調租借外部保稅倉'],
        liveData: { '爆倉項目': `${nodeLiveData.overcapacityCount} 項` },
        editableFields: [],
      },
    ],
    [liveStats]
  );

  // ── Edge Definitions (主軸一橫向流程 + 主軸二橫向流程 + 跨軸共享鏈) ─────────
  const PIPELINE_EDGES: PipelineEdge[] = useMemo(
    () => [
      // ── 主軸一：原物料備料補貨 (Step → Step) ──────────────────────────────────
      { id: 'e_ax1_1_2', fromNodeId: 'ax1_step1', toNodeId: 'ax1_step2', scenarios: ['all', 'axis1', 'axis2'], label: '總需求 Qty', badge: 'KG / PCS' },
      { id: 'e_ax1_2_3', fromNodeId: 'ax1_step2', toNodeId: 'ax1_step3', scenarios: ['all', 'axis1', 'axis2'], label: '成品缺口', badge: 'FG Gap' },
      { id: 'e_ax1_3_4', fromNodeId: 'ax1_step3', toNodeId: 'ax1_step4', scenarios: ['all', 'axis1', 'axis2'], label: '原料毛需求', badge: 'RM Gross' },
      { id: 'e_ax1_4_5', fromNodeId: 'ax1_step4', toNodeId: 'ax1_step5', scenarios: ['all', 'axis1'], label: '淨需求 > 0', badge: 'Trigger PR' },

      // ── 主軸一 → 三道預警 ────────────────────────────────────────────────────
      { id: 'e_ax1_warn_red', fromNodeId: 'ax1_step5', toNodeId: 'warn_red', scenarios: ['all', 'axis1'], dashed: true, label: '⚠ 逾期警戒', badge: 'LT ≤ 15d' },
      { id: 'e_ax1_warn_yellow', fromNodeId: 'ax1_step4', toNodeId: 'warn_yellow', scenarios: ['all', 'axis1'], dashed: true, label: '🟡 過備預警', badge: '> 1.6x' },
      { id: 'e_ax1_warn_orange', fromNodeId: 'ax1_step4', toNodeId: 'warn_orange', scenarios: ['all', 'axis1'], dashed: true, label: '🟠 爆倉預警', badge: '> 12K KG' },

      // ── 主軸二：產品交期估算 (Step → Step) ────────────────────────────────────
      { id: 'e_ax2_1_2', fromNodeId: 'ax2_step1', toNodeId: 'ax2_step2', scenarios: ['all', 'axis2'], label: '成品缺口', badge: 'FG Gap' },
      { id: 'e_ax2_2_3', fromNodeId: 'ax2_step2', toNodeId: 'ax2_step3', scenarios: ['all', 'axis2'], label: '所需生產天數', badge: 'Prod Days' },
      { id: 'e_ax2_3_4', fromNodeId: 'ax2_step3', toNodeId: 'ax2_step4', scenarios: ['all', 'axis2'], label: '齊套狀態', badge: 'Set Check' },
      { id: 'e_ax2_4_5', fromNodeId: 'ax2_step4', toNodeId: 'ax2_step5', scenarios: ['all', 'axis2'], label: '物流風險', badge: 'Logistics' },

      // ── 跨軸共享計算鏈：主軸一 ② → 主軸二 ①（共同使用成品缺口）───────────────
      { id: 'e_shared_fg_gap', fromNodeId: 'ax1_step2', toNodeId: 'ax2_step1', scenarios: ['all', 'axis1', 'axis2'], dashed: true, label: '共享成品缺口', badge: 'SSOT · FG Gap' },

      // ── 跨軸共享計算鏈：主軸一 ④ → 主軸二 ③（共同使用原料淨需求 / daysUntilLatestOrder）
      { id: 'e_shared_rm_net', fromNodeId: 'ax1_step4', toNodeId: 'ax2_step3', scenarios: ['all', 'axis1', 'axis2'], dashed: true, label: '共享淨需求', badge: 'SSOT · RM Net' },

      // ── 跨軸共享計算鏈：主軸一 ③ → 主軸二 ②（共同使用單穴克重 / 日產能）────────
      { id: 'e_shared_capacity', fromNodeId: 'ax1_step3', toNodeId: 'ax2_step2', scenarios: ['all', 'axis1', 'axis2'], dashed: true, label: '共享日產能', badge: 'SSOT · Capacity' },
    ],
    []
  );

  // Filter nodes & edges based on scenario
  const visibleNodes = useMemo(() => {
    if (selectedScenario === 'all') return WORKSTATION_NODES;
    return WORKSTATION_NODES.filter((n) => n.scenarios.includes(selectedScenario));
  }, [selectedScenario, WORKSTATION_NODES]);

  const visibleNodeIdSet = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return PIPELINE_EDGES.filter(
      (e) =>
        visibleNodeIdSet.has(e.fromNodeId) &&
        visibleNodeIdSet.has(e.toNodeId) &&
        (selectedScenario === 'all' || e.scenarios.includes(selectedScenario))
    );
  }, [selectedScenario, PIPELINE_EDGES, visibleNodeIdSet]);

  const selectedNode = useMemo(
    () => WORKSTATION_NODES.find((n) => n.id === selectedNodeId) || null,
    [selectedNodeId, WORKSTATION_NODES]
  );

  // ── Step Simulation Runner ────────────────────────────────────────────────
  const simulationNodeOrder = useMemo(() => {
    return [
      'ax1_step1', 'ax1_step2', 'ax1_step3', 'ax1_step4', 'ax1_step5',
      'warn_red', 'warn_yellow', 'warn_orange',
      'ax2_step1', 'ax2_step2', 'ax2_step3', 'ax2_step4', 'ax2_step5',
    ].filter((id) => visibleNodeIdSet.has(id));
  }, [visibleNodeIdSet]);

  const handleToggleSimulation = () => {
    if (isSimulating) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      setSimulationStepIndex(0);
    }
  };

  useEffect(() => {
    if (isSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setSimulationStepIndex((prev) => {
          const next = prev + 1;
          if (next >= simulationNodeOrder.length) {
            setIsSimulating(false);
            if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
            return prev;
          }
          return next;
        });
      }, 1500);
    } else {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    }
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isSimulating, simulationNodeOrder]);

  const handleResetSimulation = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    setSimulationStepIndex(-1);
  };

  // Helper for computing straight-line path (horizontal left→right)
  const computeLinePath = (fromNode: WorkstationNode, toNode: WorkstationNode) => {
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;
    return {
      path: `M ${startX} ${startY} L ${endX} ${endY}`,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[720px] w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ── Top Header Scenario Selector (完全對齊參考圖頂部導覽卡) ──────────── */}
      <div className="flex-none p-4 md:px-6 md:pt-4 md:pb-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md z-10">
        <div className="max-w-[113.3333rem] mx-auto">
          {/* Top Bar: Title & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  核心運算流程總覽
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                    兩大主軸 · SSOT
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  主軸一：原物料備料補貨（①算需求→⑤產生建議）　│　主軸二：產品交期估算（①折訂單→⑤綜合評分）　│　共用 mrpEngine.ts 計算引擎
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2">
              {/* Simulation Player */}
              <div className="flex items-center rounded-lg p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={handleToggleSimulation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    isSimulating
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  }`}
                  title={isSimulating ? '暫停模擬' : '播放逐步運算模擬'}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? '暫停模擬' : '逐步播放'}</span>
                </button>
                <button
                  onClick={handleResetSimulation}
                  className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
                  title="重置模擬狀態"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dynamic Flow Toggle */}
              <button
                onClick={() => setIsDynamicFlowActive((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isDynamicFlowActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                }`}
                title="切換連線動態流動光點"
              >
                <Zap className={`w-3.5 h-3.5 ${isDynamicFlowActive ? 'text-emerald-500 animate-pulse' : ''}`} />
                <span>動態流動: {isDynamicFlowActive ? '開' : '關'}</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center rounded-lg p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="縮小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[0.9333rem] font-mono font-medium px-2 text-slate-600 dark:text-slate-400">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="放大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1.0)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-1"
                  title="重置為 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Scenario Filter Cards (4 Cards Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.id;
              const IconComponent = sc.icon;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    setSelectedScenario(sc.id);
                    if (isSimulating) handleResetSimulation();
                  }}
                  className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? `bg-linear-to-br ${sc.activeBg} ${sc.activeBorder} shadow-md ring-1 ring-indigo-500/20`
                      : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-xs flex items-center gap-1.5 ${
                        isSelected
                          ? 'font-bold text-indigo-950 dark:text-indigo-200'
                          : 'font-semibold text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${sc.accentColor}`} />
                      {sc.role}
                    </span>
                    {isSelected && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs leading-snug mb-1 ${
                      isSelected
                        ? 'font-extrabold text-slate-950 dark:text-white'
                        : 'font-bold text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {sc.action}
                  </div>
                  <div
                    className={`text-[0.9333rem] line-clamp-1 ${
                      isSelected
                        ? 'font-semibold text-slate-800 dark:text-slate-200'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sc.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Canvas & Inspector Drawer ─────────────────────────────────── */}
      <div ref={inspectorHostRef} className="flex-1 relative flex overflow-hidden">
        {/* Canvas Area with Dot Matrix Background */}
        <div
          className="flex-1 h-full overflow-auto relative p-6 select-none"
          style={{
            backgroundImage:
              'radial-gradient(var(--pipeline-dot, rgba(148, 163, 184, 0.28)) 1.25px, transparent 1.25px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Zoomable Container */}
          <div
            className="relative transition-transform duration-150 origin-top-left"
            style={{ width: '1900px', height: '680px', transform: `scale(${zoomLevel})` }}
          >
            {/* ── Formula Step Visualizer ──────────────────────────────────── */}
            <div className="absolute inset-0 flex flex-col gap-5 p-6 overflow-y-auto">

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 主軸一：原物料備料補貨 */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-8 bg-sky-500 rounded-full" />
                  <span className="text-[13px] font-extrabold text-sky-600 dark:text-sky-400 tracking-wide">
                    主軸一：原物料備料補貨
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    需求計算 → 缺口推導 → BOM 展開 → 淨需求 → 採購建議
                  </span>
                </div>
                <div className="relative flex items-stretch gap-3">
                  {/* Flow connector line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-200 via-sky-300 to-emerald-300 dark:from-sky-900 dark:via-sky-800 dark:to-emerald-800 -translate-y-1/2 -z-0 pointer-events-none" />
                  {axis1Steps.map((step, i) => (
                    <div key={step.id} className="relative flex-1 min-w-0 z-10">
                      <FormulaStepCard
                        step={step}
                        expanded={expandedFormulaSteps.has(step.id)}
                        onToggle={() => toggleFormulaStep(step.id)}
                        onSelect={() => handleNodeSelect(step.id)}
                      />
                      {i < axis1Steps.length - 1 && (
                        <div className="absolute top-1/2 -right-3 z-20 -translate-y-1/2 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-sky-500 dark:text-sky-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 whitespace-nowrap mb-0.5 shadow-sm">
                            {step.chainLabel}
                          </span>
                          <ArrowRight className="w-4 h-4 text-sky-400 dark:text-sky-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 跨軸數據依賴橋（主軸一輸出 → 主軸二輸入的耦合關係） */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="mx-6 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 flex items-center gap-6 flex-wrap">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex-shrink-0">
                  跨軸數據依賴
                </span>
                {[
                  { from: '主軸一② 成品缺口', to: '主軸二① 折訂單', value: `${fgNetReqPcs} PCS`, color: '#3b82f6' },
                  { from: '主軸一④ 原料淨缺口', to: '主軸二③ 齊套體檢', value: `${(rmNetReqKg / 1000).toFixed(1)} KG`, color: rmNetReqKg > 0 ? '#f43f5e' : '#94a3b8' },
                  { from: '主軸一④ 原料淨缺口', to: '主軸二④ 物流體檢', value: `${avgLeadTime > 0 ? avgLeadTime + ' 天' : '—'}`, color: '#f97316' },
                ].map((dep, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">{dep.from}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">{dep.to}</span>
                    <span className="text-slate-300 dark:text-slate-700">│</span>
                    <span className="font-mono font-extrabold whitespace-nowrap" style={{ color: dep.color }}>
                      {dep.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 主軸二：綜合體檢與評分 */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-8 bg-violet-500 rounded-full" />
                  <span className="text-[13px] font-extrabold text-violet-600 dark:text-violet-400 tracking-wide">
                    主軸二：綜合體檢與評分
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    訂單分解 → 產能檢核 → 齊套檢核 → 物流檢核 → 綜合評分
                  </span>
                </div>
                <div className="relative flex items-stretch gap-3">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-200 via-violet-300 to-amber-300 dark:from-violet-900 dark:via-violet-800 dark:to-amber-800 -translate-y-1/2 -z-0 pointer-events-none" />
                  {axis2Steps.map((step, i) => (
                    <div key={step.id} className="relative flex-1 min-w-0 z-10">
                      <FormulaStepCard
                        step={step}
                        expanded={expandedFormulaSteps.has(step.id)}
                        onToggle={() => toggleFormulaStep(step.id)}
                        onSelect={() => handleNodeSelect(step.id)}
                      />
                      {i < axis2Steps.length - 1 && (
                        <div className="absolute top-1/2 -right-3 z-20 -translate-y-1/2 flex flex-col items-center">
                          <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 whitespace-nowrap mb-0.5 shadow-sm">
                            {step.chainLabel}
                          </span>
                          <ArrowRight className="w-4 h-4 text-violet-400 dark:text-violet-600" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Floating Deep Data Inspection Window (數據穿透懸浮視窗，可拖曳) ── */}
        {selectedNode && (
          <div
            ref={inspectorRef}
            onMouseEnter={clearStationHideTimer}
            onMouseLeave={scheduleStationHide}
            className="absolute w-96 md:w-[28rem] max-h-[calc(100%-1.5rem)] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col z-30 overflow-hidden"
            style={
              inspectorPos
                ? { left: `${inspectorPos.x}px`, top: `${inspectorPos.y}px` }
                : { right: '12px', top: '12px' }
            }
          >
            {/* Window Header (拖曳把手) */}
            <div
              onPointerDown={handleInspectorDragStart}
              title="拖曳移動視窗位置"
              className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50 cursor-move select-none touch-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl flex-shrink-0 ${selectedNode.iconBg}`}>
                  <selectedNode.icon className={`w-5 h-5 ${selectedNode.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-[0.8667rem] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                    工作站節點檢視 (Station Details)
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedNode.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => { clearStationHideTimer(); setSelectedNodeId(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Content (Scrollable) */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
              {/* Quick Navigation Action Button */}
              {selectedNode.targetTab && (
                <button
                  onClick={() => onNavigateToTab(selectedNode.targetTab!)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-medium transition-all group shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    開啟對應工作台與資料表
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {/* Station Responsibilities */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  工作站職責與核心邏輯
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                  {selectedNode.responsibilities}
                </p>
              </div>

              {/* Formula & Rule Box */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Calculator className="w-3.5 h-3.5 text-purple-500" />
                  推導算式與處理規則 (Domain Logic)
                </div>
                <div className="font-mono text-[0.9333rem] bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner leading-relaxed">
                  {selectedNode.formulaDescription}
                </div>
              </div>

              {/* Transformation Rules List */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  資料清洗與運算防護 (CAPA Guard)
                </div>
                <ul className="space-y-1.5">
                  {selectedNode.transformationRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/40"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Inputs & Outputs Schema */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[0.9333rem] block">
                    📥 輸入資料流 (Inputs)
                  </span>
                  <div className="space-y-1">
                    {selectedNode.inputSchema.map((item, idx) => (
                      <span
                        key={idx}
                        className="block font-mono text-[0.8667rem] text-slate-600 dark:text-slate-400 truncate"
                      >
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[0.9333rem] block">
                    📤 輸出資料流 (Outputs)
                  </span>
                  <div className="space-y-1">
                    {selectedNode.outputSchema.map((item, idx) => (
                      <span
                        key={idx}
                        className="block font-mono text-[0.8667rem] text-emerald-600 dark:text-emerald-400 truncate"
                      >
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Data Summary */}
              {selectedNode.liveData && Object.keys(selectedNode.liveData).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    即時運算數據 (Live Computed)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedNode.liveData).map(([key, val]) => (
                      <div key={key} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 font-medium">{key}</div>
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate">
                          {String(val)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable Fields */}
              {selectedNode.editableFields && selectedNode.editableFields.length > 0 && (
                <EditableFieldsSection
                  node={selectedNode}
                  systemParameters={systemParameters}
                  onSave={(updatedParams) => {
                    onSystemParametersChange?.(updatedParams);
                  }}
                />
              )}
            </div>

            {/* Drawer Footer Status */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">節點健康狀態:</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                正常運行中 (Active)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global Style for Keyframe Animations */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        :root {
          --pipeline-dot: rgba(148, 163, 184, 0.35);
        }
        .dark {
          --pipeline-dot: rgba(255, 255, 255, 0.12);
        }
      `}</style>
    </div>
  );
};
