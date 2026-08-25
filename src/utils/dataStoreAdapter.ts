/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dataStoreAdapter.ts — V2-Intranet 資料儲存介面卡
 *
 * 雙實作資料來源：
 * - IntranetStore : 內網檔案服務（server/intranet-service.ps1），多人共用 db.json
 * - LocalStorageStore : 本機模式（服務未啟動時的離線 fallback）
 *
 * 樂觀鎖協定：GET 回應帶 ETag: <version>；PUT 需帶 If-Match，版本不符回 409。
 */

import { SystemDatabase, SystemParameters, MaterialClass } from '../types';

export interface SharedDataPayload {
  database: SystemDatabase;
  systemParams: SystemParameters;
  materialClasses: MaterialClass[];
}

export type DataSourceMode = 'intranet' | 'local';

export interface SharedLoadResult {
  mode: DataSourceMode;
  /** null = 內網可達但尚未初始化（404），應以 seed 初始化後回寫 */
  payload: SharedDataPayload | null;
  version: number;
  /** local 模式時的失敗原因（供 UI 透明顯示） */
  error?: string;
}

export interface SharedSaveResult {
  ok: boolean;
  version: number;
  savedAt?: string;
  conflict?: boolean;
  currentVersion?: number;
  error?: string;
}

export async function loadSharedData(): Promise<SharedLoadResult> {
  // 靜態託管環境（GitHub Pages 等）不可能存在內網檔案服務，
  // 直接本機模式，避免每次載入產生 404/405 請求噪音與誤判初始化。
  if (typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname)) {
    return { mode: 'local', payload: null, version: 0, error: '靜態託管環境（GitHub Pages），使用本機模式' };
  }
  try {
    const res = await fetch('/api/db', { method: 'GET' });
    if (res.status === 404) {
      // 內網服務的 404 回應為 application/json（error: not_initialized）；
      // 靜態主機的 404 為 text/html —— 以 Content-Type 判別，避免誤入初始化流程（PUT 405）。
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return { mode: 'local', payload: null, version: 0, error: '找不到內網檔案服務（/api/db），已切換本機模式' };
      }
      return { mode: 'intranet', payload: null, version: 0 };
    }
    if (!res.ok) {
      return { mode: 'local', payload: null, version: 0, error: `服務回應異常 (HTTP ${res.status})` };
    }
    const payload = (await res.json()) as SharedDataPayload;
    const version = Number(res.headers.get('ETag')) || 0;
    return { mode: 'intranet', payload, version };
  } catch (e) {
    return { mode: 'local', payload: null, version: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveSharedData(
  payload: SharedDataPayload,
  version: number
): Promise<SharedSaveResult> {
  try {
    const res = await fetch('/api/db', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'If-Match': String(version),
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, version, conflict: true, currentVersion: Number(body.currentVersion) || 0 };
    }
    if (!res.ok) {
      return { ok: false, version, error: `服務回應異常 (HTTP ${res.status})` };
    }
    const body = await res.json();
    return { ok: true, version: Number(body.version), savedAt: body.savedAt };
  } catch (e) {
    return { ok: false, version, error: e instanceof Error ? e.message : String(e) };
  }
}
