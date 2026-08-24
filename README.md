# 料事如神系統 — Predictive Material System (PMS)

> **QCC 料事如神圈 · 射出成型智能備料與產能排程推估平台**  
> Baseline Version：`V-20260824-24` | Developed by Wesley Chang @Mouldex, Aug-2026  
> 軟體工程準則：Andrej Karpathy 軟體工程核心準則（謀定而後動 · 簡潔至上 · 外科手術式精準修改 · 目標導向與閉環驗證）

---

## 系統概述

料事如神系統 (PMS) 是一套專為**射出成型醫材與精密製造業**設計的前端智能物料需求運算與資料維運平台。系統以全瀏覽器本地端運行（LocalStorage 持久化），無需後端伺服器，即可完成從客戶預示量 (Forecast)、實單 (PO) 到採購決策的完整 3 階 MRP 推導、雙週出貨可行性審查、訂單全鏈路物料緊張度追蹤與數據鏈路穿透模擬。

**核心解決問題：**
- **角色專屬敏捷入口**：業務敏捷工作台（三向快查/偏差示警/交期秒答）與生管採購專屬工作台（防斷料倒數/3階MRP推導/模具產能/7大主檔），消除跨頁頻繁跳轉。
- **三向交叉比對與防斷料**：同屏比對「預示量、實單、歷史同期」，自動計算預測偏差率 (Bias%) 與三色燈號預警。
- **前瞻採購時程推算**：依據 Lead Time 自動倒推最晚發單日與倒數防線，杜絕因海運長交期導致停線斷料。
- **3 階 MRP 算式透明化**：白盒展開成品淨缺口、模具單穴耗料克重、安全存量與 MOQ 向上整補完整推導履歷。
- **出貨協調會賦能**：每週二出貨排程審查看板快速推算「現有庫存 + 3F WIP待驗良品折算」，5 分鐘內完成放行決策。
- **高內聚 7 大核心主檔**：消除多頭維護，良率標準與採購規則直合於品號主檔，遵循 3NF 關聯式架構。

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite 6 |
| 樣式 | Tailwind CSS v4 (JIT) |
| UI 字體 | Plus Jakarta Sans / JetBrains Mono / Noto Sans TC |
| 圖示 | lucide-react |
| Excel 匯出入 | xlsx (SheetJS) |
| 資料持久化 | Browser LocalStorage |
| 佈景主題 | Light / Dark 雙主題（系統偏好 + 手動切換）|
| 自進化引擎 | Impeccable Gate System + MECE 100% Validator + 14 份 CAPA 知識庫 |

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

## 系統架構 — 4 大 MECE 核心情境門戶 (13 大功能子視圖)

```
料事如神系統 (PMS)
├── 💼 [角色工作台 Role Workbenches]
│   ├── 業務敏捷工作台 (SalesWorkbenchView) — 三向快查 · 偏差示警 · 交期秒答 · 常用客戶鎖定
│   └── 生管/採購專屬工作台 (ProcurementWorkbenchView) — 防斷料倒數 · 3階MRP推導 · 模具日產能 · 7大主檔維護
├── 📊 [決策戰情 War Room]
│   ├── 綜合戰情儀表板 (DashboardView) — 三向需求交叉比對看板、客戶預測偏差分析 (Bias%)、備料透明度背書
│   ├── 週二出貨審查看板 (ShipScheduleClearanceView) — 雙週出貨可行性放行審查、良品+WIP折算、What-If 模擬
│   └── 訂單物料示警 (OrderTensionTrackerView) — 逐筆訂單 6 大供應鏈瓶頸診斷、4 級緊張度告警與應變 SOP
├── 🧮 [物料推導 MRP Engine]
│   └── 3 階 MRP 推導 (MrpCalculatorView) — 單品/全品 MRP 推導、白盒推導履歷抽屜、採購排程時間軸與防斷料倒數
├── 🗄️ [數據中心 Data Center]
│   ├── 7 大核心主檔維護 (DataTablesView) — 7 大核心主檔 CRUD 與 3 級變更管制（含 FK 影響掃描）
│   ├── 五層物料分類體系 (MaterialClassManagementView) — RAW/MAT/PART/COMP/SET 樹狀分類管理
│   └── 資料交換與鏈路模擬 (DataExchangeView) — JSON/Excel 雙向無損匯出入、全數據鏈路深度模擬與防斷鏈診斷
└── ⚙️ [系統支援 System & Support]
    ├── 參數策略配置 (SystemSettingsView) — 系統參數配置（預警門檻/排程策略/虛擬預扣開關/損耗率天花板）
    ├── 專業術語辭典 (GlossaryView) — 7 大分類專有名詞檢索 + 主檔案全欄位權威白話定義庫 (90+ 欄位)
    ├── PRD 規格文件 (PrdDocView) — 15 大核心可驗收目標 (OBJ-01 ~ OBJ-15) 規格與 DoD 驗收總表
    └── 自動化備份與復原 (BackupSettingsView) — 自動備份排程、恢復備份檔（Admin 模式）
```

---

## 資料模型 — 7 大核心營運主檔 (3NF 高內聚架構)

| # | 主檔名稱 | 主鍵 | 說明 |
|---|----------|------|------|
| 1 | **品號主檔** (`item_master`) | `sku` | 成品/原料身分證，**已直接合入良率標準與採購規則**（交期/MOQ/安全存量） |
| 2 | **模具與產能主檔** (`mold_master`) | `mold_id` | 妥善穴數、成型週期秒數、日產能計算值與模具運行狀態 |
| 3 | **產品模具成型 BOM** (`product_mold_bom`) | `sku + mold_id` | 整模克重、流道克重、成型損耗率、**直接內嵌色母/色粉配比** |
| 4 | **業務預估需求檔** (`demand_forecast_log`) | `demand_id` | 客戶滾動預示量 (Rolling Forecast) 與需求交期 |
| 5 | **實際訂單檔** (`actual_order`) | `order_id` | 正式客戶合約訂單 (Customer PO)、下單日期與約定交期 |
| 6 | **庫存與待驗快照檔** (`inventory_wip_snapshot`) | `snapshot_date + sku` | 4F 成品良品在庫、3F Sorting 待驗品、1F 原料可用庫存 |
| 7 | **在途採購訂單檔** (`po_in_transit`) | `po_number` | 在途原料採購量、預計到廠日 (ETA) 與在途物流狀態 |

*附屬檔：`material_classes`（五層物料樹）、`sorting_actual_yield_log`（全檢實際良率歷史軌跡）、`audit_log`（異動審計日誌）。*

---

## MRP 計算引擎 — 3 階推導邏輯

```
Phase 1 → 成品淨需求
  需求量 (Forecast ∪ Order) - FG 在庫良品 - WIP 待驗 × 良率 = FG 淨需求缺口

Phase 2 → 原料毛需求 (BOM 爆炸)
  FG 淨需求 × 單穴克重 ÷ (1 - 損耗率) ÷ 1000 = 原料毛需求 (KG)
  (若有色母配比，同步計算色料毛需求 = 原料毛需求 × 配比%)

Phase 3 → 採購決策
  原料毛需求 - (有效原料庫存 + 在途 PO) + 安全庫存 = 原料淨需求
  → 建議採購量 (向上取整至 MOQ 倍數)
  → 建議最晚下單日 (Target Date - Lead Time Days)
```

---

## 版本記錄

| 版本 | 日期 | 說明 |
|------|------|------|
| **V-20260824-24** | 2026-08-24 | **全專案整體程式碼與檔案優化版**：實裝「業務敏捷工作台」與「生管/採購專屬工作台」角色門戶；CAPA-001~014 報告全覆蓋（MECE 100/100 滿分驗證）；版號 SSOT 單一真相來源解除鎖定；雙通道 CI 部署與全色系對比度自動防禦門禁；存檔 IMPL-PLAN-002 自進化有機體實施計畫。 |
| V-20260824-01 | 2026-08-24 | 業務核心需求 15 大可驗收目標確立與 Karpathy 軟體工程準則全域植入版：三向交叉比對看板、白盒推導履歷抽屜、採購排程時間軸、7 大核心主檔收斂與去冗、90+ 主檔全欄位名稱定義庫入庫、PRD 規格書 V1.3.0 發布、單元測試 100% 通過。 |
| V-20260823-52 | 2026-08-23 | Smart Filter Hub 實作：MrpCalculatorView SKU 搜尋下拉選單 + ShipScheduleClearanceView 類別膠囊/即時搜尋、全域死碼 import 清理、版本號對齊。 |
| V-20260823-29 | 2026-08-23 | 52 筆代表性物料數據鏈與開箱智慧雙模換檔機制版、通配選擇器污染根除 (CAPA-011)。 |
| V-20260823-16 | 2026-08-23 | 週二出貨審查看板、預測偏差分析、WIP 日動態推估、虛擬預扣、分批到貨排程建議、訂單緊張度引擎。 |
| V-20260821-20 | 2026-08-21 | 五層物料分類體系、FieldArchitectureAudit_Report、H-01~H-03 校驗函式。 |
| V-20260820-12 | 2026-08-20 | 首個完整基準版本。主檔 CRUD、3 階 MRP 引擎、JSON/Excel 雙向匯出入、3 級變更管制審計日誌。 |
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
├── App.tsx                   # 根元件：路由、Toast、LocalStorage 持久化、雙模切換
├── types.ts                  # 全局 TypeScript 型別定義（7 核心主檔 + MRP 結果 + 系統參數 + 物料分類）
├── index.css                 # 全局樣式（Tailwind base + 自定義 utility）
├── context/
│   └── ThemeContext.tsx      # 主題狀態管理（Light/Dark + LocalStorage 持久化）
├── data/
│   ├── seedData.ts           # 52 筆全階層貫通代表性物料資料庫
│   ├── glossaryData.ts       # 專業術語辭典基礎資料
│   └── masterFieldDictionary.ts # 7 大主表 90+ 欄位權威業務定義字典
├── utils/
│   ├── mrpEngine.ts          # 3 階 MRP 計算核心引擎（白盒推導 + 分批到貨 + 虛擬預扣）
│   ├── demandAnalysisEngine.ts # 三向需求交叉比對與預測偏差 (Bias%) 分析引擎
│   ├── wipEngine.ts          # WIP 日動態推估公式計算器（消除夜班 12h 時序差）
│   ├── orderTensionEngine.ts # 訂單全鏈路 6 大環節瓶頸診斷引擎
│   ├── dataExchange.ts       # JSON/Excel 雙向匯出入 + 資料填報規範字典
│   ├── fieldMeta.ts          # 主檔欄位元數據（編輯等級、型態、驗證規則）
│   ├── dataIntegrityScanner.ts # MECE 數據鏈路健康度與孤兒資料掃描器
│   ├── backupService.ts      # 自動備份排程與本地存儲管理
│   └── materialClassValidation.ts  # 五層物料分類驗證工具（SKU 前綴推斷、FK 校驗）
└── components/
    ├── Navbar.tsx             # 頂部導覽列（導航頁籤 + 主題切換 + 告警徽章 + Telemetry 雙模徽章）
    ├── DashboardView.tsx      # 決策戰情室（三向需求交叉比對 + 預測偏差分析 + 供需透明度）
    ├── MrpCalculatorView.tsx  # MRP 計算器（白盒推導履歷抽屜 + 防斷料倒數時間軸 + 採購建議）
    ├── ShipScheduleClearanceView.tsx # 週二出貨排程審查看板（雙週放行審查 + What-If 模擬）
    ├── OrderTensionTrackerView.tsx   # 訂單物料緊張追蹤看板（6 大環節穿透診斷 + RCA 應變）
    ├── SystemSettingsView.tsx # 系統參數配置面板（沖銷模式/虛擬預扣/損耗率天花板）
    ├── DataTablesView.tsx     # 7 大核心主檔 CRUD（3 級變更管制 + FK 影響掃描）
    ├── DataExchangeView.tsx   # 無損資料中心（雙模換檔 + Excel/JSON 雙向匯出入 + 穿透模擬）
    ├── GlossaryView.tsx       # 專業術語辭典（含 📊 主檔案欄位名稱定義表專屬專題）
    ├── MaterialClassManagementView.tsx  # 五層物料分類樹管理 (RAW/MAT/PART/COMP/SET)
    ├── BackupSettingsView.tsx # 備份與復原設定面板
    └── PrdDocView.tsx         # PRD 規格與 15 大核心可驗收目標 (OBJ-01 ~ OBJ-15) 檢視
```

---

*料事如神系統 © 2026 Wesley Chang @Mouldex · Apache-2.0 License*
