import React, { useState, useMemo } from 'react';
import {
  Plus, X, CheckCircle2, AlertCircle, FolderOpen, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import type { MaterialClass, MaterialClassCode } from '../types';
import {
  DEFAULT_MATERIAL_CLASSES,
  MATERIAL_CLASS_LABELS,
} from '../types';
import {
  isValidClassCode,
  buildClassPath,
  addMaterialClass,
  toggleMaterialClass,
  type ClassAddPayload,
} from '../utils/materialClassValidation';

interface Props {
  classes?: MaterialClass[];
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// 視覺配色：各分類對應 Tailwind 色系
const CLASS_COLOR_MAP: Record<MaterialClassCode, { bg: string; border: string; text: string; darkBg: string; darkBorder: string }> = {
  RAW:  { bg: 'bg-sky-50',      border: 'border-sky-200',       text: 'text-sky-700',     darkBg: 'dark:bg-sky-950/40',   darkBorder: 'dark:border-sky-700' },
  MAT:  { bg: 'bg-amber-50',    border: 'border-amber-200',     text: 'text-amber-700',   darkBg: 'dark:bg-amber-950/40', darkBorder: 'dark:border-amber-700' },
  PART: { bg: 'bg-emerald-50',  border: 'border-emerald-200',   text: 'text-emerald-700', darkBg: 'dark:bg-emerald-950/40', darkBorder: 'dark:border-emerald-700' },
  COMP: { bg: 'bg-violet-50',   border: 'border-violet-200',    text: 'text-violet-700',  darkBg: 'dark:bg-violet-950/40', darkBorder: 'dark:border-violet-700' },
  SET:  { bg: 'bg-rose-50',     border: 'border-rose-200',      text: 'text-rose-700',    darkBg: 'dark:bg-rose-950/40',  darkBorder: 'dark:border-rose-700' },
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  raw: '原料採購', material: '包材管理', part: '零件生產', component: '組裝生產', set: '成品出貨',
};

export function MaterialClassManagementView({ classes: propClasses, onNotify }: Props) {
  const [classes, setClasses] = useState<MaterialClass[]>(() => {
    try {
      const saved = localStorage.getItem('PMS_MATERIAL_CLASSES_V1');
      return saved ? JSON.parse(saved) : DEFAULT_MATERIAL_CLASSES;
    } catch { return DEFAULT_MATERIAL_CLASSES; }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayload, setNewPayload] = useState<ClassAddPayload>({
    code: '', name: '', sort_order: 99, business_type: 'raw',
  });

  //  Persist
  React.useEffect(() => {
    localStorage.setItem('PMS_MATERIAL_CLASSES_V1', JSON.stringify(classes));
  }, [classes]);

  const handleAdd = () => {
    const result = addMaterialClass(classes, newPayload);
    if (result.error) { onNotify?.(result.error, 'error'); return; }
    setClasses(result.classes);
    setShowAddModal(false);
    setNewPayload({ code: '', name: '', sort_order: 99, business_type: 'raw' });
    onNotify?.(`已新增分類「${newPayload.name}」`, 'success');
  };

  const handleToggle = (code: string) => {
    setClasses(toggleMaterialClass(classes, code));
  };

  const rootClasses = useMemo(() => classes.filter(c => !c.parent_code), [classes]);
  const childMap = useMemo(() => {
    const map = new Map<string, MaterialClass[]>();
    classes.forEach(c => { if (c.parent_code) (map.get(c.parent_code) ?? []).push(c); });
    return map;
  }, [classes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-500" />
            物料分類體系管理
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            五層核心分類（原料類 / 物料類 / 零件類 / 組件類 / SET 類），支援無限子節點擴充
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> 新增分類
        </button>
      </div>

      {/* Classification Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rootClasses.map(root => (
          <ClassificationCard
            key={root.code}
            node={root}
            children={childMap.get(root.code) ?? []}
            allClasses={classes}
            onToggle={() => handleToggle(root.code)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          分類體系匯入規格說明
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
          <p>• <span className="font-mono font-bold text-slate-800 dark:text-slate-200">material_class</span> 欄位：填寫代碼（RAW/MAT/PART/COMP/SET）</p>
          <p>• <span className="font-mono font-bold text-slate-800 dark:text-slate-200">SKU 前綴</span> 自動推斷：如 A01- 推測為 SET，RM- 推測為 RAW</p>
          <p>• 未匹配前綴的品號會在匯入預檢時標示為待分類</p>
          <p>• 匯出 JSON 備份檔時會同步匯出 material_classes 陣列，匯入時自動合併</p>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white">新增分類節點</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">分類代碼 <span className="text-rose-500">*</span></label>
                <input value={newPayload.code} onChange={e => setNewPayload(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SUB" disabled={!!newPayload.code}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-sky-500" />
                <p className="text-xs text-slate-400 mt-1">首次定義需為大寫英文字母，建議 2–4 碼</p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">中文名稱 <span className="text-rose-500">*</span></label>
                <input value={newPayload.name} onChange={e => setNewPayload(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">父分類</label>
                <select value={newPayload.parent_code ?? ''} onChange={e => setNewPayload(p => ({ ...p, parent_code: e.target.value || undefined }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500">
                  <option value="">— 無（頂層節點）—</option>
                  {classes.map(c => <option key={c.code} value={c.code}>{MATERIAL_CLASS_LABELS[c.code] ?? c.code} {c.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">業務處理模式</label>
                <select value={newPayload.business_type} onChange={e => setNewPayload(p => ({ ...p, business_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500">
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">說明</label>
                <textarea value={newPayload.description ?? ''} onChange={e => setNewPayload(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">取消</button>
              <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-colors"><CheckCircle2 className="w-3.5 h-3.5" />確認新增</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single Node Card ──────────────────────────────────────────────────────────

function ClassificationCard({ node, children, allClasses, onToggle }: {
  node: MaterialClass;
  children: MaterialClass[];
  allClasses: MaterialClass[];
  onToggle: () => void;
}) {
  const colors = CLASS_COLOR_MAP[node.code] ?? CLASS_COLOR_MAP.SET;
  const path = buildClassPath(allClasses, node.code);

  return (
    <div className={`p-4 rounded-xl border ${colors.bg} ${colors.border} ${colors.darkBg} ${colors.darkBorder} space-y-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className={`w-4 h-4 ${colors.text} shrink-0`} />
          <div>
            <div className={`font-bold text-sm ${colors.text}`}>{node.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{node.code}</div>
          </div>
        </div>
        <button onClick={onToggle} title={node.is_active ? '停用此分類' : '啟用此分類'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${node.is_active ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300'}`}>
          {node.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[2.5rem]">{node.description}</p>

      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
        <ArrowRight className="w-3 h-3 shrink-0" />
        <span className="font-mono truncate">{path}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${colors.bg} ${colors.border} ${colors.text} ${colors.darkBg} ${colors.darkBorder}`}>
          {BUSINESS_TYPE_LABELS[node.business_type] ?? node.business_type}
        </span>
        {!node.is_active && <span className="text-xs text-slate-400">已停用</span>}
      </div>

      {/* Sub-nodes */}
      {children.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
          {children.map(child => (
            <div key={child.code} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${child.is_active ? 'bg-white/60 dark:bg-slate-800/40' : 'bg-slate-100 dark:bg-slate-800/20 opacity-60'}`}>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-500 dark:text-slate-500 w-10">{child.code}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{child.name}</span>
            </div>
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="text-xs text-slate-400 italic py-1">可按此節點新增子分類（未來功能）</div>
      )}
    </div>
  );
}
