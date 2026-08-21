import React, { useState, useRef } from 'react';
import { SystemDatabase } from '../types';
import { DEMO_SAMPLE_DATABASE, EMPTY_DATABASE } from '../data/seedData';
import {
  exportToExcel,
  downloadFormalTemplateExcel,
  downloadDemoSampleExcel,
  downloadTemplateExcel,
  exportToJSON,
  importFromExcel,
  importFromJSON,
  ValidationReport
} from '../utils/dataExchange';
import {
  FileSpreadsheet,
  FileCode,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database,
  Layers
} from 'lucide-react';

interface DataExchangeViewProps {
  db: SystemDatabase;
  setDb: React.Dispatch<React.SetStateAction<SystemDatabase>>;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DataExchangeView: React.FC<DataExchangeViewProps> = ({
  db,
  setDb,
  onNotify
}) => {
  const [dryRunReport, setDryRunReport] = useState<ValidationReport | null>(null);
  const [pendingDB, setPendingDB] = useState<SystemDatabase | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [detectedFormat, setDetectedFormat] = useState<'excel' | 'json' | null>(null);

  // Manual JSON paste input
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');

  const universalFileInputRef = useRef<HTMLInputElement>(null);

  // Universal File Processor (handles both .xlsx/.xls and .json)
  const processUniversalFile = async (file: File) => {
    setIsProcessing(true);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setDetectedFormat('excel');
        const { db: newDb, report } = await importFromExcel(file, db);
        setDryRunReport(report);
        setPendingDB(newDb);
        if (report.success) {
          onNotify(`Excel 檔案「${file.name}」解析預檢通過，共驗證 ${Object.keys(report.importedCounts).length} 個工作表！`, 'success');
        } else {
          onNotify(`Excel 解析失敗: ${report.errors.join(', ')}`, 'error');
        }
      } else if (fileName.endsWith('.json')) {
        setDetectedFormat('json');
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (!content) return;
          const { db: newDb, report } = importFromJSON(content, db);
          setDryRunReport(report);
          setPendingDB(newDb);
          if (report.success) {
            onNotify(`JSON 備份檔「${file.name}」解析預檢通過，共驗證 ${Object.keys(report.importedCounts).length} 個主檔！`, 'success');
          } else {
            onNotify(`JSON 解析失敗: ${report.errors.join(', ')}`, 'error');
          }
        };
        reader.readAsText(file);
      } else {
        onNotify('不支援的檔案格式，請上傳 .xlsx, .xls 或 .json 檔案！', 'error');
      }
    } catch (err: any) {
      onNotify(`檔案處理錯誤: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUniversalFile(file);
    }
    // reset input value so re-selecting same file triggers onChange
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUniversalFile(file);
    }
  };

  // Handle Text Paste JSON Precheck
  const handleJsonPastePrecheck = () => {
    if (!jsonInput.trim()) {
      onNotify('請先貼上 JSON 內容', 'error');
      return;
    }
    setDetectedFormat('json');
    const { db: newDb, report } = importFromJSON(jsonInput, db);
    setDryRunReport(report);
    setPendingDB(newDb);
    if (report.success) {
      onNotify(`JSON 貼上內容預檢通過，共驗證 ${Object.keys(report.importedCounts).length} 個主檔！`, 'success');
      setShowPasteModal(false);
    } else {
      onNotify('JSON 格式錯誤，無法解析', 'error');
    }
  };

  // Apply Upsert
  const handleApplyImport = () => {
    if (pendingDB) {
      setDb(pendingDB);
      setDryRunReport(null);
      setPendingDB(null);
      setDetectedFormat(null);
      onNotify('資料庫已成功安全覆蓋更新 (Upsert) 並驅動最新排程！', 'success');
    }
  };

  // Load Demo Sample Database (示範演練數據)
  const handleLoadDemoSample = () => {
    if (window.confirm('確定要載入「示範演練數據包 (SAMPLE)」嗎？此操作將載入包含 T接頭、模具與在途採購的完整演練資料。')) {
      setDb(JSON.parse(JSON.stringify(DEMO_SAMPLE_DATABASE)));
      setDryRunReport(null);
      setPendingDB(null);
      setDetectedFormat(null);
      onNotify('已成功載入「示範演練數據包 (SAMPLE)」，各功能模組已驅動示範數據！', 'success');
    }
  };

  // Clear Database to Clean State (清空全庫回歸純淨狀態)
  const handleClearDatabase = () => {
    if (window.confirm('【警告】確定要清空全庫所有主檔與訂單記錄嗎？清空後系統將回歸純淨無資料狀態，供您匯入正式生產 Excel。')) {
      setDb(JSON.parse(JSON.stringify(EMPTY_DATABASE)));
      setDryRunReport(null);
      setPendingDB(null);
      setDetectedFormat(null);
      onNotify('已清空全庫資料，系統目前為純淨空庫狀態！', 'info');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-50 dark:bg-emerald-950 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-sm font-bold px-2.5 py-0.5 rounded-md font-mono">
              LOSSLESS DATA GATEWAY
            </span>
            <span className="text-sm text-slate-500">雙向資料交換中心</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Excel & JSON 雙向匯入 / 匯出平台</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            嚴格區分「正式生產檔案」與「示範演練測試包」，支援 9 大工作表智慧辨識匯入、Dry-Run 預檢與 Upsert 安全覆蓋
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleLoadDemoSample}
            id="exchange-load-demo-btn"
            title="載入包含品號與訂單的完整演練資料包"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7] dark:text-sky-400" />
            <span>載入示範演練數據 (SAMPLE)</span>
          </button>

          <button
            onClick={handleClearDatabase}
            id="exchange-clear-db-btn"
            title="清空所有主檔與訂單，回歸純淨空庫狀態"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>清空全庫 (純淨空庫)</span>
          </button>
        </div>
      </div>

      {/* Main Section: 4 Cards Horizontal Layout */}
      <div className="grid grid-cols-12 gap-4">

        {/* Card 1: Formal Production Excel */}
        <div className="col-span-12 xl:col-span-3 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">正式生產部署專區</h3>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">PROD</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">供各權責單位填報真實資料</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>00_勾稽字典 + 9 大工作表</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">純淨無任何模擬假資料，附帶各部門權責與欄位約束</p>
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                downloadTemplateExcel();
                onNotify('正式空白匯入範本已成功匯出，可直接分發給各權責單位！', 'success');
              }}
              id="exchange-download-formal-template-btn"
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>匯出正式空白範本 (.xlsx)</span>
            </button>

            <button
              onClick={() => {
                exportToExcel(db, '料事如神系統_正式生產資料庫.xlsx');
                onNotify('目前系統正式資料庫已成功匯出！', 'success');
              }}
              id="exchange-export-prod-excel-btn"
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 font-semibold text-sm border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>匯出系統完整資料庫 (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Offline Demo / Training Sample Package */}
        <div className="col-span-12 xl:col-span-3 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-[#0284c7] dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">離線示範演練測試包</h3>
                <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-[#0284c7] dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">SAMPLE</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">人員培訓、系統演練、功能驗證</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            包含醫療射出成型完整主檔（T接頭、16穴主力模、在途海運訂單與 3 階 MRP 數據鏈）。
          </p>

          <div className="space-y-2">
            <button
              onClick={() => {
                downloadDemoSampleExcel();
                onNotify('離線示範演練測試包已成功匯出，標明 SAMPLE 供演練使用！', 'success');
              }}
              id="exchange-download-demo-btn"
              className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/80 text-[#0284c7] dark:text-sky-200 font-semibold text-sm border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0284c7] dark:text-sky-400" />
              <span>匯出示範演練數據包 (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Card 3: JSON Export */}
        <div className="col-span-12 xl:col-span-3 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-blue-500/10 text-[#0284c7] dark:text-blue-400 border border-sky-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">JSON 資料備份匯出</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">系統完整資料庫快照 (.json)</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 text-cyan-300 rounded-xl font-mono text-sm overflow-hidden max-h-20 border border-slate-800">
            <pre>{JSON.stringify(db, null, 2).slice(0, 200)} ...</pre>
          </div>

          <button
            onClick={() => {
              exportToJSON(db);
              onNotify('全庫系統 JSON 備份檔已成功匯出！', 'success');
            }}
            id="exchange-export-json-btn"
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯出完整系統 JSON 備份檔 (.json)</span>
          </button>
        </div>

        {/* Card 4: Excel & JSON Smart Import with Dry-Run */}
        <div className="col-span-12 xl:col-span-3 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 flex flex-col justify-between space-y-4">

          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">智慧匯入與 Dry-Run 預檢</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    自動辨識 <span className="text-emerald-400 font-semibold">.xlsx</span> / <span className="text-blue-400 font-semibold">.json</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-[#059669] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">.xlsx</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-blue-950 text-[#0284c7] dark:text-blue-400 border border-sky-200 dark:border-blue-800">.json</span>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onClick={() => universalFileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-950/60 hover:bg-indigo-50/30'
              }`}
            >
              <input
                type="file"
                ref={universalFileInputRef}
                accept=".xlsx, .xls, .json, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-[#059669] dark:text-emerald-400" />
                </div>
                <div className="text-slate-400 font-bold text-sm">+</div>
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-blue-950/60 border border-sky-300 dark:border-blue-800/80 flex items-center justify-center">
                  <FileCode className="w-4 h-4 text-[#0284c7] dark:text-blue-400" />
                </div>
              </div>

              <div className="text-sm font-bold text-slate-800 dark:text-white">
                點擊或拖曳檔案至此
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                支援 .xlsx / .xls / .json · 自動 Dry-Run 預檢
              </div>

              <div className="mt-2 flex items-center justify-center space-x-2 text-[10px] text-slate-400">
                <span className="flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span>多工作表對齊</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-blue-400" /><span>PK/FK 校驗</span></span>
                <span>•</span>
                <span className="flex items-center space-x-1"><CheckCircle2 className="w-3 h-3 text-indigo-400" /><span>Upsert 安全覆蓋</span></span>
              </div>
            </div>

            {/* Quick JSON Paste Link */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 truncate mr-2">需要直接貼上原始 JSON 代碼？</span>
              <button
                onClick={() => setShowPasteModal(true)}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 shrink-0"
              >
                開啟貼上區
              </button>
            </div>
          </div>

          {/* Dry-Run Precheck Report Box */}
          {dryRunReport ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#059669] dark:text-emerald-400" />
                  <span>Dry-Run 預檢報告</span>
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                    dryRunReport.success
                      ? 'text-[#059669] bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800/60'
                      : 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800/60'
                  }`}
                >
                  {dryRunReport.success ? '格式驗證通過' : '驗證未通過'}
                </span>
              </div>

              {Object.keys(dryRunReport.importedCounts).length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 text-sm font-mono">
                  {Object.entries(dryRunReport.importedCounts).map(([table, count]) => (
                    <div key={table} className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 shadow-xs">
                      <div className="text-slate-500 dark:text-slate-400 text-[10px] truncate" title={table}>{table}</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{count} 筆</div>
                    </div>
                  ))}
                </div>
              )}

              {dryRunReport.errors.length > 0 && (
                <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm space-y-0.5">
                  <div className="font-bold">❌ 錯誤清單：</div>
                  {dryRunReport.errors.slice(0, 3).map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              {dryRunReport.success && (
                <div className="pt-1 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">確認後將執行安全覆蓋更新</span>
                  <button
                    onClick={handleApplyImport}
                    id="exchange-confirm-import-btn"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] shadow-md shadow-emerald-600/20 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>確認寫入系統</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center space-x-2 min-w-0">
                <Database className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">尚未載入檔案，請拖曳或選取檔案</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-2">STANDBY</span>
            </div>
          )}
        </div>

      </div>

      {/* Modal for Raw JSON Text Paste */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">直接貼上 JSON 原始代碼</h4>
                  <p className="text-sm text-slate-400">支援貼上包含 8 大主檔陣列之標準 JSON 物件</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕ 關閉
              </button>
            </div>

            <textarea
              rows={8}
              placeholder='請在此貼上完整 JSON 物件，例如: { "item_master": [...], "mold_master": [...] }'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full p-3.5 bg-slate-950 text-cyan-300 font-mono text-sm rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-hidden placeholder:text-slate-700"
            />

            <div className="flex items-center justify-between pt-2">
              {jsonInput && (
                <button
                  onClick={() => setJsonInput('')}
                  className="text-sm text-slate-500 hover:text-slate-300"
                >
                  清空內容
                </button>
              )}
              <div className="flex items-center space-x-2 ml-auto">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
                >
                  取消
                </button>
                <button
                  onClick={handleJsonPastePrecheck}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>執行 Dry-Run 預檢</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
