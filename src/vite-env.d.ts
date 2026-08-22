/// <reference types="vite/client" />

/**
 * 由 vite-plugin-git-version.ts 在建構階段注入。
 * 格式：V-{BASE_DATE}-{gitCount}，例如 V-20260820-2
 * BASE_DATE 為建構時的 UTC 日期，確保本地與 CI 環境版號一致（MECE）。
 */
interface ImportMetaEnv {
  readonly VITE_PMS_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
