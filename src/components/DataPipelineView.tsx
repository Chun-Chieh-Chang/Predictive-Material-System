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
} from 'lucide-react';
import {
  SystemDatabase,
  SystemParameters,
} from '../types';
import { NavTab } from './Navbar';
import { calculateAllMRP } from '../utils/mrpEngine';

// ─── Scenario Definitions (頂部情境切換導覽卡) ──────────────────────────────
export type PipelineScenario = 'all' | 'sales' | 'procurement' | 'production';

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
    role: '端到端流程總覽 (Full E2E Pipeline)',
    action: '⚡ 完整數據推導端到端串接',
    desc: '資料來源 ➔ 去識別化標準化 ➔ MRP運算核心 ➔ 決策預警終端',
    icon: Workflow,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    activeBorder: 'border-indigo-600 dark:border-indigo-400 border-2',
    activeBg: 'from-indigo-100/90 to-purple-100/90 dark:from-indigo-950/70 dark:to-purple-950/70',
  },
  {
    id: 'sales',
    role: '業務管理 (Sales Ops)',
    action: '📈 業務預測與正式訂單沖銷流',
    desc: 'Rolling Forecast ➔ 銷售實單 ➔ 沖銷鎖定淨需求 ➔ 放行確認',
    icon: TrendingUp,
    accentColor: 'text-amber-600 dark:text-amber-400',
    activeBorder: 'border-amber-600 dark:border-amber-400 border-2',
    activeBg: 'from-amber-100/90 to-orange-100/90 dark:from-amber-950/70 dark:to-orange-950/70',
  },
  {
    id: 'procurement',
    role: '採購排程 (Procurement Ops)',
    action: '🚚 庫存安全水位與採購建議流',
    desc: '四層即時庫存 ➔ 在途 PO 整合 ➔ MRP推導 ➔ 批量採購建議 (PR)',
    icon: Truck,
    accentColor: 'text-sky-600 dark:text-sky-400',
    activeBorder: 'border-sky-600 dark:border-sky-400 border-2',
    activeBg: 'from-sky-100/90 to-blue-100/90 dark:from-sky-950/70 dark:to-blue-950/70',
  },
  {
    id: 'production',
    role: '生管與庫存 (Production Ops)',
    action: '🏭 四層庫存防線與缺料風險預警',
    desc: '原料倉庫 ➔ WIP在製品 ➔ 成品倉庫 ➔ 訂單缺料分析 ➔ 出貨審查',
    icon: Boxes,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    activeBorder: 'border-emerald-600 dark:border-emerald-400 border-2',
    activeBg: 'from-emerald-100/90 to-teal-100/90 dark:from-emerald-950/70 dark:to-teal-950/70',
  },
];

// ─── Workstation Node Interfaces ─────────────────────────────────────────────
export type NodeCategory = 'source' | 'sanitize' | 'mrp' | 'decision' | 'rule';

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

interface DataPipelineViewProps {
  database: SystemDatabase;
  systemParameters: SystemParameters;
  onNavigateToTab: (tab: NavTab) => void;
}

export const DataPipelineView: React.FC<DataPipelineViewProps> = ({
  database,
  systemParameters,
  onNavigateToTab,
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

  // ── Workstation Node Map (寬裕排版，零重疊) ─────────────────────────────────
  const WORKSTATION_NODES: WorkstationNode[] = useMemo(
    () => [
      // 1. Data Ingestion / Sources (Leftmost column: x=30, width=240, height=95)
      {
        id: 'source_item_master',
        name: '料號主檔 (Item Master)',
        subName: 'BOM / 前置時間 / 安全庫存 / MOQ',
        category: 'source',
        x: 30,
        y: 20,
        width: 240,
        height: 95,
        icon: Package,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        iconColor: 'text-amber-500',
        statusBadge: '已校驗',
        recordCountLabel: `${liveStats.itemCount} 筆料號`,
        scenarios: ['all', 'sales', 'procurement', 'production'],
        targetTab: 'data_tables',
        responsibilities: '維護所有原料與成品基礎參數，包含採購前置天數 (Lead Time)、安全庫存基準、採購最小起訂量 (MOQ) 與全檢良率。',
        formulaDescription: '提供物料分類 (RAW / MAT / PART / COMP / SET) 與供應商物流屬性 (國內陸運 / 國外海運進口)。',
        inputSchema: ['sku', 'customer_id', 'category', 'lead_time_days', 'moq_kg', 'safety_stock_kg'],
        outputSchema: ['標準物料主檔對象 (Item Master Spec)'],
        transformationRules: [
          '校驗 SKU 編碼唯一性與物料業務類別',
          '空值補齊：若未填寫 lead_time_days，自動帶入系統預設值 (90天/國外、7天/國內)',
          '客戶與供應商自動去識別化匿名對齊',
        ],
      },
      {
        id: 'source_forecast',
        name: '業務預測 (Demand Forecast)',
        subName: 'Rolling Forecast 滾動預測需求',
        category: 'source',
        x: 30,
        y: 135,
        width: 240,
        height: 95,
        icon: TrendingUp,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        iconColor: 'text-amber-500',
        statusBadge: '滾動更新',
        recordCountLabel: `${liveStats.forecastCount} 筆預測`,
        scenarios: ['all', 'sales'],
        targetTab: 'sales_workbench',
        responsibilities: '接收業務單位未來 3~6 個月之滾動預估訂單需求 (Rolling Forecast)，作為 MRP 中長期備料依據。',
        formulaDescription: '毛需求 (Gross Demand) = Max(預測數量 - 已下單沖銷量, 0) + 實單鎖定數量。',
        inputSchema: ['forecast_id', 'customer_id', 'sku', 'target_date', 'quantity_kg'],
        outputSchema: ['標準時間區間預估需求資料流 (Time-phased Demand)'],
        transformationRules: [
          '日期區間劃分：按月 (M1, M2, M3...) 與按週彙整',
          '客戶名稱匿名化對齊 (如 A客戶 / B客戶)',
          '自動對齊料號主檔計量單位 (PCS / KG)',
        ],
      },
      {
        id: 'source_actual_order',
        name: '銷售實單 (Actual Orders)',
        subName: '已確認之正式銷售訂單 (SO)',
        category: 'source',
        x: 30,
        y: 250,
        width: 240,
        height: 95,
        icon: FileSpreadsheet,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        iconColor: 'text-amber-500',
        statusBadge: '已鎖定',
        recordCountLabel: `${liveStats.orderCount} 筆訂單`,
        scenarios: ['all', 'sales', 'production'],
        targetTab: 'sales_workbench',
        responsibilities: '承接客戶已正式下達並確認交期之銷售訂單，具有最高優先級與硬性排程放行需求。',
        formulaDescription: '實單直接鎖定可用庫存，優先於預測扣抵，並參與訂單缺料分析評估。',
        inputSchema: ['order_id', 'customer_id', 'sku', 'required_delivery_date', 'order_qty_kg'],
        outputSchema: ['高優先級正式需求資料流 (Confirmed Demand)'],
        transformationRules: [
          '訂單編號去識別化 (PO-A-YYYYMM-NN 格式)',
          '交期逆推生產與物料準備截止日 (Target Arrival Date)',
        ],
      },
      {
        id: 'source_po_transit',
        name: '採購在途 (PO in Transit)',
        subName: '已向供應商下單在途 PO',
        category: 'source',
        x: 30,
        y: 365,
        width: 240,
        height: 95,
        icon: Truck,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        iconColor: 'text-amber-500',
        statusBadge: '在途中',
        recordCountLabel: `${liveStats.poCount} 筆在途`,
        scenarios: ['all', 'procurement'],
        targetTab: 'procurement_workbench',
        responsibilities: '追蹤已發出之採購訂單 (PO) 及預計到廠日期 (ETA)，計入未來有效供給能力。',
        formulaDescription: '有效預估結存 = 期初在庫 + 在途PO(ETA <= 需求日) - 累計淨需求。',
        inputSchema: ['po_id', 'supplier_name', 'sku', 'eta_date', 'quantity_kg', 'status'],
        outputSchema: ['在途供給排程資料流 (Scheduled Inflow)'],
        transformationRules: [
          '供應商名稱匿名化轉換 (A供應商 (國內陸運) / B供應商 (國外海運進口))',
          '在途狀態篩選 (排除已結案/已入庫之歷史 PO)',
        ],
      },
      {
        id: 'source_inventory',
        name: '四層在庫庫存 (4-Tier Inventory)',
        subName: '原料倉 / WIP待驗 / 成品良品在庫',
        category: 'source',
        x: 30,
        y: 480,
        width: 240,
        height: 95,
        icon: Boxes,
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        iconColor: 'text-amber-500',
        statusBadge: '即時盤點',
        recordCountLabel: `${liveStats.invRawCount} 筆庫存紀錄`,
        scenarios: ['all', 'procurement', 'production'],
        targetTab: 'data_tables',
        responsibilities: '精確劃分「原料倉庫」、「在製品待驗區 (WIP)」、「成品倉庫」，剔除硬編碼樓層術語，維持真實可用庫存。',
        formulaDescription: '全檢良品預估 = WIP待驗數量 * std_sorting_yield (標準全檢良率)。',
        inputSchema: ['sku', 'warehouse_type', 'batch_no', 'available_qty_kg', 'allocated_qty_kg'],
        outputSchema: ['四層可用存貨快照 (Usable Stock Snapshot)'],
        transformationRules: [
          '標準化業務庫存名稱：禁止 1F/3F/4F 樓層名稱',
          '區分物理庫存 (Physical) 與可用庫存 (Available = Physical - Allocated)',
        ],
      },

      // 2. Sanitation & Standardization Workstation (Column 2: x=380, width=260, height=130, y=235)
      {
        id: 'station_sanitize',
        name: '資料清洗與去識別化工作站',
        subName: 'Sanitize & Domain Standardizer',
        category: 'sanitize',
        x: 380,
        y: 235,
        width: 260,
        height: 130,
        icon: ShieldCheck,
        iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
        iconColor: 'text-cyan-500',
        statusBadge: '100% 匿名合規',
        recordCountLabel: '隱私保護中',
        scenarios: ['all', 'sales', 'procurement', 'production'],
        targetTab: 'data_exchange',
        responsibilities: '執行演練模式去識別化協議，校驗資料字典型態，過濾異常值並執行格式對齊。',
        formulaDescription: '客戶映射：MDX ➔ A客戶 | 供應商映射：台化 ➔ A供應商 (國內陸運)。',
        inputSchema: ['原始資料庫各數據表'],
        outputSchema: ['標準化去識別清洗後數據字典 (Sanitized Data Hub)'],
        transformationRules: [
          '去識別化轉換：匿名代稱 A/B/C客戶 與 A/B/C供應商',
          '異常值清理：過濾負數庫存與非法日期',
          '防禦空狀態：若無資料回傳真實 Empty State (0筆)，嚴禁偽造數據',
        ],
        subNodes: [
          {
            id: 'sub_anonym_dict',
            name: '去識別化對照字典',
            sub: '客戶與供應商匿名對稱表',
            icon: ShieldCheck,
            badge: '演練模式',
          },
          {
            id: 'sub_schema_guard',
            name: '資料字典校驗器',
            sub: 'TypeScript 嚴格型別防護',
            icon: CheckCircle2,
            badge: 'Strict Type',
          },
        ],
      },

      // 3. Demand Consumption & Forecast Netting Workstation (Column 3: x=750, width=260, height=130, y=235)
      {
        id: 'station_demand_netting',
        name: '需求沖銷與淨需求工作站',
        subName: 'Demand Aggregation & Netting Engine',
        category: 'mrp',
        x: 750,
        y: 235,
        width: 260,
        height: 130,
        icon: Calculator,
        iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
        iconColor: 'text-indigo-500',
        statusBadge: '標準公式推導',
        recordCountLabel: '即時推算中',
        scenarios: ['all', 'sales', 'procurement'],
        targetTab: 'mrp_calculator',
        responsibilities: '將業務滾動預測與實際銷售訂單進行逐期沖銷運算，產出各時段的淨需求矩陣。',
        formulaDescription: '毛需求 Gross Demand = Max(預測 - 沖銷, 0) + 實單。',
        inputSchema: ['Sanitized Forecast', 'Sanitized Actual Orders', 'Item LeadTime'],
        outputSchema: ['分期毛需求與淨需求矩陣 (Time-bucketed Net Requirements)'],
        transformationRules: [
          '前沖/後沖沖銷窗口判定 (Consumption Window)',
          '緊急插單動態重排 (Urgent Order Prioritization)',
        ],
      },

      // 4. MRP Core Engine Workstation (Column 4: x=1120, width=290, height=155, y=225)
      {
        id: 'mrp_core',
        name: 'MRP 庫存推導與排程運算核心',
        subName: 'Core Predictive Material Engine',
        category: 'mrp',
        x: 1120,
        y: 225,
        width: 290,
        height: 155,
        icon: Cpu,
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30',
        iconColor: 'text-purple-500',
        statusBadge: '核心運算站',
        recordCountLabel: '3 階推導引擎',
        scenarios: ['all', 'sales', 'procurement', 'production'],
        targetTab: 'mrp_calculator',
        responsibilities: '執行 3 階 MRP 展算：結合 BOM 結構、四層即時庫存、在途 PO 與前置天數，精確推算採購建議與安全庫存缺口。',
        formulaDescription: '期末預估結存 = 期初在庫 + 在途PO - 淨需求；若結存 < 安全庫存，觸發採購建議。',
        inputSchema: ['Net Requirements', 'Usable Inventory', 'PO in Transit', 'Item Master Rules'],
        outputSchema: ['採購建議排程 (PR)', '缺料預警表 (Shortage Alert)', '放行判定 (Clearance)'],
        transformationRules: [
          '安全庫存門檻觸發 (Safety Stock Trigger)',
          '採購批量放大 (Lot Sizing with MOQ & 倍量)',
          '採購前置期逆推 (Lead Time Offset 推算最晚下單日)',
        ],
        subNodes: [
          {
            id: 'sub_moq_rule',
            name: 'MOQ 採購起訂批量規則',
            sub: '無條件進位至最小批量',
            icon: Settings2,
            badge: 'MOQ Rule',
          },
          {
            id: 'sub_leadtime_rule',
            name: '採購前置天數 (Lead Time)',
            sub: '海運 90~150天 / 陸運 7天',
            icon: Sliders,
            badge: 'Lead Time',
          },
          {
            id: 'sub_safetystock_rule',
            name: '動態安全庫存水位 (Safety Stock)',
            sub: '緩衝天數與最低庫存門檻',
            icon: ShieldCheck,
            badge: 'Safety Stock',
          },
        ],
      },

      // 5. Output / Action Workstations (Column 5: x=1500, width=250, height=105)
      {
        id: 'out_pr_suggestion',
        name: '採購排程建議 (PR Suggestions)',
        subName: '自動產生採購請購單建議與下單日',
        category: 'decision',
        x: 1500,
        y: 50,
        width: 250,
        height: 105,
        icon: Truck,
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        iconColor: 'text-emerald-500',
        statusBadge: '採購指令',
        recordCountLabel: `${liveStats.prCount} 筆待採購`,
        scenarios: ['all', 'procurement'],
        targetTab: 'procurement_workbench',
        responsibilities: '將 MRP 推導出的物料缺口，自動逆推最晚採購下單日 (Order Date) 與建議採購數量 (PR Qty)。',
        formulaDescription: '建議採購量 = Math.ceil((安全庫存缺口) / MOQ) * MOQ。',
        inputSchema: ['MRP Engine Suggestions'],
        outputSchema: ['採購排程清單 (PR Suggestions List)'],
        transformationRules: [
          '自動標註供應商名稱與物流方式 (國內陸運/國外海運進口)',
          '高亮超前置期之緊急採購單 (Expedite Orders)',
        ],
      },
      {
        id: 'out_order_tension',
        name: '訂單缺料分析預警',
        subName: '訂單缺料風險與齊套率分析',
        category: 'decision',
        x: 1500,
        y: 250,
        width: 250,
        height: 105,
        icon: Activity,
        iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
        iconColor: 'text-rose-500',
        statusBadge: liveStats.shortageCount > 0 ? '缺料預警' : '供應充足',
        recordCountLabel: `${liveStats.shortageCount} 項缺料物料`,
        scenarios: ['all', 'production', 'sales'],
        targetTab: 'order_tension_tracker',
        responsibilities: '實時監控各訂單對應物料的即時齊套狀況，標示紅色缺料、黃色緊繃與綠色充足狀態。',
        formulaDescription: '齊套率 = (已鎖定庫存 + 到貨在途) / 訂單總需求物料量 * 100%。',
        inputSchema: ['MRP Output', 'Actual Orders', 'BOM Master'],
        outputSchema: ['訂單缺料分析清單 (Order Shortage Analysis)'],
        transformationRules: [
          '嚴重缺料 (齊套率 < 80%) 發出告警通知',
          '串接銷售實單，提示受影響之客戶交期',
        ],
      },
      {
        id: 'out_shipping_clearance',
        name: '出貨排程審查與放行',
        subName: 'Ship Schedule Clearance & Release',
        category: 'decision',
        x: 1500,
        y: 450,
        width: 250,
        height: 105,
        icon: CalendarCheck,
        iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30',
        iconColor: 'text-sky-500',
        statusBadge: '放行判定',
        recordCountLabel: '即時放行審查',
        scenarios: ['all', 'sales', 'production'],
        targetTab: 'ship_schedule_clearance',
        responsibilities: '根據成品倉庫與 WIP待驗良品在庫量，判定當前排程之出貨訂單能否放行出貨。',
        formulaDescription: '放行判定 = (成品倉庫良品 + WIP待驗*良率) >= 本批次出貨數量。',
        inputSchema: ['Actual Orders', 'Finished Goods Stock', 'WIP Stock'],
        outputSchema: ['出貨放行許可表 (Clearance Status)'],
        transformationRules: [
          '放行 (Green)：良品庫存充足，允許出貨裝箱',
          '部分放行 (Yellow)：庫存部分滿足，需拆批出貨',
          '凍結/延遲 (Red)：缺料或全檢未完成，禁止放行',
        ],
      },
    ],
    [liveStats]
  );

  // ── Edge Definitions (連接線與數據標籤) ──────────────────────────────────
  const PIPELINE_EDGES: PipelineEdge[] = useMemo(
    () => [
      // 1. Sources to Sanitize Station (五大資料源匯入清洗站)
      {
        id: 'e_item_sanitize',
        fromNodeId: 'source_item_master',
        toNodeId: 'station_sanitize',
        scenarios: ['all', 'sales', 'procurement', 'production'],
      },
      {
        id: 'e_forecast_sanitize',
        fromNodeId: 'source_forecast',
        toNodeId: 'station_sanitize',
        scenarios: ['all', 'sales'],
      },
      {
        id: 'e_order_sanitize',
        fromNodeId: 'source_actual_order',
        toNodeId: 'station_sanitize',
        scenarios: ['all', 'sales', 'production'],
      },
      {
        id: 'e_po_sanitize',
        fromNodeId: 'source_po_transit',
        toNodeId: 'station_sanitize',
        scenarios: ['all', 'procurement'],
      },
      {
        id: 'e_inv_sanitize',
        fromNodeId: 'source_inventory',
        toNodeId: 'station_sanitize',
        scenarios: ['all', 'procurement', 'production'],
      },

      // 2. Sanitize Station to Demand Netting (標準化資料流至沖銷站)
      {
        id: 'e_sanitize_netting',
        fromNodeId: 'station_sanitize',
        toNodeId: 'station_demand_netting',
        label: '標準化數據流',
        badge: '清洗校驗',
        scenarios: ['all', 'sales', 'procurement'],
      },

      // 3. Demand Netting to MRP Core Engine (淨需求矩陣送入 MRP 核心)
      {
        id: 'e_netting_mrp',
        fromNodeId: 'station_demand_netting',
        toNodeId: 'mrp_core',
        label: '淨需求矩陣',
        badge: '逐期淨需求',
        scenarios: ['all', 'sales', 'procurement', 'production'],
      },

      // 4. Direct Sanitize to MRP Core (供給側：庫存與在途直接入算)
      {
        id: 'e_sanitize_mrp_direct',
        fromNodeId: 'station_sanitize',
        toNodeId: 'mrp_core',
        scenarios: ['all', 'procurement', 'production'],
        dashed: true,
      },

      // 5. MRP Core to Outputs (3 大決策放行終端)
      {
        id: 'e_mrp_pr',
        fromNodeId: 'mrp_core',
        toNodeId: 'out_pr_suggestion',
        label: '採購建議 (PR)',
        badge: 'MOQ / LT 逆推',
        scenarios: ['all', 'procurement'],
      },
      {
        id: 'e_mrp_tension',
        fromNodeId: 'mrp_core',
        toNodeId: 'out_order_tension',
        label: '缺料預警',
        badge: '齊套率評估',
        scenarios: ['all', 'production', 'sales'],
      },
      {
        id: 'e_mrp_clearance',
        fromNodeId: 'mrp_core',
        toNodeId: 'out_shipping_clearance',
        label: '出貨放行判定',
        badge: '良品檢驗',
        scenarios: ['all', 'sales', 'production'],
      },
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
      'source_item_master',
      'source_forecast',
      'source_actual_order',
      'source_po_transit',
      'source_inventory',
      'station_sanitize',
      'station_demand_netting',
      'mrp_core',
      'out_pr_suggestion',
      'out_order_tension',
      'out_shipping_clearance',
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

  // Helper for computing SVG Bezier curve path
  const computeBezierPath = (fromNode: WorkstationNode, toNode: WorkstationNode) => {
    // Start at right center of fromNode
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    // End at left center of toNode
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;

    const dx = Math.max(endX - startX, 40);
    const controlX1 = startX + dx * 0.45;
    const controlY1 = startY;
    const controlX2 = endX - dx * 0.45;
    const controlY2 = endY;

    return {
      path: `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[720px] w-full overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ── Top Header Scenario Selector (完全對齊參考圖頂部導覽卡) ──────────── */}
      <div className="flex-none p-4 md:px-6 md:pt-4 md:pb-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md z-10">
        <div className="max-w-[1700px] mx-auto">
          {/* Top Bar: Title & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  數據流程與工作站管線總覽 (Data Pipeline)
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    n8n 視覺化工作站
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  以圖形節點與貝茲連線串接五大資料源、清洗校驗、3 階 MRP 推導運算核心至決策放行終端。
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
                <span className="text-[11px] font-mono font-medium px-2 text-slate-600 dark:text-slate-400">
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
                    className={`text-[11px] line-clamp-1 ${
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
            style={{
              width: '1760px',
              height: '720px',
              transform: `scale(${zoomLevel})`,
            }}
          >
            {/* SVG Bézier Edges Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Arrowhead Markers */}
                <marker
                  id="edge-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-slate-400 dark:fill-slate-500" />
                </marker>
                <marker
                  id="edge-arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" className="fill-indigo-500" />
                </marker>

                {/* Linear Gradients for Flowing Glow Edges */}
                <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#06B6D4" stopOpacity="1" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* Render Visible Edges */}
              {visibleEdges.map((edge) => {
                const fromNode = visibleNodes.find((n) => n.id === edge.fromNodeId);
                const toNode = visibleNodes.find((n) => n.id === edge.toNodeId);
                if (!fromNode || !toNode) return null;

                const { path, midX, midY } = computeBezierPath(fromNode, toNode);
                const isConnectedToSelected =
                  selectedNodeId === edge.fromNodeId || selectedNodeId === edge.toNodeId;

                return (
                  <g key={edge.id} className="transition-opacity duration-300">
                    {/* Base Edge Path */}
                    <path
                      d={path}
                      fill="none"
                      className={`transition-colors duration-200 ${
                        isConnectedToSelected
                          ? 'stroke-indigo-600 dark:stroke-indigo-400 stroke-[2.5]'
                          : edge.dashed
                          ? 'stroke-slate-300 dark:stroke-slate-700/80 stroke-[1.5]'
                          : 'stroke-slate-400/80 dark:stroke-slate-600/80 stroke-[2]'
                      }`}
                      strokeDasharray={edge.dashed ? '5 5' : undefined}
                      markerEnd={isConnectedToSelected ? 'url(#edge-arrow-active)' : 'url(#edge-arrow)'}
                    />

                    {/* Animated Flow Pulse Layer */}
                    {isDynamicFlowActive && (
                      <path
                        d={path}
                        fill="none"
                        stroke="url(#flow-gradient)"
                        strokeWidth="2.5"
                        strokeDasharray="6 14"
                        strokeLinecap="round"
                        style={{
                          animation: 'dash 1.8s linear infinite',
                        }}
                      />
                    )}

                    {/* Edge Label Badge (High Contrast Pill) */}
                    {edge.label && (
                      <foreignObject
                        x={midX - 55}
                        y={midY - 13}
                        width="110"
                        height="26"
                        className="pointer-events-auto"
                      >
                        <div className="flex items-center justify-center h-full">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-md transition-all ${
                              isConnectedToSelected
                                ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/30'
                                : 'bg-slate-700 text-white border-slate-600 dark:bg-slate-800 dark:text-indigo-200 dark:border-indigo-500/50'
                            }`                            }>
                              {edge.label}
                            </span>
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* Sub-node Dashed Connectors (Attached to Stations) */}
              {visibleNodes.map((node) => {
                if (!node.subNodes || node.subNodes.length === 0) return null;
                const parentX = node.x + node.width / 2;
                const parentY = node.y + node.height;

                return node.subNodes.map((sub, idx) => {
                  // 端點幾何必須與下方 HTML 徽章層 (justify-around + pt-14) 完全一致：
                  // 圓心 X = 卡片寬度均分中心；圓心 Y = 卡片底 + 56 (pt-14) + 16 (圖標半徑)
                  const subCount = node.subNodes!.length;
                  const subX = node.x + (node.width * (2 * idx + 1)) / (2 * subCount);
                  const subY = node.y + node.height + 72;

                  return (
                    <g key={sub.id}>
                      <path
                        d={`M ${parentX} ${parentY} C ${parentX} ${parentY + 26}, ${subX} ${subY - 30}, ${subX} ${subY}`}
                        fill="none"
                        className="stroke-slate-400 dark:stroke-slate-600 stroke-[1.5]"
                        strokeDasharray="4 4"
                      />
                    </g>
                  );
                });
              })}
            </svg>

            {/* Workstation Node Cards Layer */}
            {visibleNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isSimulatingActive =
                isSimulating && simulationNodeOrder[simulationStepIndex] === node.id;
              const IconComponent = node.icon;

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => { clearStationHideTimer(); setSelectedNodeId(node.id); }}
                  onMouseLeave={scheduleStationHide}
                  onClick={() => { clearStationHideTimer(); setSelectedNodeId(node.id); }}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    minHeight: `${node.height}px`,
                  }}
                  className={`group cursor-pointer rounded-2xl border-2 transition-all duration-200 z-10 select-none ${
                    isSimulatingActive
                      ? 'ring-4 ring-amber-500 shadow-2xl shadow-amber-500/40 scale-105 bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                      : isSelected
                      ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02] bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-indigo-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Left Input Port (Handle) */}
                  {node.category !== 'source' && (
                    <div
                      className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-500 flex items-center justify-center shadow-sm"
                      title="輸入埠 (Input Port)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    </div>
                  )}

                  {/* Right Output Port (Handle) */}
                  {node.category !== 'decision' && (
                    <div
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-500 flex items-center justify-center shadow-sm"
                      title="輸出埠 (Output Port)"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-3.5">
                    {/* Header Row: Icon + Title + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${node.iconBg}`}>
                          <IconComponent className={`w-4 h-4 ${node.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-extrabold text-slate-950 dark:text-white truncate">
                            {node.name}
                          </h3>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate">
                            {node.subName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata Badges */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80">
                        {node.recordCountLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold border ${
                          node.statusBadge.includes('預警') || node.statusBadge.includes('缺料')
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                            : node.statusBadge.includes('核心')
                            ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {node.statusBadge}
                      </span>
                    </div>
                  </div>

                  {/* Sub-node Badges (Bottom attached bubbles) */}
                  {node.subNodes && node.subNodes.length > 0 && (
                    <div className="absolute top-[100%] left-0 w-full pt-14 flex justify-around pointer-events-auto">
                      {node.subNodes.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <div
                            key={sub.id}
                            className="flex flex-col items-center group/sub"
                            title={`${sub.name}: ${sub.sub}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-md hover:scale-110 hover:border-indigo-500 transition-all">
                              <SubIcon className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 max-w-[85px] text-center truncate">
                              {sub.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Floating Deep Data Inspection Window (數據穿透懸浮視窗，可拖曳) ── */}
        {selectedNode && (
          <div
            ref={inspectorRef}
            onMouseEnter={clearStationHideTimer}
            onMouseLeave={scheduleStationHide}
            className="absolute w-96 md:w-[420px] max-h-[calc(100%-1.5rem)] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col z-30 overflow-hidden"
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
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
                <div className="font-mono text-[11px] bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner leading-relaxed">
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
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block">
                    📥 輸入資料流 (Inputs)
                  </span>
                  <div className="space-y-1">
                    {selectedNode.inputSchema.map((item, idx) => (
                      <span
                        key={idx}
                        className="block font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate"
                      >
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block">
                    📤 輸出資料流 (Outputs)
                  </span>
                  <div className="space-y-1">
                    {selectedNode.outputSchema.map((item, idx) => (
                      <span
                        key={idx}
                        className="block font-mono text-[10px] text-emerald-600 dark:text-emerald-400 truncate"
                      >
                        • {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
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
