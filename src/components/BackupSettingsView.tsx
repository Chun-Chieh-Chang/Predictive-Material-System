/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Clock,
  Download,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Calendar,
  HardDrive,
  Info,
  AlertCircle,
  FileArchive,
  Settings2,
} from 'lucide-react';
import {
  SystemDatabase,
  BackupScheduleConfig,
  BackupLogEntry,
  DEFAULT_BACKUP_CONFIG,
  BACKUP_CONFIG_STORAGE_KEY,
  BACKUP_LOG_STORAGE_KEY,
} from '../types';
import {
  performBackup,
  pickBackupDirectory,
  shouldTriggerBackup,
  minutesUntilNextBackup,
  daysSinceLastBackup,
  loadBackupConfig,
  saveBackupConfig,
  loadBackupLogs,
  generateBackupFileName,
} from '../utils/backupService';

interface BackupSettingsViewProps {
  db: SystemDatabase;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({ db, onNotify }) => {
  const [config, setConfig] = useState<BackupScheduleConfig>(() => loadBackupConfig());
  const [logs, setLogs] = useState<BackupLogEntry[]>(() => loadBackupLogs());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [dirSupported, setDirSupported] = useState<boolean | null>(null);
  const [nextBackupMinutes, setNextBackupMinutes] = useState<number>(Infinity);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 更新倒數計時
  useEffect(() => {
    const tick = () => setNextBackupMinutes(minutesUntilNextBackup(config));
    tick();
    timerRef.current = setInterval(tick, 30000); // 每 30 秒更新
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [config.enabled, config.scheduledHour, config.scheduledMinute]);

  // 檢查瀏覽器 FSA API 支援
  useEffect(() => {
    setDirSupported('showDirectoryPicker' in window);
  }, []);

  // 排程觸發檢查（每秒輪詢）
  useEffect(() => {
    if (!config.enabled) return;
    const interval = setInterval(() => {
      if (shouldTriggerBackup(config)) {
        executeManualBackup();
      }
    }, 10000); // 每 10 秒檢查一次
    return () => clearInterval(interval);
  }, [config.enabled, config.scheduledHour, config.scheduledMinute]);

  const updateConfig = (patch: Partial<BackupScheduleConfig>) => {
    const next = { ...config, ...patch, directoryHandle: config.directoryHandle };
    setConfig(next);
    saveBackupConfig(next);
  };

  const handlePickDirectory = async () => {
    const result = await pickBackupDirectory();
    if (result.ok && result.handle) {
      updateConfig({
        directoryHandle: result.handle,
        directoryLabel: result.label,
      });
      onNotify(`✅ 已授權備份目錄：${result.label}`, 'success');
    } else {
      onNotify(result.label, 'error');
    }
  };

  const executeManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const result = await performBackup(db, config, onNotify);
      if (result.success && result.logEntry) {
        setLogs((prev) => [...prev, result.logEntry!]);
        updateConfig({ lastBackupId: result.logEntry.id });
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('確定要清除所有備份日誌記錄嗎？此操作無法復原。')) {
      localStorage.setItem(BACKUP_LOG_STORAGE_KEY, JSON.stringify([]));
      setLogs([]);
      onNotify('備份日誌已清除', 'success');
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `PMS_Backup_Logs_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const lastBackupEntry = logs.filter((l) => l.status === 'success').at(-1);
  const daysSince = lastBackupEntry ? daysSinceLastBackup(logs) : Infinity;
  const fsaNote = !dirSupported
    ? '此瀏覽器不支援 File System Access API，備份將以下載檔案方式進行（Chrome / Edge 110+ 支援直接寫入授權目錄）'
    : null;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-sm font-bold px-2.5 py-0.5 rounded-md font-mono">
                BACKUP ORCHESTRATOR
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">自動化備份系統</h2>
            <p className="text-sm text-slate-400 mt-0.5 max-w-xl">
              定時產生完整資料庫封存檔，支援直接寫入內網授權目錄或下載備份。
              所有備份日誌完整記錄於本機，可供稽核追溯。
            </p>
          </div>

          {/* Quick Status Cards */}
          <div className="flex flex-wrap gap-3">
            <div className={`px-4 py-3 rounded-xl border ${
              config.enabled
                ? 'bg-emerald-950/40 border-emerald-800/60'
                : 'bg-slate-950/70 border-slate-800'
            }`}>
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className={`w-4 h-4 ${config.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-sm text-slate-400">排程</span>
              </div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${config.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {config.enabled ? 'ON' : 'OFF'}
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl border bg-slate-950/70 border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-400">下次備份</span>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                {config.enabled
                  ? nextBackupMinutes >= 1440
                    ? `${Math.floor(nextBackupMinutes / 1440)}d ${Math.floor((nextBackupMinutes % 1440) / 60)}h`
                    : `${nextBackupMinutes} min`
                  : '—'}
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl border bg-slate-950/70 border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">上次備份</span>
              </div>
              <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                {daysSince === Infinity ? '尚未備份' : `${daysSince} 天前`}
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl border bg-slate-950/70 border-slate-800">
              <div className="flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-400">日誌筆數</span>
              </div>
              <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">
                {logs.length} 筆
              </div>
            </div>
          </div>
        </div>

        {fsaNote && (
          <div className="mt-4 flex items-start space-x-2 bg-amber-950/30 border border-amber-800/50 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300/90 leading-relaxed">{fsaNote}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 左欄：設定面板 ── */}
        <div className="space-y-6">
          {/* 排程設定 */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-5">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">排程與觸發設定</h3>
                <p className="text-sm text-slate-400">自動備份時程與執行模式</p>
              </div>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <span>啟用自動備份排程</span>
              </label>
              <button
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Schedule Time */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <label className="text-sm font-bold text-white block">備份觸發時間（台灣時間 UTC+8）</label>
              <div className="flex items-center space-x-3">
                <input
                  type="time"
                  value={`${String(config.scheduledHour).padStart(2, '0')}:${String(config.scheduledMinute).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number);
                    updateConfig({ scheduledHour: h, scheduledMinute: m });
                  }}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
                />
                <span className="text-sm text-slate-500">台灣時間（建議離峰時段，如 02:00）</span>
              </div>
              <p className="text-[11px] text-slate-500">
                備份程式會在設定時間±2分鐘內自動執行。瀏覽器需保持開啟才能觸發排程。
              </p>
            </div>

            {/* Auto Download on Launch */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">每次啟動頁面時自動備份</div>
                <div className="text-[11px] text-slate-500 mt-0.5">開啟系統時立即產生最新備份（避免資料遺失）</div>
              </div>
              <button
                onClick={() => updateConfig({ autoDownloadOnLaunch: !config.autoDownloadOnLaunch })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.autoDownloadOnLaunch ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  config.autoDownloadOnLaunch ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Alert on Error */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">備份失敗時發送通知</div>
                <div className="text-[11px] text-slate-500 mt-0.5">發生錯誤時於介面上顯示紅燈告警</div>
              </div>
              <button
                onClick={() => updateConfig({ alertOnError: !config.alertOnError })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.alertOnError ? 'bg-red-600' : 'bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  config.alertOnError ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>

          {/* 目錄授權設定 */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-5">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">目錄授權與儲存目標</h3>
                <p className="text-sm text-slate-400">選擇備份檔案寫入位置</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">授權目錄</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {config.directoryLabel
                      ? `已授權：${config.directoryLabel}`
                      : '尚未授權任何目錄'}
                  </div>
                </div>
                <button
                  onClick={handlePickDirectory}
                  disabled={!dirSupported}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-700 hover:bg-purple-600 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{config.directoryLabel ? '變更目錄' : '選擇目錄'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                點擊「選擇目錄」後，瀏覽器會顯示系統目錄對話框，請選取您希望存放備份檔案的資料夾
                （可選取本機或網路磁碟機對應的本地路徑）。選擇後系統将获得該目錄的寫入權限。
                首次選取後，後續備份將直接寫入該目錄，無需重複授權。
              </p>
            </div>

            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-4 py-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-300/90 leading-relaxed">
                  <strong>技術限制說明：</strong>瀏覽器安全沙盒不允許直接存取 UNC 路徑
                  （如 <code className="font-mono bg-amber-950/60 px-1 rounded">\\server\share</code>）。
                  建議做法：先在 Windows 將網路磁碟機掛載為本機磁碟符號（如 Z:），
                  再於目錄選擇對話框中選取該磁碟機下的資料夾。
                </div>
              </div>
            </div>
          </div>

          {/* 立即備份 */}
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">手動立即備份</h3>
                <p className="text-sm text-slate-400">現在就產生一份完整資料庫封存</p>
              </div>
            </div>

            <button
              onClick={executeManualBackup}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-colors shadow-lg shadow-emerald-600/20"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>備份中… 請稍候</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>立即執行備份</span>
                </>
              )}
            </button>

            {lastBackupEntry && (
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>上次成功：{lastBackupEntry.backupFileName}</span>
                <span className="text-slate-600">｜</span>
                <span>{(lastBackupEntry.fileSizeBytes / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 右欄：備份日誌 ── */}
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">備份作業日誌</h3>
                <p className="text-sm text-slate-400">完整操作記錄與狀態追蹤</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportLogs}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="匯出日誌 JSON"
              >
                <Download className="w-3 h-3" />
                <span>匯出</span>
              </button>
              <button
                onClick={handleClearLogs}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/60 transition-colors"
                title="清除所有日誌"
              >
                <Trash2 className="w-3 h-3" />
                <span>清除</span>
              </button>
            </div>
          </div>

          {/* Log list */}
          <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 space-y-3">
                <FileArchive className="w-10 h-10 opacity-30" />
                <p className="text-sm font-mono">尚無備份記錄</p>
                <p className="text-[11px] text-slate-700">執行首次備份後將在此顯示完整日誌</p>
              </div>
            ) : (
              [...logs].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border text-sm font-mono space-y-1.5 ${
                    entry.status === 'success'
                      ? 'bg-emerald-950/20 border-emerald-900/40'
                      : 'bg-red-950/20 border-red-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {entry.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className={`font-bold ${
                        entry.status === 'success' ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        {entry.status === 'success' ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px]">{entry.timestamp}</span>
                  </div>
                  <div className="text-slate-400 truncate">{entry.backupFileName}</div>
                  <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-500">
                    <span>{entry.fileSizeBytes > 0 ? `${(entry.fileSizeBytes / 1024).toFixed(1)} KB` : '—'}</span>
                    <span>{entry.databaseSnapshotCount} 筆記錄</span>
                    <span>{entry.durationMs} ms</span>
                    {entry.targetDirectory && (
                      <span className="max-w-[160px] truncate" title={entry.targetDirectory}>
                        📁 {entry.targetDirectory}
                      </span>
                    )}
                  </div>
                  {entry.errorDetails && (
                    <div className="text-red-400/80 text-[10px] break-words bg-red-950/30 rounded-lg px-2 py-1.5 mt-1">
                      ⚠ {entry.errorDetails}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Log stats footer */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
              <span>
                成功 {logs.filter((l) => l.status === 'success').length} 筆
                {' · '}
                失敗 {logs.filter((l) => l.status === 'failed').length} 筆
              </span>
              <span>上限 {config.maxLogEntries} 筆（最舊自動清除）</span>
            </div>
          )}
        </div>
      </div>

      {/* 容量與保留策略 */}
      <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 shadow-xl shadow-black/20 space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">容量管理與保留策略</h3>
            <p className="text-sm text-slate-400">控制備份日誌的儲存上限</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <label className="text-sm font-bold text-white block">最大日誌筆數</label>
            <input
              type="number"
              min={30}
              max={3650}
              step={30}
              value={config.maxLogEntries}
              onChange={(e) => updateConfig({ maxLogEntries: Math.max(30, Number(e.target.value)) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">超出上限時自動清除最舊的記錄</p>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-sm font-bold text-white">當前日誌大小估算</div>
            <div className="text-lg font-bold font-mono text-cyan-300">
              {(logs.reduce((sum, l) => sum + JSON.stringify(l).length, 0) / 1024).toFixed(1)} KB
            </div>
            <p className="text-[11px] text-slate-500">存入 localStorage 的實際佔用量</p>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-sm font-bold text-white">上次成功備份時間</div>
            <div className="text-sm font-mono text-emerald-300 mt-1">
              {lastBackupEntry
                ? new Date(lastBackupEntry.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
                : '尚未執行'}
            </div>
            <p className="text-[11px] text-slate-500">
              {daysSince === Infinity ? '請執行首次備份以開始記錄' : `距今 ${daysSince} 天`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
