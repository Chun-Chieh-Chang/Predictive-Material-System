/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Upload,
  Check,
  BookOpen,
  Code,
  ShieldCheck,
  CheckCircle2,
  Table,
  Target,
  ExternalLink,
} from 'lucide-react';
import { PMS_VERSION } from '../utils/version';

interface PrdDocViewProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  onNavigateToSpec?: () => void;
}

export const PrdDocView: React.FC<PrdDocViewProps> = ({ onNotify, onNavigateToSpec }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'rich' | 'dictionary' | 'markdown'>('matrix');
  const [copied, setCopied] = useState<boolean>(false);

  const prdMarkdownContent = `# 料事如神系統 (PMS) — 產品需求規格書與 15 大核心目標核查驗收總表 (PRD & Verification Master Specification)
**文件編號 (Document No)**: PMS-PRD-OBJ-20260824-V1.3
**系統版本 (Version)**: ${PMS_VERSION}
**發布日期**: 2026-08-24  
**文件定位**: 正式取代先前所有 PRD 設計草案，作為本專案唯一驗收基準 (Single Source of Truth)  
**核心準則**: 第一性原理 (First-Principles) · 零諂媚客觀驗證 (Zero-Sycophancy) · 奧卡姆剃刀 (Simplicity First)  

---

## 🎯 專案開發總體目標架構 (Objectives Overview)
本專案將業務單位的 5 大核心訴求，精確拆解為 15 項具體、可量化、可驗收的開發目標 (OBJ-01 ~ OBJ-15)：
1. 【維度一：提高客戶下單掌握度，提升備料能力】OBJ-01 三向交叉比對、OBJ-02 預測偏離示警、OBJ-03 最晚採購發單日推算。
2. 【維度二：提高資訊集中度，消除資訊孤島】OBJ-04 8大核心營運主檔集中維護、OBJ-05 週二出貨審查放行、OBJ-06 訂單缺料分析與瓶頸診斷。
3. 【維度三：提高資訊透明度，數位化估算履歷】OBJ-07 標準 3 階 MRP 推導、OBJ-08 算式透明化卡片、OBJ-09 What-If 模擬。
4. 【維度四：全體單位同台協同操作】OBJ-10 全員無門檻操作、OBJ-11 開會統一投影、OBJ-12 自動審計軌跡。
5. 【維度五：保留企業級 ERP 擴充性】OBJ-13 3NF與五層分類、OBJ-14 適配層解耦、OBJ-15 開放契約與資料字典。

---

## 📊 15 大核心目標落地實施與客觀核查驗收總表 (Objectives Traceability Matrix)
- OBJ-01: 三向需求交叉比對看板 | DashboardView | 100% 驗收通過 ✅
- OBJ-02: 預測波動與偏離示警 | demandAnalysisEngine | 100% 驗收通過 ✅
- OBJ-03: 最晚採購下單日推算 | MrpCalculatorView (30天時程軸) | 100% 驗收通過 ✅
- OBJ-04: 8 大核心營運主檔集中單一真相 | DataTablesView, dataExchange | 100% 驗收通過 ✅
- OBJ-05: 週二出貨放行審查 | ShipScheduleClearanceView | 100% 驗收通過 ✅
- OBJ-06: 訂單缺料分析與瓶頸診斷 | OrderTensionTrackerView | 100% 驗收通過 ✅
- OBJ-07: 標準 3 階 MRP 推導演算法 | mrpEngine, MrpCalculatorView | 100% 驗收通過 ✅
- OBJ-08: 算式透明化推導履歷抽屜 | MrpCalculatorView 公式明細抽屜 | 100% 驗收通過 ✅
- OBJ-09: What-If 情境模擬評估 | DashboardView (減法輕量收合) | 100% 驗收通過 ✅
- OBJ-10: 全員開放無門檻協同介面 | 全系統 UI/UX (Dual-Theme) | 100% 驗收通過 ✅
- OBJ-11: 開會統一投影協同視圖 | DashboardView, ShipSchedule | 100% 驗收通過 ✅
- OBJ-12: 自動化變更審計軌跡 | audit_log, DataTablesView | 100% 驗收通過 ✅
- OBJ-13: 工業 3NF 與五層分類 | types.ts, schema.ts (已刪冗餘欄位) | 100% 驗收通過 ✅
- OBJ-14: 資料適配層解耦架構 | dataAdapter.ts, dataExchange.ts | 100% 驗收通過 ✅
- OBJ-15: 開放資料契約與全欄位字典 | masterFieldDictionary.ts, PMS_Data_Dictionary.md | 100% 驗收通過 ✅`;

  const VERIFICATION_MATRIX_DATA = [
    {
      id: 'OBJ-01',
      name: '預示量/實單/歷史三向交叉比對',
      category: '提高客戶下單掌握度',
      files: 'demandAnalysisEngine.ts\nDashboardView.tsx',
      summary: '同屏交叉比對預示量、確認實單與歷年同期基準，多色長條圖即時對照',
      dod: '演算法比對測試 100% 通過，支援客戶/品號多維篩選，響應時間 < 0.1s',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-02',
      name: '預測波動與偏離自動示警',
      category: '提高下單掌握度 / 防斷料',
      files: 'demandAnalysisEngine.ts\nDashboardView.tsx',
      summary: '自動計算 Bias% 偏差率，觸發 🟢/🟡/🔴 三色燈號與業務處置建言',
      dod: 'verify_phase1_engine.py 單元測試：+5%、+20%、+50%、-30%、插單全數通過',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-03',
      name: '最晚採購下單日動態推算',
      category: '提高備料能力 / 防斷料',
      files: 'MrpCalculatorView.tsx',
      summary: '依據 Lead Time 倒推最晚發單日，實裝 30 天防斷料倒數時程軸',
      dod: '標示當前日期、最晚發單日、交期倒數與客戶交期，逾期自動紅字警示',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-04',
      name: '8 大核心營運主檔集中單一真相',
      category: '提高資訊集中度 / 消除孤島',
      files: 'DataTablesView.tsx\ndataExchange.ts',
      summary: '集中管理 8 大核心營運主表 (3NF)，支援 Excel 雙向匯入匯出與防呆驗證',
      dod: '8 大核心主檔一站式切換瀏覽與在線編輯，支援 Excel 範本匯出與批次匯入',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-05',
      name: '週二出貨可行性放行審查',
      category: '提高資訊集中度 / 增加效率',
      files: 'ShipScheduleClearanceView.tsx',
      summary: '雙週訂單放行覆蓋率自動推算，三級決策標籤與即時放行清單',
      dod: '5 分鐘內完成雙週出貨審查，精確折算成品良品在庫與在製品 WIP 待驗品',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-06',
      name: '訂單缺料分析與瓶頸診斷',
      category: '提高資訊集中度 / 增加效率',
      files: 'OrderTensionTrackerView.tsx',
      summary: '穿透式診斷 6 大環節瓶頸，輸出 4 級缺料風險評級與應變 SOP',
      dod: '逐筆訂單即時顯示各環節備料狀況與瓶頸分析',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-07',
      name: '標準 3 階 MRP 推導演算法',
      category: '提高資訊透明度 / 廢除手算',
      files: 'mrpEngine.ts\nMrpCalculatorView.tsx',
      summary: 'FG 淨需求 → 模具妥善穴數克重 → 原料淨缺口與 MOQ 整補',
      dod: '數學單元測試 100% 通過 (PASS 5/5)，淨需求、克重、淨缺口零誤差',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-08',
      name: '算式透明化推導履歷抽屜',
      category: '提高資訊透明度 / 公式透明',
      files: 'MrpCalculatorView.tsx',
      summary: '實裝 [📐 展開計算公式明細] 抽屜，即時展開每階公式與變數帶入',
      dod: '點擊即看公式、帶入變數與運算結果，支援 3 推導階層獨立展開/收合',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-09',
      name: 'What-If 情境模擬評估',
      category: '提高資訊透明度 / 動態估算',
      files: 'DashboardView.tsx',
      summary: '支援調校需求、模具穴數、週期、良率、交期與 MOQ',
      dod: '減法設計：預設收合為輕量卡片按需展開，0.1 秒即時推演對採購量衝擊',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-10',
      name: '全員開放無門檻操作介面',
      category: '全員同台協同 / 無權限阻礙',
      files: '全系統 UI/UX\nSidebar.tsx',
      summary: '預設無權限阻礙，支援深淺色雙模主題，符合高對比度規範',
      dod: '瀏覽器直開即用，操作直觀，10 分鐘內上手',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-11',
      name: '開會統一投影協同視圖',
      category: '全員同台協同 / 消除對帳內耗',
      files: 'DashboardView.tsx\nShipScheduleClearanceView.tsx',
      summary: '物料需求總覽與出貨審查看板支援大螢幕投影，共同決策',
      dod: '產銷會議直接投影大螢幕，終結不同 Excel 版本對帳內耗',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-12',
      name: '自動化變更審計軌跡',
      category: '全員同台協同 / 變更留痕',
      files: 'audit_log\nDataTablesView.tsx',
      summary: '背景自動記錄欄位異動、時間戳記、修改前/後值與原因',
      dod: '關鍵參數異動 100% 具備歷史追溯記錄',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-13',
      name: '工業標準 3NF 與五層分類',
      category: '保留擴充性 / ERP 就緒',
      files: 'types.ts\nschema.ts',
      summary: '遵循 3NF，支援 RAW/MAT/PART/COMP/SET，已清理非正規化冗餘欄位',
      dod: '刪除非正規化 material_class_label，Schema 100% 相容主流 ERP',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-14',
      name: '資料適配層解耦架構',
      category: '保留擴充性 / 無痛升級',
      files: 'dataAdapter.ts\ndataExchange.ts',
      summary: 'Adapter 模式隔離前端運算與存儲後端，未來升級無須重構',
      dod: '切換後端資料庫僅需替換單一 Adapter 模組，核心代碼變動率 < 5%',
      status: '✅ 100% 驗收通過'
    },
    {
      id: 'OBJ-15',
      name: '開放資料契約與全欄位字典',
      category: '保留擴充性 / 系統銜接準備',
      files: 'masterFieldDictionary.ts\nPMS_Data_Dictionary.md\nGlossaryView.tsx',
      summary: '建立 8 大核心主表 65+ 欄位定義表，內建於術語辭典並發布規格書',
      dod: '發布 PMS_Data_Dictionary.md，術語辭典整合 主檔案欄位名稱定義表',
      status: '✅ 100% 驗收通過'
    },
  ];

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(prdMarkdownContent);
    setCopied(true);
    onNotify('已將 PRD 規格書與驗收總表完整 Markdown 複製至剪貼簿！', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([prdMarkdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `料事如神系統_PRD需求規格與驗收總表_${PMS_VERSION}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('已匯出 PRD 需求規格與驗收總表 Markdown 檔！', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-50 dark:bg-blue-950 text-sky-700 dark:text-blue-400 border border-sky-200 dark:border-blue-800/60 text-xs font-bold px-2.5 py-0.5 rounded-md font-mono">
              PRD & DoD {PMS_VERSION}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">產品需求規格與 15 大目標核查驗收總表</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            料事如神系統 (PMS) — 產品需求規格書與 15 大核心目標核查驗收總表
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            正式取代先前 PRD 設計草案，完整收錄 15 大核心目標、落地實施交付檔案路徑、DoD 衡量標準與客觀核查驗證結果
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateToSpec && (
            <button
              onClick={onNavigateToSpec}
              id="prd-open-spec-btn"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>數據邏輯規格書</span>
            </button>
          )}
          <button
            onClick={handleCopyMarkdown}
            id="prd-copy-md-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>複製 Markdown</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            id="prd-download-md-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>匯出 PRD 驗收總表 (.md)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>🎯 15 大核心目標核查驗收總表</span>
        </button>

        <button
          onClick={() => setActiveTab('rich')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'rich'
              ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>📖 PRD 需求規格白皮書</span>
        </button>

        <button
          onClick={() => setActiveTab('dictionary')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'dictionary'
              ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
            }`}
          >
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>📚 8 大核心主檔欄位與名詞定義</span>
        </button>

        <button
          onClick={() => setActiveTab('markdown')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            activeTab === 'markdown'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-400 dark:border-slate-700 shadow-xs'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>📄 原始 Markdown 規格代碼</span>
        </button>
      </div>

      {/* Content Rendering: Matrix */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎯 15 大核心開發目標落地實施與客觀核查驗收總表</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                  15/15 PASS (100%)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                嚴格落實 Andrej Karpathy 軟體工程準則與客觀驗收標準，所有目標均已於程式碼模組中落地並經自動化測試與 UI 檢驗閉環確認。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-semibold uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-3 w-20 text-center">目標 ID</th>
                  <th className="px-3.5 py-3">核心目標名稱</th>
                  <th className="px-3.5 py-3">業務核心訴求</th>
                  <th className="px-3.5 py-3">交付程式模組與檔案</th>
                  <th className="px-3.5 py-3">具體實施功能特點</th>
                  <th className="px-3.5 py-3">客觀驗收標準 (DoD) 與核查證據</th>
                  <th className="px-3.5 py-3 text-center w-28">驗收狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {VERIFICATION_MATRIX_DATA.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-3.5 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {row.id}
                    </td>
                    <td className="px-3.5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-3.5 py-3.5 text-slate-600 dark:text-slate-300">
                      {row.category}
                    </td>
                    <td className="px-3.5 py-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-pre-line text-[11px]">
                      {row.files}
                    </td>
                    <td className="px-3.5 py-3.5 text-slate-700 dark:text-slate-300">
                      {row.summary}
                    </td>
                    <td className="px-3.5 py-3.5 text-slate-600 dark:text-slate-300 leading-snug">
                      {row.dod}
                    </td>
                    <td className="px-3.5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Rendering: Rich */}
      {activeTab === 'rich' && (
        <div className="rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 space-y-8 text-sm leading-relaxed">

          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sm font-bold font-mono">1</span>
              <span>核心原則與品管圈 (QCC) 定位</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800">
                <div className="font-bold text-sky-900 dark:text-sky-200">No Double Key-in</div>
                <p className="text-sky-700 dark:text-sky-300 mt-1">從 ERP 自動匯入庫存與在途，拒絕重複人工鍵入與資料不同步。</p>
              </div>
              <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800">
                <div className="font-bold text-sky-900 dark:text-sky-200">SSOT & MECE 原則</div>
                <p className="text-sky-700 dark:text-sky-300 mt-1">單一真實數據來源，單穴克重與日產能一律動態推算，不開放手動竄改。</p>
              </div>
              <div className="p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800">
                <div className="font-bold text-sky-900 dark:text-sky-200">業務需求驅動 (Demand First)</div>
                <p className="text-sky-700 dark:text-sky-300 mt-1">以業務 Forecast 與 PO 為核心錨點，逆向倒推採購排程與產能負荷。</p>
              </div>
            </div>
          </section>

          {/* Section 2: MRP 3-Stage Gradient Cards */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sm font-bold font-mono">2</span>
              <span>3 階段 MRP 數學推導公式</span>
            </h3>
            <div className="space-y-3">
              {/* 階段一：天藍色 */}
              <div className="p-4 bg-gradient-to-r from-sky-50 to-sky-100/60 dark:from-sky-950/40 dark:to-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-xl">
                <div className="font-bold text-sky-800 dark:text-sky-300 text-sm">階段一：真實成品缺口 (FG Net Requirement)</div>
                <div className="font-mono text-sm text-sky-700 dark:text-sky-200 mt-1.5">
                  真實缺口 (PCS) = (Forecast 需求 + 實際訂單) - 成品在庫良品 - (Sorting 待驗品 × 全檢良率)
                </div>
              </div>

              {/* 階段二：靛藍色 */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl">
                <div className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">階段二：成型重量與原料毛需求 (BOM Explosion)</div>
                <div className="font-mono text-sm text-indigo-700 dark:text-indigo-200 mt-1.5">
                  單穴克重 (g) = (整模重量 + 流道重量) ÷ 妥善穴數<br/>
                  原料毛需求 (KG) = [(真實缺口 × 單穴克重) ÷ 1000] ÷ (1 - 標準生產損耗率)
                </div>
              </div>

              {/* 階段三：翠綠色 */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">階段三：原料淨需求與採購下單日 (RM Net Requirement)</div>
                <div className="font-mono text-sm text-emerald-700 dark:text-emerald-200 mt-1.5">
                  原料淨需求 (KG) = 原料毛需求 - 原料庫存 - 原料在途採購 + 安全庫存量<br/>
                  建議下單量 (KG) = CEILING(原料淨需求, MOQ) | 建議下單日 = 需求交期 - 採購交期 (Lead Time)<br/>
                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">庫存上限檢查: RM On-Hand + In-Transit ≤ Max_Storage_Capacity_kg → 觸發爆倉警示</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Change Audit */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-sm font-bold font-mono">3</span>
              <span>變更稽核與權限管控 (Change Audit & Governance)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* L1: 淺灰藍底 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-base">🟢</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Level 1 — 一般變更</div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">無需記錄，直接儲存（例如：备注欄位）。</p>
              </div>
              {/* L2: 琥珀暖色 */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-base">🟡</span>
                  <div className="font-bold text-amber-800 dark:text-amber-300">Level 2 — MRP 影響變更</div>
                </div>
                <p className="text-amber-700 dark:text-amber-200">儲存前彈出影響確認對話框，顯示變更前後 MRP 差異摘要（例如：妥善穴數調整）。</p>
              </div>
              {/* L3: 紅色警示 */}
              <div className="p-4 bg-gradient-to-r from-rose-50 to-rose-100/60 dark:from-rose-950/30 dark:to-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-700">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-base">🔴</span>
                  <div className="font-bold text-rose-700 dark:text-rose-300">Level 3 — 工程變更</div>
                </div>
                <p className="text-rose-700 dark:text-rose-200">強制要求填寫變更原因方可儲存，完整記錄至 Audit_Log 可供稽核追溯（例如：設計穴數、單穴克重）。</p>
              </div>
            </div>
          </section>

          {/* Section 4: Backup System */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-sm font-bold font-mono">4</span>
              <span>自動化備份系統 (Automated Backup)</span>
            </h3>
            <div className="p-4 bg-gradient-to-r from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-700 text-sm space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="font-bold text-sky-800 dark:text-sky-200 mb-1">排程備份</div>
                  <p className="text-sky-700 dark:text-sky-300">可設定每日備份時間（台灣時間 UTC+8），瀏覽器保持開啟時自動執行。</p>
                </div>
                <div>
                  <div className="font-bold text-sky-800 dark:text-sky-200 mb-1">啟動備份</div>
                  <p className="text-sky-700 dark:text-sky-300">可啟用「每次開啟頁面時自動備份」，防止意外關閉導致資料遺失。</p>
                </div>
                <div>
                  <div className="font-bold text-sky-800 dark:text-sky-200 mb-1">備份路徑</div>
                  <p className="text-sky-700 dark:text-sky-300">透過 File System Access API 授權寫入內網指定資料夾；不支援時以下載檔案方式進行。</p>
                </div>
                <div>
                  <div className="font-bold text-sky-800 dark:text-sky-200 mb-1">備份日誌</div>
                  <p className="text-sky-700 dark:text-sky-300">完整記錄時間、檔案大小、資料筆數與執行耗時，支援日誌匯出與數量限制（預設 365 筆）。</p>
                </div>
              </div>
              <div className="pt-2 border-t border-sky-200 dark:border-sky-800 flex items-center space-x-2">
                <span className="text-rose-500">⚠</span>
                <span className="text-sky-700 dark:text-sky-300">備份失敗時主動 Toast 通知管理員，便於及時介入處理。</span>
              </div>
            </div>
          </section>

          {/* Section 5: Material Classification */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-6 h-6 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-sm font-bold font-mono">5</span>
              <span>五層物料分類體系 (Material Classification System)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { code: 'RAW',  name: '原料類',  en: 'Raw Materials', color: 'sky',    desc: '塑膠原粒、色母、色粉等基礎原材料。以 KG 計量，納入供應商採購排程。', icon: '🌿' },
                { code: 'MAT',  name: '物料類',  en: 'Packaging',     color: 'amber',  desc: '紙箱、塑膠袋、標籤、B膠、收縮膜等包裝與輔料。PCS/KG 計量，不直接參與成型。', icon: '📦' },
                { code: 'PART', name: '零件類',  en: 'Parts',         color: 'emerald',desc: '單一塑膠射出製品。由 BOM 展開計算毛需求，以 PCS 計量。', icon: '⚙️' },
                { code: 'COMP', name: '組件類',  en: 'Components',    color: 'violet', desc: '零件＋物料組裝之中間產品。納入 Assembly BOM 管理（可作為 SET 組裝子項，非強制路徑）。', icon: '🔧' },
                { code: 'SET',  name: 'SET 類',  en: 'Final Sets',    color: 'rose',   desc: '由零件或組件一次組裝完成的最終出廠組合製品。可含直接 PART 領出組裝，或經 COMP 入庫後再領出組裝兩種路徑。對應 Forecast/PO/成品庫存。', icon: '📋' },
              ].map(c => (
                <div key={c.code} className={`p-4 bg-${c.color}-50 dark:bg-${c.color}-950/30 border border-${c.color}-200 dark:border-${c.color}-700 rounded-xl`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{c.icon}</span>
                    <span className={`font-mono font-bold text-${c.color}-700 dark:text-${c.color}-300`}>{c.code}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-auto">{c.en}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gradient-to-r from-violet-50 to-violet-100/60 dark:from-violet-950/30 dark:to-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700 text-xs space-y-2">
              <div className="font-bold text-violet-800 dark:text-violet-300">匯入規格 (Import Spec)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-violet-700 dark:text-violet-200">
                <p>• <span className="font-mono font-bold">material_class</span> 欄位：填寫代碼（RAW/MAT/PART/COMP/SET），未填寫時依 SKU 前綴自動推斷。</p>
                <p>• 預設前綴規則：RM-/PP-/PVC- → RAW，PKG-/BAG- → MAT，CONN-/VALVE- → PART，ASM-/COMP- → COMP，A01-/B02-/SET- → SET。</p>
                <p>• 匯入預檢時會標示「待分類」品號，管理員需在 MaterialClassManagementView 手動指定。</p>
                <p>• JSON 備份檔會同步匯出 <span className="font-mono font-bold">material_classes</span> 陣列，匯入時自動合併。</p>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* Dictionary View */}
      {activeTab === 'dictionary' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">統一用詞與名詞定義規範 (Terminology Dictionary)</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">已嚴格依據 PRD 規範將「完整穴數」統一為「設計穴數」，「現況穴數」統一為「妥善穴數」</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">設計穴數 (Design Cavities)</span>
                <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">原: 完整穴數</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                模具出廠原裝設計之總穴數。代表該模具之物理最高潛在產能。
              </p>
            </div>

            <div className="p-5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-500/40">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-200 text-sm">妥善穴數 (Active Cavities)</span>
                <span className="text-xs bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 px-2 py-0.5 rounded font-mono font-bold">
                  原: 現況穴數
                </span>
              </div>
              <p className="text-sm text-purple-950 dark:text-purple-100 mt-2 leading-relaxed">
                產線現場目前可正常射出注膠之有效穴數。若發生塞穴，此數值動態降低，系統將自動調升「單穴克重」並下修「日產能」。
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white text-sm">WIP 待驗品 (Sorting WIP)</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                已製造射出完成，集中於 Sorting 檢驗區等待進行 100% 全檢之準成品。在 MRP 運算中依據「標準全檢良率」折算有效成品供給。
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white text-sm">Conservative Max Weight Principle (最重克重原則)</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                當成品對應多副模具（M:N 關聯）且未指定主模時，系統預設採用單穴克重最大之模具進行備料推算，杜絕原料短缺。
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white text-sm">Multi-Mold Strategy (多模備料策略)</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                系統支援三種備料原則：`conservative_max_weight`（最重克重，預設）、`primary_mold_only`（僅主模）、`lowest_weight`（最輕克重），可在系統參數中切換。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Raw Markdown */}
      {activeTab === 'markdown' && (
        <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 border border-slate-700 dark:border-slate-800 text-cyan-300 font-mono text-sm overflow-x-auto shadow-xs">
          <pre className="whitespace-pre-wrap">{prdMarkdownContent}</pre>
        </div>
      )}
    </div>
  );
};
