/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FileCode2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SystemDatabase, SystemParameters } from '../types';
import specHtml from '../../docs/PMS_Data_Logic_Specification.html?raw';

interface DataLogicSpecViewProps {
  db: SystemDatabase;
  params: SystemParameters;
}

/**
 * 數據邏輯規格書分頁（SSOT 單一真相來源）
 * 直接載入 docs/PMS_Data_Logic_Specification.html 原檔渲染（文件即 SSOT），
 * 並透過 postMessage 將系統當下的 systemParams 與核心資料表筆數同步至文件內的即時面板。
 */
export const DataLogicSpecView: React.FC<DataLogicSpecViewProps> = ({ db, params }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const syncLivePayload = React.useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const latestSnapshotDate = db.inventory_wip_snapshot.reduce<string | null>(
      (acc, s) => (!acc || s.snapshot_date > acc ? s.snapshot_date : acc),
      null
    );
    win.postMessage(
      {
        type: 'pms-live-sync',
        payload: {
          syncedAt: new Date().toISOString(),
          params,
          stats: {
            item_master: db.item_master.length,
            mold_master: db.mold_master.length,
            product_mold_bom: db.product_mold_bom.length,
            demand_forecast_log: db.demand_forecast_log.length,
            actual_order: db.actual_order.length,
            inventory_wip_snapshot: db.inventory_wip_snapshot.length,
            po_in_transit: db.po_in_transit.length,
            latestSnapshotDate
          }
        }
      },
      '*'
    );
    setSyncedAt(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
  }, [db, params]);

  useEffect(() => {
    if (loaded) syncLivePayload();
  }, [loaded, syncLivePayload]);

  return (
    <div className="space-y-4 pb-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-50 dark:bg-blue-950 text-sky-700 dark:text-blue-400 border border-sky-200 dark:border-blue-800/60 text-xs font-bold px-2.5 py-0.5 rounded-md font-mono">
              Data Logic Spec v3.1
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">SSOT 單一真相來源 · 與系統資料即時連動</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>數據邏輯規格總覽（備料補貨 × 交期估算）</span>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            完整收錄原物料備料補貨與產品交期估算兩大核心主軸之互動流程圖、五欄式參數定義表與統一核心鏈路整合分析
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {syncedAt && (
            <span className="flex items-center space-x-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>已同步 {syncedAt}</span>
            </span>
          )}
          <button
            onClick={syncLivePayload}
            id="spec-resync-btn"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>重新同步系統數據</span>
          </button>
        </div>
      </div>

      <iframe
        ref={frameRef}
        title="PMS 數據邏輯規格總覽"
        srcDoc={specHtml}
        sandbox="allow-scripts"
        onLoad={() => setLoaded(true)}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
        style={{ height: 'calc(100vh - 230px)', minHeight: '640px' }}
      />
    </div>
  );
};
