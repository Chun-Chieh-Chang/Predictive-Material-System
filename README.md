# 料事如神系統 — Predictive Material System (PMS)

> **QCC 料事如神圈 · 射出成型智能備料與產能排程推估平台**  
> Baseline Version：`V-20260820-12` | Developed by Wesley Chang @Mouldex, Aug-2026

---

## 系統概述

料事如神系統 (PMS) 是一套專為**射出成型製造業**設計的前端智能物料需求運算與資料維運平台。系統以全瀏覽器本地端運行（LocalStorage 持久化），無需後端伺服器，即可完成從客戶預測 (Forecast) 到採購決策的完整 3 階 MRP 推導。

**核心解決問題：**
- 快速判斷「現有庫存 + WIP + 在途料」能否滿足客戶需求
- 自動展開原料毛需求（BOM 爆炸），結合良率與損耗率精算
- 動態產能排程，識別產能瓶頸（赤字天數告警）
- 採購決策輔助：建議採購量（向上取整 MOQ）與最晚下單日

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite 6 |
| 樣式 | Tailwind CSS v4 (JIT) |
| UI 字體 | Plus Jakarta Sans / JetBrains Mono / Noto Sans TC |
| 圖示 | lucide-react |
| 動畫 | motion (Framer Motion) |
| Excel 匯出入 | xlsx (SheetJS) |
| 資料持久化 | Browser LocalStorage |
| 佈景主題 | Light / Dark 雙主題（系統偏好 + 手動切換）|

---

## 快速啟動

**Prerequisites:** Node.js >= 18

```bash
# 1. 安裝依賴
npm install

# 2. 啟動開發伺服器
npm run dev
# → 開啟 http://localhost:3000
```

> **注意：** 本系統為純前端架構，`.env` 設定（`GEMINI_API_KEY`）僅供後端 API 預留架構使用，純 UI 功能無需配置。

---

## 系統架構 — 6 大功能模組

```
PMS
├── [決策戰情室]     DashboardView       綜合儀表板：MRP 全局告警、庫存熱圖、KPI 追蹤
├── [3階 MRP 推導]  MrpCalculatorView   單品/全品 MRP 計算引擎、多版本需求比較
├── [參數策略設定]   SystemSettingsView  系統參數 & 業務規則配置（預警門檻/排程策略/良率基準）
├── [8大主檔維護]   DataTablesView      9 張資料主檔的 CRUD（含 3 級變更管制審計日誌）
├── [無損資料中心]  DataExchangeView    JSON/Excel 匯出入、資料規格字典、示範數據載入
└── [PRD 規格辭典]  PrdDocView          系統設計規格文件（PRD）瀏覽器
```

---

## 資料模型 — 9 大主檔

| # | 主檔名稱 | 主鍵 | 說明 |
|---|----------|------|------|
| 1 | **料號基本主檔** (item_master) | `sku` | 成品/原料品號、客戶代碼、計量單位 |
| 2 | **模具產能主檔** (mold_master) | `mold_id` | 穴數、週期時間、日產能 |
| 3 | **產品模具 BOM** (product_mold_bom) | `sku + mold_id` | 原料用料展開、損耗率 |
| 4 | **良率標準檔** (yield_master) | `sku` | Sorting 全檢良率 |
| 5 | **採購供應商規則** (supplier_rule_master) | `rm_sku` | 交期、MOQ、安全庫存 |
| 6 | **業務需求預測** (demand_forecast_log) | `demand_id` | 分版本預估需求量 |
| 7 | **實際訂單** (actual_order) | `order_id` | 確認訂單量、交期 |
| 8 | **庫存 WIP 快照** (inventory_wip_snapshot) | `snapshot_date + sku` | 成品在庫、待驗品、原料庫存 |
| 9 | **在途採購訂單** (po_in_transit) | `po_number` | 在途原料量、到廠日 |

另包含 **變更審計日誌** (audit_log)：記錄所有 Level 2/3 主檔異動（僅匯出，禁止匯入覆蓋）。

---

## MRP 計算引擎 — 3 階推導邏輯

```
Phase 1 → 成品淨需求
  需求量 (Forecast ∪ Order) - FG 在庫良品 - WIP 待驗 × 良率 = FG 淨需求缺口

Phase 2 → 原料毛需求 (BOM 爆炸)
  FG 淨需求 × 單穴克重 ÷ (1 - 損耗率) ÷ 1000 = 原料毛需求 (KG)

Phase 3 → 採購決策
  原料毛需求 - 原料在庫 - 在途原料 × 安全庫存係數 = 原料淨需求
  → 建議採購量 (向上取整至 MOQ 倍數)
  → 建議最晚下單日 (Target Date - Lead Time Days)
```

---

## 系統參數（可配置）

| 參數 | 預設值 | 說明 |
|------|--------|------|
| 採購緊急警戒天數 | 15 天 | 距最晚下單日低於此值觸發紅色告警 |
| 供需超備倍數門檻 | 1.6 x | 庫存/需求 > 此倍數觸發滯料告警 |
| 全廠倉容上限 | 12,000 KG | 單項原料實體倉容天花板 |
| 多模備料策略 | 最保守重量 | 多模時選最大原料耗用量 |
| 需求彙總模式 | 累加模式 | Forecast + Order 加總（可改為 PO 消耗/僅預測/僅訂單）|
| 每日有效工時 | 24.0 小時 | 排程產能基礎 |

---

## 版本記錄

| 版本 | 日期 | 說明 |
|------|------|------|
| V-20260820-12 | 2026-08-20 | 首個完整基準版本。9 大主檔 CRUD、3 階 MRP 引擎、JSON/Excel 雙向匯出入、3 級變更管制審計日誌、Light/Dark 雙主題、PRD 規格辭典模組 |

---

## 專案結構

```
src/
├── main.tsx                  # 應用入口，ThemeProvider 包裝
├── App.tsx                   # 根元件：路由、Toast、LocalStorage 持久化
├── types.ts                  # 全局 TypeScript 型別定義（9 主檔 + MRP 結果 + 系統參數）
├── index.css                 # 全局樣式（Tailwind base + 自定義 utility）
├── context/
│   └── ThemeContext.tsx      # 主題狀態管理（Light/Dark + LocalStorage 持久化）
├── data/
│   └── seedData.ts           # 三套資料庫：EMPTY / DEMO_SAMPLE / INITIAL
├── utils/
│   ├── mrpEngine.ts          # 3 階 MRP 計算核心引擎
│   ├── dataExchange.ts       # JSON/Excel 匯出入 + 資料規格字典
│   └── fieldMeta.ts          # 主檔欄位元數據（編輯等級、型態、驗證規則）
└── components/
    ├── Navbar.tsx             # 頂部導覽列（6 頁籤 + 主題切換 + 告警徽章）
    ├── DashboardView.tsx      # 決策戰情室（全局 MRP 摘要 + 告警列表）
    ├── MrpCalculatorView.tsx  # MRP 計算器（單品推導 + 多版本比較）
    ├── SystemSettingsView.tsx # 系統參數配置面板
    ├── DataTablesView.tsx     # 8 大主檔 CRUD（3 級變更管制）
    ├── DataExchangeView.tsx   # 無損資料中心（JSON/Excel 匯出入）
    └── PrdDocView.tsx         # PRD 規格辭典瀏覽器
```

---

*料事如神系統 © 2026 Wesley Chang @Mouldex · Apache-2.0 License*
