/// <reference types="vite/client" />

/**
 * 由 vite-plugin-git-version.ts 在建構階段注入。
 * 格式：V-{BASE_DATE}-{gitCount}，例如 V-20260820-2
 * BASE_DATE 固定為系統基線日（初始 commit 日），commitCount 隨每次 commit 自動遞增。
 */
interface ImportMetaEnv {
  readonly VITE_PMS_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
