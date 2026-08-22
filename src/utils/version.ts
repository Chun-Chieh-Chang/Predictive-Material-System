/**
 * src/utils/version.ts
 *
 * 集中化管理 PMS 版本常數（MECE 單一真相來源）。
 * 所有元件從這裡匯入，避免版號散落在多處造成不一致。
 */
export const PMS_VERSION: string = import.meta.env.VITE_PMS_VERSION || 'dev';

/** 系統標題文字（集中化品牌文案） */
export const SYSTEM_TITLE: string = '料事如神系統';
export const SYSTEM_SUBTITLE: string = 'Predictive Material System';
export const SYSTEM_TAGLINE: string = 'QCC 料事如神圈 • 射出成型智能備料與產能排程推估';
