/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Download,
  Check,
  BookOpen,
  Code,
  ShieldCheck
} from 'lucide-react';

interface PrdDocViewProps {
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const PrdDocView: React.FC<PrdDocViewProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'rich' | 'markdown' | 'dictionary'>('rich');
  const [copied, setCopied] = useState<boolean>(false);

  const prdMarkdownContent = `# 料事如神圈 - 智能備料與生產排程管理系統 PRD 規格書
**版本號 (Document Version)**: V-20260820-12  
**系統架構與作者**: Developed by Wesley Chang @Mouldex, Aug-2026  
**發布組織**: 公司品管圈 (QCC) - 料事如神圈  
**系統代號**: PMS (Predictive Material System)  
**核心原則**: No Double Key-in / SSOT (Single Source of Truth) / MECE / 業務需求優先  

---

## 1. 系統願景與核心價值
本系統旨在消除射出成型廠在面對客戶多變之 Forecast 與訂單需求時，所衍生之「物料短缺斷線」與「過度備料爆倉」雙重風險。
透過 3 階段 MRP 動態運算引擎，將「客戶需求」、「成品在庫」、「Sorting 全檢待驗品」、「模具妥善穴數」與「原料在途量」自動串接。

---

## 2. 統一用詞與名詞定義規範 (Terminology Dictionary)
為維持跨部門溝通與資料庫欄位一致性，全系統嚴格遵守以下標準用詞：

1. **設計穴數 (Design Cavities)**: 模具出廠原裝設計之總穴數 (原稱: 完整穴數)。
2. **妥善穴數 (Active Cavities)**: 目前產線實際可用且正常注膠出模之穴數 (原稱: 現況穴數)。若發生塞穴，此數值將動態遞減。
3. **WIP 待驗品 (Pending QC / Sorting WIP)**: 射出成型已製造完成，進入 Sorting 全檢作業前，暫時集中存放的準成品。
4. **單穴克重 (Unit Weight)**: 每生產 1 PCS 成品所分攤之注膠總克重（含產品淨重與流道分攤）。
   - **計算公式**: \`單穴克重 = (整模重量 + 流道重量) ÷ 妥善穴數\`
5. **日產能 (Daily Capacity)**: 模具在單台射出機單日（24小時）之最高理論產能。
   - **計算公式**: \`日產能 = (86,400 ÷ 成型週期_秒) × 妥善穴數\`
6. **Conservative Max Weight Principle (最重克重保守原則)**: 當品號未指定主模或存在多副模具時，系統自動取單穴克重最高者進行備料推算，以防原料短缺。
7. **品號絕對唯一原則 (1:1 SKU Rule)**: 一個品號對應唯一的成品規格；若存在客戶歷史替代編號（如 R1-2355），必須透過 Alt_SKU 欄位建立關聯，不可重複建檔。

---

## 3. 三階段 MRP 核心運算引擎 (3-Stage MRP Logic)

### 階段一：真實成品缺口推算 (FG Net Requirement)
- **總需求量**: \`Total Demand = Forecast Qty + 實際訂單量\`
- **有效待驗品**: \`Effective WIP = Sorting 待驗品 × 標準全檢良率 (Std Sorting Yield)\`
- **成品淨缺口**: \`FG Net Req = MAX(0, Total Demand - 成品在庫良品 - Effective WIP)\`

### 階段二：成型重量轉換與 BOM 展開 (BOM Explosion)
- **單穴克重**: \`Unit Weight (g) = (整模重量 + 流道重量) ÷ 妥善穴數\`
- **原料毛需求 (KG)**: \`RM Gross Req = [(FG Net Req × Unit Weight) ÷ 1000] ÷ (1 - 標準生產損耗率)\`

### 階段三：原料淨需求與採購下單警示 (RM Net Requirement & PO Action)
- **原料淨需求 (KG)**: \`RM Net Req = MAX(0, RM Gross Req - 原料可用庫存 - 原料在途採購量 + 安全庫存量)\`
- **建議下單量**: \`Suggested PO Qty = CEILING(RM Net Req, 最小起訂量 MOQ)\`
- **建議下單日**: \`Suggested Order Date = 需求交期 (Target Date) - 採購交期 (Lead Time Days)\`

---

## 4. 8 大核心資料表架構 (Database Schema)
1. **Item_Master (料號基本主檔)**: SKU (PK), Alt_SKU, Customer_ID, Category, Color, Unit.
2. **Mold_Master (模具與產能主檔)**: Mold_ID (PK), Design_Cavities, Active_Cavities, Cycle_Time_Sec, Location, Status.
3. **Product_Mold_BOM (產品模具成型關聯檔)**: SKU (FK), Mold_ID (FK), RM_SKU (FK), Net_Mold_Weight_g, Runner_Weight_g, Is_Primary_Mold, Std_Mfg_Scrap_Rate.
4. **Yield_Master (Sorting良率標準檔)**: SKU (PK, FK), Std_Sorting_Yield, Inspection_Standard.
5. **Supplier_Rule_Master (採購與供應商規則檔)**: RM_SKU (PK, FK), Supplier_Name, Lead_Time_Days, MOQ_kg, Safety_Stock_kg, Unit_Price_USD.
6. **Demand_Forecast_Log (業務預估需求檔)**: Demand_ID (PK), Version_No, Customer_ID, SKU, Target_Date, Demand_Qty, Created_By.
7. **Actual_Order (實際訂單檔)**: Order_ID (PK), Customer_ID, SKU, Target_Date, Order_Qty, Status.
8. **Inventory_WIP_Snapshot (庫存與待驗快照檔)**: Snapshot_Date (PK), SKU (PK), FG_Ready_Qty, WIP_Pending_Qty, RM_On_Hand_kg.
9. **PO_In_Transit (在途採購訂單檔)**: PO_Number (PK), RM_SKU, In_Transit_Qty_kg, ETA_Date, Supplier_Name.

---

## 5. 即時預警機制 (Alert Engine)
- 🔴 **缺料危機警示 (Shortage Risk)**: 當下單期吃緊 (\`距離最晚下單日 < 15 天\`) 或已逾期，觸發即刻採購通知。
- 🟡 **防爆倉與呆滯料警示 (Overstock Risk)**: 當 Forecast 下修且 \`庫存+在途 > 需求 1.6 倍\` 時，提醒生管與採購評估 PO 延期或暫緩。
- 🟣 **產能瓶頸預警 (Capacity Bottleneck)**: 當 \`所需生產天數 (FG Gap ÷ 日產能) > 距離交期天數\` 時，觸發模具塞穴修復或開備用模之排產警報。

---

## 6. 三階段演進藍圖 (Roadmap)
- **Phase 1 (本系統 MVP)**: 完成 Excel/JSON 雙向無損導入匯出、動態妥善穴數單穴克重運算與 3 階段 MRP 推導。
- **Phase 2 (ERP 整合)**: 透過 Dingxin ERP API 建立 \`Inventory_WIP_Snapshot\` 與 \`PO_In_Transit\` 自動同步。
- **Phase 3 (系統固化與自適應反饋)**: 引入 Sorting 良率動態回饋閉環，持續校正全檢標準良率。`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(prdMarkdownContent);
    setCopied(true);
    onNotify('已將 PRD 規格書完整 Markdown 複製至剪貼簿！', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([prdMarkdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '料事如神圈_PRD規格書_V12.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('已匯出 PRD 規格書 Markdown 檔！', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-950 text-blue-400 border border-blue-800/60 text-xs font-bold px-2.5 py-0.5 rounded-md font-mono">
              PRD V-20260820-12
            </span>
            <span className="text-xs text-slate-500">產品需求與規格白皮書</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            料事如神圈 — 系統需求規範與統一用詞標準
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            完整收錄 3-Stage MRP 數學公式、8大資料表結構、用詞標準化（設計穴數 / 妥善穴數）與風險預警機制
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyMarkdown}
            id="prd-copy-md-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>複製 Markdown</span>
          </button>
          <button
            onClick={handleDownloadMarkdown}
            id="prd-download-md-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出 PRD (.md)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('rich')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeTab === 'rich'
              ? 'bg-[#e0f2fe] text-[#0284c7] border-[#0284c7] shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-[#f8fafc] dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>圖文排版規格書 (Rich Document)</span>
        </button>

        <button
          onClick={() => setActiveTab('dictionary')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeTab === 'dictionary'
              ? 'bg-[#eef2ff] text-[#4f46e5] border-[#4f46e5] shadow-xs dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-600'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-[#f8fafc] dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>統一用詞辭典 (Terminology)</span>
        </button>

        <button
          onClick={() => setActiveTab('markdown')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            activeTab === 'markdown'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-400 dark:border-slate-700 shadow-xs'
              : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-[#f8fafc] dark:hover:bg-slate-900 hover:text-slate-900'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>原始 Markdown 代碼</span>
        </button>
      </div>

      {/* Content Rendering */}
      {activeTab === 'rich' && (
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 shadow-xl shadow-black/20 space-y-8 text-slate-200 leading-relaxed text-sm">
          {/* Section 1 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xs font-bold font-mono">1</span>
              <span>核心原則與品管圈 (QCC) 定位</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-bold text-white">No Double Key-in</div>
                <p className="text-slate-400 mt-1">從 ERP 自動匯入庫存與在途，拒絕重複人工鍵入與資料不同步。</p>
              </div>
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-bold text-white">SSOT & MECE 原則</div>
                <p className="text-slate-400 mt-1">單一真實數據來源，單穴克重與日產能一律動態推算，不開放手動竄改。</p>
              </div>
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800">
                <div className="font-bold text-white">業務需求驅動 (Demand First)</div>
                <p className="text-slate-400 mt-1">以業務 Forecast 與 PO 為核心錨點，逆向倒推採購排程與產能負荷。</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xs font-bold font-mono">2</span>
              <span>3 階段 MRP 數學推導公式</span>
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl">
                <div className="font-bold text-blue-300 text-xs">階段一：真實成品缺口 (FG Net Requirement)</div>
                <div className="font-mono text-xs text-blue-200 mt-1.5">
                  真實缺口 (PCS) = (Forecast 需求 + 實際訂單) - 成品在庫良品 - (Sorting 待驗品 × 全檢良率)
                </div>
              </div>

              <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl">
                <div className="font-bold text-purple-300 text-xs">階段二：成型重量與原料毛需求 (BOM Explosion)</div>
                <div className="font-mono text-xs text-purple-200 mt-1.5">
                  單穴克重 (g) = (整模重量 + 流道重量) ÷ 妥善穴數<br/>
                  原料毛需求 (KG) = [(真實缺口 × 單穴克重) ÷ 1000] ÷ (1 - 標準生產損耗率)
                </div>
              </div>

              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                <div className="font-bold text-emerald-300 text-xs">階段三：原料淨需求與採購下單日 (RM Net Requirement)</div>
                <div className="font-mono text-xs text-emerald-200 mt-1.5">
                  原料淨需求 (KG) = 原料毛需求 - 原料庫存 - 原料在途採購 + 安全庫存量<br/>
                  建議下單量 (KG) = CEILING(原料淨需求, MOQ) | 建議下單日 = 需求交期 - 採購交期 (Lead Time)
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Dictionary View */}
      {activeTab === 'dictionary' && (
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 shadow-xl shadow-black/20 space-y-6 text-sm">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">統一用詞與名詞定義規範 (Terminology Dictionary)</h3>
            <p className="text-xs text-slate-400 mt-1">已嚴格依據 PRD 規範將「完整穴數」統一為「設計穴數」，「現況穴數」統一為「妥善穴數」</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">設計穴數 (Design Cavities)</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">原: 完整穴數</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                模具出廠原裝設計之總穴數。代表該模具之物理最高潛在產能。
              </p>
            </div>

            <div className="p-5 bg-purple-950/30 rounded-xl border border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 text-sm">妥善穴數 (Active Cavities)</span>
                <span className="text-xs bg-[#eef2ff] dark:bg-purple-950/60 text-[#4f46e5] dark:text-purple-300 border border-[#c7d2fe] dark:border-purple-800/60 px-2 py-0.5 rounded font-mono font-bold">
                  原: 現況穴數
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-2 leading-relaxed">
                產線現場目前可正常射出注膠之有效穴數。若發生塞穴，此數值動態降低，系統將自動調升「單穴克重」並下修「日產能」。
              </p>
            </div>

            <div className="p-5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="font-bold text-white text-sm">WIP 待驗品 (Sorting WIP)</div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                已製造射出完成，集中於 Sorting 檢驗區等待進行 100% 全檢之準成品。在 MRP 運算中依據「標準全檢良率」折算有效成品供給。
              </p>
            </div>

            <div className="p-5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="font-bold text-white text-sm">Conservative Max Weight Principle (最重克重原則)</div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                當成品對應多副模具（M:N 關聯）且未指定主模時，系統預設採用單穴克重最大之模具進行備料推算，杜絕原料短缺。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Raw Markdown */}
      {activeTab === 'markdown' && (
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto shadow-xl">
          <pre className="whitespace-pre-wrap">{prdMarkdownContent}</pre>
        </div>
      )}
    </div>
  );
};
