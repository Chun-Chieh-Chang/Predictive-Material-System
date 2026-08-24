/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackupService — 自動化備份核心引擎
 *
 * 功能：
 *  1. 整庫序列化 + 完整性驗證（欄位必填項檢查）
 *  2. 生成時戳標註的備份檔案（PMS_Backup_YYYYMMDD-HHmmss+0800.json）
 *  3. 支援 File System Access API 直接寫入已授權目錄
 *  4. localStorage 持久化備份日誌（最多 maxLogEntries 筆）
 *  5. 異常處理與詳細錯誤回報
 */

import {
  SystemDatabase,
  BackupLogEntry,
  BackupScheduleConfig,
  DEFAULT_BACKUP_CONFIG,
  BACKUP_CONFIG_STORAGE_KEY,
  BACKUP_LOG_STORAGE_KEY,
} from '../types';

// ─── 各表最低欄位定義（用於完整性驗證）─────────────────────────────────────────
const TABLE_SCHEMA_MIN = {
  item_master:          ['sku', 'customer_id', 'category'],
  mold_master:          ['mold_id', 'active_cavities', 'cycle_time_sec'],
  product_mold_bom:     ['sku', 'mold_id', 'rm_sku', 'net_mold_weight_g'],
  demand_forecast_log:  ['demand_id', 'sku', 'target_date', 'demand_qty'],
  actual_order:         ['order_id', 'sku', 'target_date', 'order_qty'],
  inventory_wip_snapshot: ['snapshot_date', 'sku'],
  po_in_transit:        ['po_number', 'rm_sku', 'in_transit_qty_kg'],
  audit_log:            ['id', 'timestamp', 'table_key', 'pk_value'],
} as const;

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

/** 產生唯一 ID（時間戳 + 隨機字串） */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 產生台灣時區 (UTC+8) 格式化時間字串 YYYYMMDD-HHmmss+0800 */
function formatTaiwanTimestamp(): string {
  const now = new Date();
  // 強制使用 UTC+8 偏移量格式化
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const y  = now.getUTCFullYear();
  const m  = pad(now.getUTCMonth() + 1);
  const d  = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours()   + 8); // +8 時區
  const mm = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  // 處理跨日邊界
  const adjusted = new Date(now.getTime() + 8 * 3600 * 1000);
  const ah = pad(adjusted.getUTCHours());
  const am = pad(adjusted.getUTCMinutes());
  const as_ = pad(adjusted.getUTCSeconds());
  return `${y}${m}${d}-${ah}${am}${as_}+0800`;
}

/** 產生備份檔名 */
export function generateBackupFileName(): string {
  return `PMS_Backup_${formatTaiwanTimestamp()}.json`;
}

/** 計算總記錄數 */
function countRecords(db: SystemDatabase): number {
  return (
    db.item_master.length +
    db.mold_master.length +
    db.product_mold_bom.length +
    db.demand_forecast_log.length +
    db.actual_order.length +
    db.inventory_wip_snapshot.length +
    db.po_in_transit.length +
    ((db as any).sorting_actual_yield_log?.length ?? 0) +
    (db.audit_log?.length ?? 0)
  );
}

// ─── 完整性驗證 ────────────────────────────────────────────────────────────────

interface ValidationIssue {
  table: string;
  message: string;
}

function validateDatabaseIntegrity(
  db: SystemDatabase
): { valid: boolean; issues: ValidationIssue[]; recordCount: number } {
  const issues: ValidationIssue[] = [];

  for (const [table, requiredFields] of Object.entries(TABLE_SCHEMA_MIN)) {
    const rows = (db[table as keyof SystemDatabase] as unknown) as Record<string, unknown>[];
    if (!Array.isArray(rows)) {
      issues.push({ table, message: '資料表不存在或格式錯誤' });
      continue;
    }
    for (let i = 0; i < rows.length; i++) {
      const missing = requiredFields.filter((f) => rows[i][f] === undefined || rows[i][f] === null);
      if (missing.length > 0) {
        issues.push({
          table,
          message: `第 ${i + 1} 列缺少必填欄位: ${missing.join(', ')}`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    recordCount: countRecords(db),
  };
}

// ─── 日誌存取 ──────────────────────────────────────────────────────────────────

export function loadBackupLogs(): BackupLogEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBackupLogs(logs: BackupLogEntry[]): void {
  try {
    localStorage.setItem(BACKUP_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('[BackupService] 無法儲存備份日誌:', e);
  }
}

function pruneLogs(logs: BackupLogEntry[], maxEntries: number): BackupLogEntry[] {
  if (logs.length <= maxEntries) return logs;
  // 保留最新的 maxEntries 筆
  return logs.slice(-maxEntries);
}

export function loadBackupConfig(): BackupScheduleConfig {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // directoryHandle 無法序列化，回傳 null
      return { ...DEFAULT_BACKUP_CONFIG, ...parsed, directoryHandle: null };
    }
  } catch (e) {
    console.error('[BackupService] 無法載入備份設定:', e);
  }
  return { ...DEFAULT_BACKUP_CONFIG };
}

export function saveBackupConfig(config: Omit<BackupScheduleConfig, 'directoryHandle'>): void {
  try {
    localStorage.setItem(BACKUP_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('[BackupService] 無法儲存備份設定:', e);
  }
}

// ─── 核心備份函式 ──────────────────────────────────────────────────────────────

interface BackupResult {
  success: boolean;
  logEntry: BackupLogEntry | null;
  errorMessage?: string;
}

/**
 * 執行備份
 * @param db          完整系統資料庫
 * @param config      備份排程設定（含目錄權杖）
 * @param onNotify    可選的即時通知回調（用於 UI toast）
 */
export async function performBackup(
  db: SystemDatabase,
  config: BackupScheduleConfig,
  onNotify?: (msg: string, type: 'success' | 'error') => void
): Promise<BackupResult> {
  const startMs = performance.now();
  const timestamp = new Date().toISOString();
  const logId = generateId();
  const fileName = generateBackupFileName();

  // 1. 完整性驗證
  const validation = validateDatabaseIntegrity(db);
  if (!validation.valid) {
    const err = `資料庫完整性驗證失敗 (${validation.issues.length} 個問題)`;
    const durationMs = Math.round(performance.now() - startMs);
    const failedLog: BackupLogEntry = {
      id: logId,
      timestamp,
      status: 'failed',
      backupFileName: fileName,
      fileSizeBytes: 0,
      databaseSnapshotCount: validation.recordCount,
      auditLogCount: db.audit_log?.length ?? 0,
      errorDetails: err,
      durationMs,
    };
    const logs = pruneLogs([...loadBackupLogs(), failedLog], config.maxLogEntries);
    saveBackupLogs(logs);
    if (config.alertOnError && onNotify) onNotify(err, 'error');
    return { success: false, logEntry: failedLog };
  }

  // 2. 序列化為 JSON
  let jsonStr: string;
  try {
    jsonStr = JSON.stringify(db, null, 2);
  } catch (e: any) {
    const err = `序列化失敗: ${e.message}`;
    const durationMs = Math.round(performance.now() - startMs);
    const failedLog: BackupLogEntry = {
      id: logId, timestamp, status: 'failed',
      backupFileName: fileName, fileSizeBytes: 0,
      databaseSnapshotCount: validation.recordCount,
      auditLogCount: db.audit_log?.length ?? 0,
      errorDetails: err, durationMs,
    };
    saveBackupLogs(pruneLogs([...loadBackupLogs(), failedLog], config.maxLogEntries));
    if (config.alertOnError && onNotify) onNotify(err, 'error');
    return { success: false, logEntry: failedLog };
  }

  const fileSizeBytes = new Blob([jsonStr]).size;

  // 3. 寫入檔案
  let targetDirLabel = config.directoryLabel || '瀏覽器下載目錄';
  try {
    if (config.directoryHandle instanceof FileSystemDirectoryHandle) {
      // File System Access API: 直接寫入已授權目錄
      const fileHandle = await config.directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();
    } else {
      // Fallback: 觸發瀏覽器下載
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  } catch (e: any) {
    const err = `寫入檔案失敗: ${e.name ?? 'UnknownError'} — ${e.message}`;
    const durationMs = Math.round(performance.now() - startMs);
    const failedLog: BackupLogEntry = {
      id: logId, timestamp, status: 'failed',
      backupFileName: fileName, fileSizeBytes,
      databaseSnapshotCount: validation.recordCount,
      auditLogCount: db.audit_log?.length ?? 0,
      targetDirectory: targetDirLabel,
      errorDetails: err, durationMs,
    };
    saveBackupLogs(pruneLogs([...loadBackupLogs(), failedLog], config.maxLogEntries));
    if (config.alertOnError && onNotify) onNotify(err, 'error');
    return { success: false, logEntry: failedLog };
  }

  // 4. 記錄成功日誌
  const durationMs = Math.round(performance.now() - startMs);
  const successLog: BackupLogEntry = {
    id: logId,
    timestamp,
    status: 'success',
    backupFileName: fileName,
    fileSizeBytes,
    databaseSnapshotCount: validation.recordCount,
    auditLogCount: db.audit_log?.length ?? 0,
    targetDirectory: targetDirLabel,
    durationMs,
  };

  const logs = pruneLogs([...loadBackupLogs(), successLog], config.maxLogEntries);
  saveBackupLogs(logs);

  // 更新 lastBackupId
  saveBackupConfig({ ...config, lastBackupId: logId });

  if (onNotify) {
    const sizeKB = (fileSizeBytes / 1024).toFixed(1);
    onNotify(
      `✅ 備份成功｜${fileName}｜${sizeKB} KB｜${durationMs} ms`,
      'success'
    );
  }

  return { success: true, logEntry: successLog };
}

// ─── 目錄授權（File System Access API）─────────────────────────────────────────

/**
 * 開啟目錄選擇對話框，取得寫入權杖
 * @returns { ok: boolean, handle: FileSystemDirectoryHandle | null, label: string }
 */
export async function pickBackupDirectory(): Promise<{
  ok: boolean;
  handle: FileSystemDirectoryHandle | null;
  label: string;
}> {
  // 檢查瀏覽器支援
  if (!('showDirectoryPicker' in window)) {
    return {
      ok: false,
      handle: null,
      label: '此瀏覽器不支援 File System Access API（需 Chrome/Edge 110+）',
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    // 權限測試：嘗試建立一個臨時檔案來驗證寫入權限
    try {
      const testFile = await handle.getFileHandle('.pms_backup_test', { create: true });
      const writable = await testFile.createWritable();
      await writable.write('');
      await writable.close();
      await handle.removeEntry('.pms_backup_test');
    } catch (permErr: any) {
      return {
        ok: false,
        handle: null,
        label: `權限測試失敗: ${permErr.message} — 請確認該資料夾有寫入權限`,
      };
    }

    return {
      ok: true,
      handle,
      label: handle.name || '(未命名目錄)',
    };
  } catch (e: any) {
    // 使用者取消選擇不視為錯誤
    if (e.name === 'AbortError' || e.name === 'NotAllowedError') {
      return { ok: false, handle: null, label: '已取消目錄選擇' };
    }
    return {
      ok: false,
      handle: null,
      label: `目錄選擇失敗: ${e.message}`,
    };
  }
}

// ─── 排程檢查工具 ──────────────────────────────────────────────────────────────

/**
 * 檢查現在是否應該執行備份（基於 scheduledHour/scheduledMinute）
 * 使用 session flag 防止同一次會話中重複觸發
 */
let _backupTriggeredThisSession = false;

export function shouldTriggerBackup(config: BackupScheduleConfig): boolean {
  if (!config.enabled) return false;
  if (_backupTriggeredThisSession) return false;

  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 3600 * 1000); // UTC+8
  const target = new Date(taiwanNow);
  target.setHours(config.scheduledHour, config.scheduledMinute, 0, 0);

  // 當前時間落在目標時間 ±2 分鐘內
  const diffMs = Math.abs(taiwanNow.getTime() - target.getTime());
  return diffMs < 2 * 60 * 1000;
}

/** 距離下次備份的分鐘數（負數表示已過） */
export function minutesUntilNextBackup(config: BackupScheduleConfig): number {
  if (!config.enabled) return Infinity;
  const now = new Date();
  const taiwanNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const target = new Date(taiwanNow);
  target.setHours(config.scheduledHour, config.scheduledMinute, 0, 0);

  if (taiwanNow >= target) {
    // 今天已過，算明天的
    target.setDate(target.getDate() + 1);
  }
  return Math.round((target.getTime() - taiwanNow.getTime()) / 60000);
}

/** 取得上次成功備份距今的天數 */
export function daysSinceLastBackup(logs: BackupLogEntry[]): number {
  const successes = logs.filter((l) => l.status === 'success');
  if (successes.length === 0) return Infinity;
  const last = new Date(successes[successes.length - 1].timestamp);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}
