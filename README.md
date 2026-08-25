# 料事如神系統 — Predictive Material System (PMS)

> **QCC 料事如神圈 · 射出成型智能備料與產能排程推估平台**  
> Baseline Version：`V-20260825-16`（SSOT 單一真相來源：`src/utils/version.ts`，pre-commit 自動同步） | Developed by Wesley Chang @Mouldex, Aug-2026  
> 軟體工程準則：Andrej Karpathy 軟體工程核心準則（謀定而後動 · 簡潔至上 · 外科手術式精準修改 · 目標導向與閉環驗證）

---

## 系統概述

料事如神系統 (PMS) 是一套專為**射出成型醫材與精密製造業**設計的前端智能物料需求運算與資料維運平台。系統以全瀏覽器本地端運行（LocalStorage 持久化），無需後端伺服器，即可完成從客戶預示量 (Forecast)、實單 (PO) 到採購決策的完整 3 階 MRP 推導、雙週出貨排程審查、訂單缺料瓶頸分析與資料關聯性模擬。

**核心解決問題：**
- **角色工作台**：業務工作台（快速查詢/偏差示警/交期確認）與生管採購工作台（採購下單倒數/3階MRP推導/模具產能/資料表維護），消除跨頁頻繁跳轉。
- **三向交叉比對與防斷料**：同屏比對「預示量、實單、歷史同期」，自動計算預測偏差率 (Bias%) 與三色燈號預警。
- **採購時程推算**：依據 Lead Time 自動倒推最晚下單日與倒數提醒，防止因採購交期延誤導致停線斷料。
- **3 階 MRP 算式透明化**：公式明細展開成品淨缺口、模具單穴耗料克重、安全存量與 MOQ 向上整補完整推導過程。
- **出貨排程審查**：雙週出貨排程審查看板快速推算「現有庫存 + 在製品 WIP 待驗良品折算」，5 分鐘內完成放行決策。
- **8 大核心主檔維護**：消除多頭維護，良率標準與採購規則直合於品號主檔，遵循 3NF 關聯式架構。

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite 6 |
| 樣式 | Tailwind CSS v4 (JIT) |
| UI 字體 | 系統字體堆疊（PingFang TC / Noto Sans TC / Microsoft JhengHei + SF Mono / Consolas） |
| 圖示 | lucide-react |
| Excel 匯出入 | xlsx (SheetJS) |
| 資料持久化 | Browser LocalStorage |
| 佈景主題 | Light / Dark 雙主題（系統偏好 + 手動切換）|
| 自進化引擎 | Impeccable Gate System + MECE 100% Validator + 15 份 CAPA 知識庫 |

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

> **注意：** 本系統為純前端架構，支援開箱即用 52 筆工業級示範庫 (DEMO) 與正式生產數據 (PROD) 智慧雙模切換。

---

## 系統架構 — 4 大 MECE 核心情境門戶 (14 大功能子視圖)

```
料事如神系統 (PMS)
├── 💼 [角色工作台 Role Workbenches]
│   ├── 業務工作台 (SalesWorkbenchView) — 客戶/品號快速查詢 · 預測偏差比對 · 交期確認
│   └── 生管採購工作台 (ProcurementWorkbenchView) — 最晚下單日倒數 · 3階MRP推導 · 模具產能 · 資料表維護
├── 📊 [決策總覽 Overview]
│   ├── 物料需求總覽 (DashboardView) — 三向需求交叉比對看板、客戶預測偏差分析 (Bias%)
│   ├── 出貨排程審查看板 (ShipScheduleClearanceView) — 雙週出貨可行性放行審查、良品+WIP折算、情境模擬
│   ├── 訂單缺料分析 (OrderTensionTrackerView) — 逐筆訂單 6 大供應鏈瓶頸診斷、缺料原因分析與處置建議
│   └── 數據流程圖 (DataPipelineView) — 數據流程與工作站管線總覽
├── 🧮 [物料需求運算 MRP Engine]
│   └── 3 階 MRP 推導 (MrpCalculatorView) — 單品/全品 MRP 推導、計算公式明細、採購排程時間軸與下單倒數
├── 🗄️ [資料管理 Data Management]
│   ├── 資料表維護 (DataTablesView) — 8 大核心主檔 CRUD 與 3 級變更管制（含 FK 影響掃描）
│   ├── 物料分類體系 (MaterialClassManagementView) — RAW/MAT/PART/COMP/SET 樹狀分類管理
│   └── 資料匯入匯出與模擬 (DataExchangeView) — JSON/Excel 雙向匯出入、資料關聯完整性掃描與流程模擬
└── ⚙️ [系統設定 System & Settings]
    ├── 參數策略設定 (SystemSettingsView) — 系統參數配置（預警門檻/排程策略/虛擬預扣開關/損耗率天花板）
    ├── 名詞術語說明 (GlossaryView) — 8 大分類專有名詞檢索 + 主檔案欄位定義庫 (90+ 欄位)
    ├── 系統規格與驗收 (PrdDocView) — 15 大核心可驗收目標 (OBJ-01 ~ OBJ-15) 規格與驗收總表
    └── 自動化備份與復原 (BackupSettingsView) — 自動備份排程、恢復備份檔（Admin 模式）
```

---

## 資料模型 — 8 大核心營運主檔 (3NF 高內聚架構)

| # | 主檔名稱 | 主鍵 | 說明 |
|---|----------|------|------|
| 1 | **品號主檔** (`item_master`) | `sku` | 成品/原料身分證，**已直接合入良率標準與採購規則**（交期/MOQ/安全存量） |
| 2 | **模具與產能主檔** (`mold_master`) | `mold_id` | 妥善穴數、成型週期秒數、日產能計算值與模具運行狀態 |
| 3 | **產品模具成型 BOM** (`product_mold_bom`) | `sku + mold_id` | 整模克重、流道克重、成型損耗率、**直接內嵌色母/色粉配比** |
| 4 | **業務預估需求檔** (`demand_forecast_log`) | `demand_id` | 客戶滾動預示量 (Rolling Forecast) 與需求交期 |
| 5 | **實際訂單檔** (`actual_order`) | `order_id` | 正式客戶合約訂單 (Customer PO)、下單日期與約定交期 |
| 6 | **庫存與待驗快照檔** (`inventory_wip_snapshot`) | `snapshot_date + sku` | 成品良品在庫、在製品待驗區 (WIP) 待驗品、原料在庫可用庫存 |
| 7 | **在途採購訂單檔** (`po_in_transit`) | `po_number` | 在途原料採購量、預計到廠日 (ETA) 與在途物流狀態 |
| 8 | **Sorting 實際良率紀錄檔** (`sorting_actual_yield_log`) | `log_id` | 每日現場檢驗實績動態回饋、批號追溯與實際檢驗良率 |

*附屬檔：`material_classes`（五層物料樹）、`sorting_actual_yield_log`（全檢實際良率歷史軌跡，即主表 #8 之歷史軌跡用途說明）、`audit_log`（異動審計日誌）。*

> **註**：主檔數量與名稱之單一事實來源為 `src/data/masterFieldDictionary.ts`（8 大核心主檔）；本文件與 `docs/PMS_Data_Dictionary.md`、`docs/PMS_Master_Field_Data_Dictionary.html` 均由其衍生，如有出入以 SSOT 為準。

---

## MRP 計算引擎 — 3 階推導邏輯

```
Phase 1 → 成品淨需求
  需求量 (Forecast ∪ Order) - FG 在庫良品 - WIP 待驗 × 良率 = FG 淨需求缺口

Phase 2 → 原料毛需求 (BOM 爆炸)
  FG 淨需求 × 單穴克重 ÷ (1 - 損耗率) ÷ 1000 = 原料毛需求 (KG)
  (若有色母配比，拆分雙軌：樹脂 = 總量 ÷ (1 + 配比%)、色母 = 總量 − 樹脂)

Phase 3 → 採購決策
  原料毛需求 - (有效原料庫存 + 在途 PO) + 安全庫存 = 原料淨需求
  → 建議採購量 (向上取整至 MOQ 倍數)
  → 建議最晚下單日 (Target Date - Lead Time Days)
```

---

## 版本記錄

| 版本 | 日期 | 說明 |
|------|------|------|
| **V-20260825-12** | 2026-08-25 | **Anti-Placebo 數據鏈誠實化版**：拔除全域預設備胎（MRP/訂單張力/出貨審查共 10 處 fallback）、主檔缺值即拒算並精確警示缺哪個欄位、多模具策略假選項修復（conservative 改純最大克重）、完整性掃描新增 missing_field 規則、設定頁死旋鈕移除與倉容文案更正。 |
| V-20260825-11 | 2026-08-25 | **V2-Intranet 內網部署版**：PowerShell 5.1 檔案服務後端（零依賴 HttpListener + 樂觀鎖 404/409 + 滾動快照）、共用資料適配器 loadSharedData/saveSharedData 雙模式接線、GitHub Actions artifact 部署（gh-pages 移除）。 |
| V-20260824-24 | 2026-08-24 | **全專案整體程式碼與檔案優化版**：實裝「業務工作台」與「生管採購工作台」角色門戶；CAPA-001~014 報告全覆蓋（MECE 100/100 滿分驗證）；版號 SSOT 單一真相來源解除鎖定；雙通道 CI 部署與全色系對比度自動防禦門禁；存檔 IMPL-PLAN-002 自進化有機體實施計畫。 |
| V-20260824-01 | 2026-08-24 | 業務核心需求 15 大可驗收目標確立與 Karpathy 軟體工程準則全域植入版：三向交叉比對看板、計算公式明細抽屜、採購排程時間軸、7 大核心主檔收斂與去冗、90+ 主檔全欄位名稱定義庫入庫、PRD 規格書 V1.3.0 發布、單元測試 100% 通過。 |
| V-20260823-52 | 2026-08-23 | Smart Filter Hub 實作：MrpCalculatorView SKU 搜尋下拉選單 + ShipScheduleClearanceView 類別膠囊/即時搜尋、全域死碼 import 清理、版本號對齊。 |
| V-20260823-29 | 2026-08-23 | 52 筆代表性物料數據鏈與開箱智慧雙模換檔機制版、通配選擇器污染根除 (CAPA-011)。 |
| V-20260823-16 | 2026-08-23 | 週二出貨審查看板、預測偏差分析、WIP 日動態推估、虛擬預扣、分批到貨排程建議、訂單緊張度引擎。 |
| V-20260821-20 | 2026-08-21 | 五層物料分類體系、FieldArchitectureAudit_Report、H-01~H-03 校驗函式。 |
| V-20260820-12 | 2026-08-20 | 首個完整基準版本。主檔 CRUD、3 階 MRP 引擎、JSON/Excel 雙向匯出入、3 級變更管制審計日誌。 |

---

## 專案結構

```
src/
├── main.tsx                  # 應用入口，ThemeProvider 包裝
├── App.tsx                   # 根元件：路由、Toast、LocalStorage 持久化、雙模切換、內網共用資料同步
├── types.ts                  # 全局 TypeScript 型別定義（8 核心主檔 + MRP 結果 + 系統參數 + 物料分類）
├── index.css                 # 全局樣式（Tailwind base + 自定義 utility）
├── context/
│   └── ThemeContext.tsx      # 主題狀態管理（Light/Dark + LocalStorage 持久化）
├── data/
│   ├── seedData.ts           # 52 筆全階層貫通代表性物料資料庫
│   ├── glossaryData.ts       # 專業術語辭典基礎資料
│   └── masterFieldDictionary.ts # 8 大主表 90+ 欄位權威業務定義字典（欄位字典 SSOT）
├── utils/
│   ├── mrpEngine.ts          # 3 階 MRP 計算核心引擎（公式推導 + 分批到貨 + 虛擬預扣 + 缺值拒算）
│   ├── demandAnalysisEngine.ts # 三向需求交叉比對與預測偏差 (Bias%) 分析引擎
│   ├── wipEngine.ts          # WIP 日動態推估公式計算器（消除夜班 12h 時序差）
│   ├── orderTensionEngine.ts # 訂單 6 大環節瓶頸診斷引擎（無 BOM 訂單誠實標記）
│   ├── dataIntegrityScanner.ts # 資料關聯完整性與孤兒資料掃描器（含 missing_field 檢查）
│   ├── dataExchange.ts       # JSON/Excel 雙向匯出入 + 資料填報規範字典
│   ├── fieldMeta.ts          # 主檔欄位元數據（編輯等級、型態、驗證規則）
│   ├── materialClassValidation.ts  # 五層物料分類驗證工具（SKU 前綴推斷、FK 校驗）
│   ├── backupService.ts      # 自動備份排程與本地存儲管理
│   ├── dataStoreAdapter.ts   # V2-Intranet 共用資料適配器（loadSharedData/saveSharedData，樂觀鎖）
│   └── version.ts            # 版號 SSOT 單一真相來源（sync-version.mjs 自動同步）
└── components/
    ├── Navbar.tsx             # 頂部導覽列（導航頁籤 + 主題切換 + 告警徽章 + 內網來源狀態/儲存按鈕）
    ├── Sidebar.tsx            # 左側導覽選單（桌面固定 / 行動抽屜）
    ├── SalesWorkbenchView.tsx        # 業務工作台（客戶/品號快速查詢 · 預測偏差比對 · 交期確認）
    ├── ProcurementWorkbenchView.tsx  # 生管採購工作台（下單倒數 · MRP 推導 · 模具產能 · 資料表維護入口）
    ├── DashboardView.tsx      # 物料需求總覽（三向需求交叉比對 + 預測偏差分析）
    ├── DataPipelineView.tsx   # 數據流程與工作站管線總覽
    ├── MrpCalculatorView.tsx  # MRP 計算器（計算公式明細 + 最晚下單日倒數 + 採購建議）
    ├── ShipScheduleClearanceView.tsx # 出貨排程審查看板（雙週放行審查 + 情境模擬）
    ├── OrderTensionTrackerView.tsx   # 訂單缺料分析看板（6 大環節瓶頸診斷 + 處置建議）
    ├── DataTablesView.tsx     # 資料表維護（3 級變更管制 + FK 影響掃描）
    ├── DataExchangeView.tsx   # 資料匯入匯出與模擬（雙模換檔 + Excel/JSON 匯出入 + 關聯檢核）
    ├── GlossaryView.tsx       # 名詞術語說明（含資料表欄位定義）
    ├── MaterialClassManagementView.tsx  # 五層物料分類樹管理 (RAW/MAT/PART/COMP/SET)
    ├── SystemSettingsView.tsx # 參數策略設定（沖銷模式/虛擬預扣/損耗率天花板；物料屬性以主檔為準）
    ├── BackupSettingsView.tsx # 備份與復原設定面板
    └── PrdDocView.tsx         # 系統規格與 15 大核心可驗收目標 (OBJ-01 ~ OBJ-15) 檢視
```

---

*料事如神系統 © 2026 Wesley Chang @Mouldex · Apache-2.0 License*
