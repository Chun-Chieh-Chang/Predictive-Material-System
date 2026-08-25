/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DataTablesView.tsx
 * Supports full inline CRUD editing with 3-level change control:
 *   Level 1 (🟢) - Operational: save immediately
 *   Level 2 (🟡) - MRP-impacting: show impact confirmation modal
 *   Level 3 (🔴) - Engineering spec: require mandatory change reason
 * Includes: Delete Modal with FK impact scan, Add Row, Change Audit Log panel
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Database, Search, Trash2, X, Layers, Cpu, ShieldCheck, Truck,
  PackageCheck, Boxes, FileSpreadsheet, Upload, Plus, Pencil,
  CheckCircle2, AlertTriangle, AlertCircle, History, Lock, XCircle,
  ClipboardList, Beaker,
} from 'lucide-react';
import { SystemDatabase, ChangeAuditEntry } from '../types';
import { exportToExcel } from '../utils/dataExchange';
import {
  TableMeta, FieldMeta, getTableMeta, getPkDisplay, generateAuditId,
  ALL_TABLE_METAS
} from '../utils/fieldMeta';

export type TableKey =
  | 'item_master' | 'mold_master' | 'product_mold_bom'
  | 'demand_forecast_log' | 'actual_order'
  | 'inventory_wip_snapshot' | 'po_in_transit'
  | 'sorting_actual_yield_log';

interface DataTablesViewProps {
  db: SystemDatabase;
  setDb: React.Dispatch<React.SetStateAction<SystemDatabase>>;
  initialTable?: TableKey;
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

// ─── FK Impact Scanner ──────────────────────────────────────────────────────
function scanFkImpact(db: SystemDatabase, tableKey: TableKey, record: Record<string, unknown>): string[] {
  const impacts: string[] = [];
  if (tableKey === 'item_master') {
    const sku = record['sku'] as string;
    const bomCount = db.product_mold_bom.filter(b => b.sku === sku || b.rm_sku === sku).length;
    const demCount = db.demand_forecast_log.filter(f => f.sku === sku).length;
    const orderCount = db.actual_order.filter(o => o.sku === sku).length;
    const invCount = db.inventory_wip_snapshot.filter(i => i.sku === sku).length;
    const poCount = db.po_in_transit.filter(p => p.rm_sku === sku).length;
    if (bomCount) impacts.push(`產品模具成型關聯檔：${bomCount} 筆`);
    if (demCount) impacts.push(`業務預估需求檔：${demCount} 筆`);
    if (orderCount) impacts.push(`實際訂單檔：${orderCount} 筆`);
    if (invCount) impacts.push(`庫存與待驗快照檔：${invCount} 筆`);
    if (poCount) impacts.push(`在途採購訂單檔：${poCount} 筆`);
  } else if (tableKey === 'mold_master') {
    const moldId = record['mold_id'] as string;
    const bomCount = db.product_mold_bom.filter(b => b.mold_id === moldId).length;
    if (bomCount) impacts.push(`產品模具成型關聯檔：${bomCount} 筆`);
  }
  return impacts;
}

// ─── Cell Input Renderer ─────────────────────────────────────────────────────
function CellInput({
  field, value, editRow, db, onChange, error
}: {
  field: FieldMeta;
  value: unknown;
  editRow: Record<string, unknown>;
  db: SystemDatabase;
  onChange: (key: string, val: unknown) => void;
  error?: string;
}) {
  const baseInput = 'w-full px-2 py-1.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-1';
  const normalClass = `${baseInput} bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:border-pms-cobalt focus:ring-pms-cobalt/30`;
  const errorClass = `${baseInput} bg-red-50 dark:bg-red-950/30 border-red-400 text-slate-900 dark:text-white focus:border-red-500 focus:ring-red-500/30`;
  const cls = error ? errorClass : normalClass;

  if (field.inputType === 'checkbox') {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(field.key, e.target.checked)}
          className="w-4 h-4 accent-pms-cobalt cursor-pointer"
        />
      </div>
    );
  }

  if (field.inputType === 'select' && field.options) {
    return (
      <select value={String(value ?? '')} onChange={e => onChange(field.key, e.target.value)} className={cls}>
        {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  if (field.inputType === 'fk_select' && field.fkTable) {
    const fkData = (db as any)[field.fkTable] as Record<string, unknown>[];
    const valueKey = field.fkValueKey || 'id';
    return (
      <select value={String(value ?? '')} onChange={e => onChange(field.key, e.target.value)} className={cls}>
        <option value="">— 請選擇 —</option>
        {fkData.map((item, i) => {
          const v = String(item[valueKey] ?? '');
          return <option key={i} value={v}>{v}</option>;
        })}
      </select>
    );
  }

  if (field.inputType === 'date') {
    return (
      <input type="date" value={String(value ?? '')} onChange={e => onChange(field.key, e.target.value)} className={cls} />
    );
  }

  if (field.inputType === 'number') {
    return (
      <input
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        min={field.min} max={field.max} step={field.step}
        onChange={e => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
        className={`${cls} min-w-[80px]`}
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      maxLength={field.maxLength}
      placeholder={field.placeholder}
      onChange={e => onChange(field.key, e.target.value)}
      className={cls}
    />
  );
}

// ─── Display Cell Value ───────────────────────────────────────────────────────
function displayValue(field: FieldMeta, value: unknown, db: SystemDatabase, record: Record<string, unknown>): React.ReactNode {
  if (value === undefined || value === null || value === '') return <span className="text-slate-400">—</span>;

  if (field.formatDisplay) return <span>{field.formatDisplay(value)}</span>;

  if (field.inputType === 'checkbox') {
    return value
      ? <span className="text-pms-pass font-bold text-sm">✅ 是</span>
      : <span className="text-slate-400 text-sm">☐ 否</span>;
  }

  if (field.inputType === 'select' && field.options) {
    const opt = field.options.find(o => o.value === String(value));
    return <span>{opt ? opt.label : String(value)}</span>;
  }

  // Special display for mold_master: show linked SKUs column
  if (field.key === 'mold_id') {
    const moldId = String(value);
    const linked = db.product_mold_bom.filter(b => b.mold_id === moldId);
    if (linked.length > 0) {
      // Return mold_id value — linked SKUs shown in a separate read-only column
    }
  }

  return <span>{String(value)}</span>;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const DataTablesView: React.FC<DataTablesViewProps> = ({
  db, setDb, initialTable = 'item_master', onNotify
}) => {
  const [activeTable, setActiveTable] = useState<TableKey>(initialTable);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialClassFilter, setMaterialClassFilter] = useState<string>('');

  // Inline Edit State
  const [editingKey, setEditingKey] = useState<string | null>(null); // composite key string
  const [editRow, setEditRow] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Add Row State
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [addRowData, setAddRowData] = useState<Record<string, unknown>>({});
  const [addRowErrors, setAddRowErrors] = useState<Record<string, string>>({});

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    record: Record<string, unknown>;
    index: number;
    fkImpacts: string[];
  } | null>(null);

  // Level 2/3 Save Confirmation Modal State
  const [saveModal, setsaveModal] = useState<{
    level: 2 | 3;
    changedFields: Array<{ field: FieldMeta; oldVal: unknown; newVal: unknown }>;
    reason: string;
    onConfirm: (reason?: string) => void;
  } | null>(null);

  // Audit Log Panel
  const [showAuditLog, setShowAuditLog] = useState(false);

  const tableMeta = useMemo(() => getTableMeta(activeTable) as TableMeta, [activeTable]);
  const tableData = useMemo(() => (db as any)[activeTable] as Record<string, unknown>[], [db, activeTable]);

  const tablesMeta = [
    { key: 'item_master' as TableKey, label: '品號主檔 (含良率/採購規則)', dept: '資材(生管)', count: db.item_master.length, icon: Layers },
    { key: 'mold_master' as TableKey, label: '模具與產能主檔', dept: '製造', count: db.mold_master.length, icon: Cpu },
    { key: 'product_mold_bom' as TableKey, label: '產品模具成型關聯檔', dept: '工程', count: db.product_mold_bom.length, icon: Boxes },
    { key: 'demand_forecast_log' as TableKey, label: '業務預估需求檔', dept: '業務', count: db.demand_forecast_log.length, icon: FileSpreadsheet },
    { key: 'actual_order' as TableKey, label: '實際訂單檔', dept: '業務', count: db.actual_order.length, icon: PackageCheck },
    { key: 'inventory_wip_snapshot' as TableKey, label: '庫存與待驗快照檔', dept: '資材(生管)', count: db.inventory_wip_snapshot.length, icon: Database },
    { key: 'po_in_transit' as TableKey, label: '在途採購訂單檔', dept: '資材(生管)', count: db.po_in_transit.length, icon: Truck },
    { key: 'sorting_actual_yield_log' as TableKey, label: 'Sorting 實際良率紀錄檔', dept: '製造', count: (db as any).sorting_actual_yield_log?.length ?? 0, icon: ClipboardList },
  ];

  const getRecordKey = (record: Record<string, unknown>) =>
    tableMeta.pkFields.map(pk => String(record[pk] ?? '')).join('|');

  const filteredData = useMemo(() => {
    let result = tableData;
    if (materialClassFilter && activeTable === 'item_master') {
      result = result.filter(row => (row['material_class'] ?? '') === materialClassFilter);
    }
    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(term))
    );
  }, [tableData, searchTerm, materialClassFilter, activeTable]);

  // ─── Validate a row using fieldMeta validators ──────────────────────────
  const validateRowData = useCallback((data: Record<string, unknown>, meta: TableMeta) => {
    const errors: Record<string, string> = {};
    for (const field of meta.fields) {
      if (field.editability === 'locked' || field.editability === 'computed') continue;
      const val = data[field.key];
      if (field.required && (val === undefined || val === null || val === '')) {
        errors[field.key] = `${field.label} 為必填欄位`;
        continue;
      }
      if (val !== undefined && val !== null && val !== '' && field.validate) {
        const err = field.validate(val, data);
        if (err) errors[field.key] = err;
      }
    }
    return errors;
  }, []);

  // ─── Start Edit ─────────────────────────────────────────────────────────
  const handleStartEdit = (record: Record<string, unknown>) => {
    setIsAddingRow(false);
    setEditingKey(getRecordKey(record));
    setEditRow({ ...record });
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditRow({});
    setValidationErrors({});
  };

  // ─── Commit Save (after confirmation) ───────────────────────────────────
  const commitSave = (updatedRow: Record<string, unknown>, auditEntries: ChangeAuditEntry[]) => {
    const newData = tableData.map(r =>
      getRecordKey(r) === getRecordKey(updatedRow) ? updatedRow : r
    );
    const newDb = {
      ...db,
      [activeTable]: newData,
      audit_log: [...(db.audit_log || []), ...auditEntries],
    };
    setDb(newDb);
    setEditingKey(null);
    setEditRow({});
    setValidationErrors({});
    onNotify?.(`已成功更新 ${getPkDisplay(tableMeta, updatedRow)}`, 'success');
  };

  // ─── Handle Save Click ───────────────────────────────────────────────────
  const handleSave = (originalRecord: Record<string, unknown>) => {
    const errors = validateRowData(editRow, tableMeta);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Find changed fields and their levels
    const changedFields: Array<{ field: FieldMeta; oldVal: unknown; newVal: unknown }> = [];
    for (const field of tableMeta.fields) {
      if (field.editability === 'locked' || field.editability === 'computed') continue;
      const oldVal = originalRecord[field.key];
      const newVal = editRow[field.key];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changedFields.push({ field, oldVal, newVal });
      }
    }

    if (changedFields.length === 0) {
      handleCancelEdit();
      return;
    }

    const maxLevel = Math.max(...changedFields.map(cf => cf.field.editability as number)) as 1 | 2 | 3;

    const buildAuditEntries = (reason?: string): ChangeAuditEntry[] => {
      return changedFields
        .filter(cf => (cf.field.editability as number) >= 2)
        .map(cf => ({
          id: generateAuditId(),
          timestamp: new Date().toISOString(),
          table_key: activeTable,
          pk_value: getPkDisplay(tableMeta, editRow),
          field_name: cf.field.key,
          field_label: cf.field.label,
          old_value: String(cf.oldVal ?? ''),
          new_value: String(cf.newVal ?? ''),
          change_level: cf.field.editability as 2 | 3,
          reason,
        }));
    };

    if (maxLevel === 1) {
      commitSave(editRow, buildAuditEntries());
    } else {
      setSaveModal({
        level: maxLevel as 2 | 3,
        changedFields,
        reason: '',
        onConfirm: (reason?: string) => {
          commitSave(editRow, buildAuditEntries(reason));
          setSaveModal(null);
        },
      });
    }
  };

  // ─── Handle Delete ───────────────────────────────────────────────────────
  const handleDeleteClick = (record: Record<string, unknown>, index: number) => {
    const fkImpacts = scanFkImpact(db, activeTable, record);
    setDeleteModal({ record, index, fkImpacts });
  };

  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const newData = [...tableData];
    newData.splice(deleteModal.index, 1);
    setDb({ ...db, [activeTable]: newData });
    setDeleteModal(null);
    onNotify?.(`已刪除 ${getPkDisplay(tableMeta, deleteModal.record)}`, 'success');
  };

  // ─── Handle Add Row ──────────────────────────────────────────────────────
  const handleStartAdd = () => {
    setEditingKey(null);
    const defaults: Record<string, unknown> = {};
    for (const field of tableMeta.fields) {
      if (field.inputType === 'checkbox') defaults[field.key] = false;
      else if (field.inputType === 'select' && field.options?.length) defaults[field.key] = field.options[0].value;
      else defaults[field.key] = '';
    }
    setAddRowData(defaults);
    setAddRowErrors({});
    setIsAddingRow(true);
  };

  const handleAddRowChange = (key: string, val: unknown) => {
    setAddRowData(prev => ({ ...prev, [key]: val }));
    setAddRowErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleConfirmAdd = () => {
    const errors = validateRowData(addRowData, tableMeta);
    // Check PK uniqueness
    const pk = getPkDisplay(tableMeta, addRowData);
    const duplicate = tableData.some(r => getPkDisplay(tableMeta, r) === pk);
    if (duplicate) {
      const firstPk = tableMeta.pkFields[0];
      errors[firstPk] = `主鍵 "${pk}" 已存在，請使用不同的值`;
    }
    if (Object.keys(errors).length > 0) {
      setAddRowErrors(errors);
      return;
    }
    setDb({ ...db, [activeTable]: [...tableData, addRowData] });
    setIsAddingRow(false);
    setAddRowData({});
    onNotify?.(`已成功新增 ${pk}`, 'success');
  };

  const handleCancelAdd = () => { setIsAddingRow(false); setAddRowData({}); setAddRowErrors({}); };

  // ─── Edit Row Cell Change ────────────────────────────────────────────────
  const handleEditChange = (key: string, val: unknown) => {
    setEditRow(prev => ({ ...prev, [key]: val }));
    setValidationErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ─── Save Modal State setter (needed for closure) ────────────────────────
  const [_saveModal, setSaveModal] = useState<typeof saveModal>(null);
  const activeSaveModal = _saveModal;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-pms-cobalt-light dark:bg-blue-950 text-pms-cobalt dark:text-blue-400 border border-sky-200 dark:border-blue-800/60 text-sm font-mono font-bold px-2 py-0.5 rounded-md">
              SSOT DATA HUB
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{tablesMeta.length} 大核心資料庫即時維護中心</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            遵循 SSOT 與 MECE 原則 ·
            <span className="text-pms-pass dark:text-emerald-400 font-semibold mx-1">🟢 即時儲存</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold mx-1">🟡 影響確認</span>
            <span className="text-red-600 dark:text-red-400 font-semibold mx-1">🔴 工程變更</span>
            三級管控 · 🔒 主鍵鎖定
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {activeTable === 'item_master' && (
            <select value={materialClassFilter} onChange={e => setMaterialClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:border-blue-500 focus:outline-none">
              <option value="">全部分類</option>
              <option value="RAW">🌿 原料類</option>
              <option value="MAT">📦 物料類</option>
              <option value="PART">⚙️ 零件類</option>
              <option value="COMP">🔧 組件類</option>
              <option value="SET">📋 SET 類</option>
            </select>
          )}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋品號、模具、客戶..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none w-48 sm:w-64 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAuditLog(v => !v)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${showAuditLog ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-50'}`}
          >
            <History className="w-3.5 h-3.5" />
            <span>變更歷程 ({(db.audit_log || []).length})</span>
          </button>
          <button
            onClick={() => exportToExcel(db)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯出 Excel</span>
          </button>
        </div>
      </div>

      {/* ── Audit Log Panel ──────────────────────────────────────────────── */}
      {showAuditLog && (
        <div className="bg-white dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>變更稽核日誌</span>
              <span className="text-sm font-mono text-slate-500">({(db.audit_log || []).length} 筆)</span>
            </h3>
            <button onClick={() => setShowAuditLog(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          {(db.audit_log || []).length === 0 ? (
            <p className="text-sm text-slate-500 italic">尚無變更記錄。所有 Level 2/3 欄位的異動將自動記錄於此。</p>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">時間</th>
                    <th className="px-3 py-2 text-left">資料表</th>
                    <th className="px-3 py-2 text-left">主鍵</th>
                    <th className="px-3 py-2 text-left">欄位</th>
                    <th className="px-3 py-2 text-left">舊值</th>
                    <th className="px-3 py-2 text-left">新值</th>
                    <th className="px-3 py-2 text-left">等級</th>
                    <th className="px-3 py-2 text-left">變更原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...(db.audit_log || [])].reverse().map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{entry.timestamp.replace('T', ' ').slice(0, 19)}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{entry.table_key}</td>
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{entry.pk_value}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{entry.field_label}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400 line-through">{entry.old_value}</td>
                      <td className="px-3 py-2 text-pms-pass dark:text-emerald-400 font-semibold">{entry.new_value}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${entry.change_level === 3 ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'}`}>
                          L{entry.change_level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 italic">{entry.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Table Selector Pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {tablesMeta.map(t => {
          const Icon = t.icon;
          const isActive = activeTable === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTable(t.key); setSearchTerm(''); setEditingKey(null); setIsAddingRow(false); }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer ${isActive
                ? 'bg-pms-cobalt-light text-pms-cobalt border-pms-cobalt font-bold shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-600'
                : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-pms-bg-subtle dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white hover:border-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-pms-cobalt dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${isActive ? 'bg-pms-cobalt/20 text-pms-cobalt dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{t.dept}</span>
              <span className={`text-sm px-2 py-0.5 rounded-full font-mono font-bold ${isActive ? 'bg-pms-cobalt text-white dark:bg-sky-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active Table Container ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center space-x-2 flex-wrap gap-1">
            <span>{tableMeta.label}</span>
            <span className="bg-pms-cobalt-light text-pms-cobalt border border-sky-300 dark:border-sky-500/20 text-sm px-2 py-0.5 rounded font-sans font-semibold">
              權責: {tablesMeta.find(t => t.key === activeTable)?.dept}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-sm">({activeTable})</span>
            {tableMeta.compositeKey && (
              <span className="text-sm bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-sans">複合主鍵</span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">共 {tableData.length} 筆</span>
            <button
              onClick={handleStartAdd}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-pms-cobalt hover:bg-pms-cobalt-hover text-white rounded-xl text-sm font-bold shadow-sm shadow-sky-600/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增一筆</span>
            </button>
          </div>
        </div>

        {/* Table Container with Always-On Freeze Panes */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-sm relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 shadow-xs">
              <tr>
                {tableMeta.fields.map((field, fIdx) => {
                  const isFirstCol = fIdx === 0;
                  return (
                    <th
                      key={field.key}
                      className={`px-3 py-3 whitespace-nowrap ${
                        isFirstCol
                          ? 'sticky top-0 left-0 z-30 bg-slate-100 dark:bg-slate-900 freeze-shadow-right'
                          : ''
                      }`}
                    >
                      <span className={
                        field.editability === 'locked' ? 'text-slate-400 dark:text-slate-500' :
                        field.editability === 3 ? 'text-red-600 dark:text-red-400' :
                        field.editability === 2 ? 'text-amber-600 dark:text-amber-400' :
                        field.editability === 1 ? 'text-slate-600 dark:text-slate-400' :
                        'text-slate-400 dark:text-slate-500 italic'
                      }>
                        {field.editability === 'locked' ? '🔒 ' : ''}
                        {field.editability === 3 ? '🔴 ' : ''}
                        {field.editability === 2 ? '🟡 ' : ''}
                        {field.editability === 1 ? '🟢 ' : ''}
                        {field.editability === 'computed' ? '⚙️ ' : ''}
                        {field.label}
                      </span>
                    </th>
                  );
                })}
                <th className="sticky top-0 right-0 z-30 bg-slate-100 dark:bg-slate-900 px-3 py-3 text-center whitespace-nowrap text-slate-600 dark:text-slate-400 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.1)]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* ── Add Row ─────────────────────────────────────────────── */}
              {isAddingRow && (
                <tr className="bg-sky-50/60 dark:bg-sky-950/30 border-b-2 border-pms-cobalt/30">
                  {tableMeta.fields.map(field => (
                    <td key={field.key} className="px-3 py-2.5">
                      {field.editability === 'computed' ? (
                        <span className="text-slate-400 italic text-sm">自動計算</span>
                      ) : (
                        <div>
                          <CellInput field={field} value={addRowData[field.key]} editRow={addRowData} db={db} onChange={handleAddRowChange} error={addRowErrors[field.key]} />
                          {addRowErrors[field.key] && <p className="text-red-500 text-[10px] mt-0.5">{addRowErrors[field.key]}</p>}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button onClick={handleConfirmAdd} className="flex items-center space-x-1 px-2.5 py-1 bg-pms-pass hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer"><CheckCircle2 className="w-3 h-3" /><span>確認新增</span></button>
                      <button onClick={handleCancelAdd} className="flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm cursor-pointer"><XCircle className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── Data Rows ────────────────────────────────────────────── */}
              {filteredData.map((record, idx) => {
                const rowKey = getRecordKey(record);
                const isEditing = editingKey === rowKey;

                return (
                  <tr key={rowKey} className={`transition-colors group ${isEditing ? 'bg-amber-50/50 dark:bg-amber-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
                    {tableMeta.fields.map((field, fIdx) => {
                      const isFirstCol = fIdx === 0;
                      return (
                        <td
                          key={field.key}
                          className={`px-3 py-2.5 font-mono ${
                            isFirstCol
                              ? 'sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md freeze-shadow-right group-hover:bg-slate-50 dark:group-hover:bg-slate-850'
                              : ''
                          }`}
                          title={`[${field.label}] ${String(record[field.key] ?? '—')}`}
                        >
                          {isEditing ? (
                            field.editability === 'locked' ? (
                              <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span className="font-bold text-slate-900 dark:text-white">{String(record[field.key] ?? '—')}</span>
                              </span>
                            ) : field.editability === 'computed' ? (
                              <span className="text-slate-400 italic text-sm">自動計算</span>
                            ) : (
                              <div>
                                <CellInput field={field} value={editRow[field.key]} editRow={editRow} db={db} onChange={handleEditChange} error={validationErrors[field.key]} />
                                {validationErrors[field.key] && <p className="text-red-500 text-[10px] mt-0.5">{validationErrors[field.key]}</p>}
                              </div>
                            )
                          ) : (
                            <span className={
                              tableMeta.pkFields.includes(field.key)
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'text-slate-700 dark:text-slate-300'
                            }>
                              {displayValue(field, record[field.key], db, record)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2.5 text-center shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 dark:group-hover:bg-slate-850">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleSave(record)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-pms-pass hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>儲存</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center space-x-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(record)}
                            className="text-slate-400 hover:text-pms-cobalt dark:hover:text-sky-400 p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                            title="編輯此筆"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record, idx)}
                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="刪除此筆"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && !isAddingRow && (
                <tr>
                  <td colSpan={tableMeta.fields.length + 1} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 font-sans text-sm italic">
                    {searchTerm ? `找不到符合「${searchTerm}」的記錄` : `${tableMeta.label} 尚無資料。點擊「新增一筆」開始建立。`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Show Edit button on hover by making row a group */}
        <style>{`
          tbody tr { position: relative; }
          tbody tr .opacity-0 { opacity: 0; }
          tbody tr:hover .opacity-0 { opacity: 1; }
        `}</style>
      </div>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">確認刪除</h3>
                <p className="text-sm text-slate-500">此操作無法復原</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-sm">
              <p className="text-slate-700 dark:text-slate-300">您即將刪除：</p>
              <p className="font-bold text-slate-900 dark:text-white mt-1 font-mono">{tableMeta.label} — {getPkDisplay(tableMeta, deleteModal.record)}</p>
            </div>

            {deleteModal.fkImpacts.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-sm space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>⚠️ 下列資料表存在關聯記錄，刪除後 FK 參照將失效：</span>
                </p>
                {deleteModal.fkImpacts.map((imp, i) => (
                  <p key={i} className="text-amber-800 dark:text-amber-300 pl-5">• {imp}</p>
                ))}
                <p className="text-amber-700 dark:text-amber-400 font-semibold pt-1">建議先清理下游關聯記錄後再執行刪除。</p>
              </div>
            )}

            <div className="flex space-x-2 pt-1">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                取消
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-red-600/20">
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Level 2/3 Save Confirmation Modal ───────────────────────────── */}
      {activeSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSaveModal(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSaveModal.level === 3 ? 'bg-red-100 dark:bg-red-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                {activeSaveModal.level === 3 ? <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> : <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeSaveModal.level === 3 ? '🔴 工程變更確認' : '🟡 影響說明確認'}
                </h3>
                <p className="text-sm text-slate-500">
                  {activeSaveModal.level === 3 ? '此修改涉及工程規格，請填寫變更原因後確認' : '此修改將影響 MRP 計算結果，請確認後繼續'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">異動欄位：</p>
              {activeSaveModal.changedFields.map(({ field, oldVal, newVal }) => (
                <div key={field.key} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {field.editability === 3 ? '🔴 ' : '🟡 '}{field.label}
                  </p>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-red-600 dark:text-red-400 line-through">{field.formatDisplay ? field.formatDisplay(oldVal) : String(oldVal ?? '—')}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-pms-pass dark:text-emerald-400 font-bold">{field.formatDisplay ? field.formatDisplay(newVal) : String(newVal ?? '—')}</span>
                  </div>
                </div>
              ))}
            </div>

            {activeSaveModal.level === 3 && (
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  變更原因 <span className="text-red-500">*（必填）</span>
                </label>
                <textarea
                  value={activeSaveModal.reason}
                  onChange={e => setSaveModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  placeholder="請說明此工程變更的原因（如：量測數據更新、設計優化、PPQV 驗證後調整...）"
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-red-400 focus:outline-none resize-none placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="flex space-x-2 pt-1">
              <button onClick={() => setSaveModal(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                取消修改
              </button>
              <button
                onClick={() => activeSaveModal.level === 3 && !activeSaveModal.reason.trim() ? undefined : activeSaveModal.onConfirm(activeSaveModal.reason || undefined)}
                disabled={activeSaveModal.level === 3 && !activeSaveModal.reason.trim()}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-lg ${
                  activeSaveModal.level === 3 && !activeSaveModal.reason.trim()
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    : activeSaveModal.level === 3
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                }`}
              >
                {activeSaveModal.level === 3 ? '確認工程變更' : '確認儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
