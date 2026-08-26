/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileCode2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SystemDatabase, SystemParameters } from '../types';
import specHtml from '../../docs/PMS_Data_Logic_Specification.html?raw';

interface DataLogicSpecViewProps {
  db: SystemDatabase;
  params: SystemParameters;
  onBack: () => void;
}

/**
 * 數據邏輯規格書獨立頁（SSOT 單一真相來源）
 * 以全版面（fixed inset-0）獨立頁面呈現，無 App 導航欄／側邊欄等干擾元素；
 * 直接載入 docs/PMS_Data_Logic_Specification.html 原檔渲染（文件即 SSOT，零複本），
 * 並透過 postMessage 將系統當下的 systemParams 與核心資料表筆數同步至文件內的即時面板。
 */
export const DataLogicSpecView: React.FC<DataLogicSpecViewProps> = ({ db, params, onBack }) => {
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
    <div className="fixed inset-0 z-50 bg-[#ebf0f5] dark:bg-slate-950">
      {/* 全版面文件：佔滿整個可視區域（100dvh 適配行動裝置動態工具列，不支援時退回 h-screen） */}
      <iframe
        ref={frameRef}
        title="PMS 數據邏輯規格總覽"
        srcDoc={specHtml}
        sandbox="allow-scripts"
        onLoad={() => setLoaded(true)}
        className="w-full h-screen border-0 block"
        style={{ height: '100dvh' }}
      />

      {/* 浮動控制列：返回系統 ＋ SSOT 同步狀態 */}
      <div className="absolute top-3 right-3 flex items-center gap-2 max-w-[calc(100%-1.5rem)]">
        {syncedAt && (
          <span className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>SSOT 已同步 {syncedAt}</span>
          </span>
        )}
        <button
          onClick={syncLivePayload}
          id="spec-resync-btn"
          title="重新同步系統數據"
          className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-slate-900/90 backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">重新同步</span>
        </button>
        <button
          onClick={onBack}
          id="spec-back-btn"
          title="返回系統"
          className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-md cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回系統</span>
        </button>
      </div>

      {/* 文件識別浮水印（左上，不遮內容主體） */}
      <div className="absolute top-3 left-3 flex items-center space-x-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl shadow-xs pointer-events-none">
        <FileCode2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span>數據邏輯規格書 v3.1</span>
      </div>
    </div>
  );
};
