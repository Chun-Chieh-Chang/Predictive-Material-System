/// <reference types="vite/client" />

/**
 * 由 vite-plugin-git-version.ts 在建構階段注入。
 * 格式：V-{BASE_DATE}-{gitCount}，例如 V-20260822-02
 * BASE_DATE 為建構時的本地日期（與使用者電腦時區一致）。
 */
interface ImportMetaEnv {
  readonly VITE_PMS_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
