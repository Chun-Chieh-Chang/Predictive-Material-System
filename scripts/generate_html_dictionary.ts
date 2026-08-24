import fs from 'fs';
import path from 'path';
import { MASTER_TABLE_SCHEMAS } from '../src/data/masterFieldDictionary.ts';

// Detailed UI & Data Chain locations mapping for each table and fieldKey
const FIELD_LOCATIONS: Record<string, Record<string, string>> = {
  item_master: {
    sku: '業務工作台（品號查詢/訂單明細）、生管採購工作台（MRP 品號選單）、總覽儀表板（品號過濾）、出貨排程審查看板（品號清單）、資料表維護',
    alt_sku: '資料表維護（品號主檔）、生管採購工作台（替代料/備用料備料提醒）',
    customer_id: '業務工作台（客戶查詢樞紐）、總覽儀表板（客戶維度過濾與預測比對）、資料表維護',
    category: '出貨排程審查看板（產品類別篩選膠囊）、總覽儀表板、資料表維護',
    material_class: '物料分類體系管理視圖、生管採購工作台（BOM 與良率分流判定）、資料表維護',
    color: '生管採購工作台（外觀與混料配比換算）、資料表維護',
    unit: '3 階 MRP 推導（PCS / KG / SET 跨階單位轉換基準）、資料表維護',
    description: '資料表維護（品號規格書型號、醫療級認證與原廠包裝備註）',
    std_sorting_yield: '出貨排程審查看板（WIP 待驗良品折算）、3 階 MRP 第 1 階算式過程、資料表維護',
    supplier_name: '3 階 MRP 第 3 階採購建議（供應商對象）、在途原料物流追蹤、資料表維護',
    lead_time_days: '生管採購工作台（最晚下單日 30 天時程軸）、3 階 MRP 第 3 階發單日倒推、資料表維護',
    moq_kg: '3 階 MRP 第 3 階建議採購量向上整補、資料表維護',
    safety_stock_kg: '3 階 MRP 第 3 階原料淨缺口緩衝算式、資料表維護'
  },
  mold_master: {
    mold_id: '生管採購工作台（模具日產能卡片）、成型 BOM 關聯選單、資料表維護',
    active_cavities: '3 階 MRP 第 2 階單穴克重算式、生管採購工作台（現場實際妥善穴數與日產能推估）、資料表維護',
    design_cavities: '資料表維護（原始設計穴數，對比塞穴損耗）',
    cycle_time_sec: '生管採購工作台（模具日產能公式: (86400 / 週期) × 妥善穴數）、資料表維護',
    daily_capacity: '生管採購工作台（模具日產能卡片）、總覽儀表板（機台負荷估算）、資料表維護',
    location: '資料表維護（模具庫位與機台位置）',
    status: '訂單缺料分析（模具可用性環節診斷）、資料表維護'
  },
  product_mold_bom: {
    sku: '3 階 MRP 第 2 階 BOM 展開入口、資料表維護',
    mold_id: '3 階 MRP 第 2 階成型模具綁定、生管採購工作台、資料表維護',
    rm_sku: '3 階 MRP 第 2 階到第 3 階原料關聯展開、資料表維護',
    net_mold_weight_g: '3 階 MRP 第 2 階單穴耗料克重算式、資料表維護',
    runner_weight_g: '3 階 MRP 第 2 階注塑廢料分攤算式、資料表維護',
    unit_weight_g: '3 階 MRP 第 2 階單穴克重計算公式明細、資料表維護',
    is_primary_mold: '3 階 MRP 自動選模策略（優先採用主力模具運算）、資料表維護',
    std_mfg_scrap_rate: '3 階 MRP 第 2 階原料毛需求損耗膨脹算式、資料表維護',
    color_mixing_ratio_pct: '3 階 MRP 第 3 階色母雙軌採購需求推算、生管採購工作台、資料表維護',
    remarks: '資料表維護（BOM 工程變更與試模備註）',
    valid_from: '資料表維護（BOM 生效起始日）',
    valid_to: '資料表維護（BOM 失效截止日）'
  },
  inventory_wip_snapshot: {
    snapshot_date: '全系統庫存快照基準日、資料匯入匯出中心、資料表維護',
    sku: '庫存查詢、出貨排程審查看板、3 階 MRP 算式、資料表維護',
    fg_ready_qty: '業務工作台（在庫現貨庫存）、出貨排程審查看板（放行第一道防線）、3 階 MRP 第 1 階淨需求扣抵、資料表維護',
    wip_pending_qty: '出貨排程審查看板（WIP 良率折算支援）、3 階 MRP 第 1 階扣抵、訂單缺料分析（WIP 環節）、資料表維護',
    rm_on_hand_kg: '生管採購工作台（原料在手存量）、3 階 MRP 第 3 階淨缺口扣抵、訂單缺料分析（原料在庫環節）、資料表維護'
  },
  po_in_transit: {
    po_number: '生管採購工作台（在途採購單清單）、訂單缺料分析、資料表維護',
    rm_sku: '3 階 MRP 第 3 階在途抵扣、資料表維護',
    in_transit_qty_kg: '3 階 MRP 第 3 階原料淨缺口扣抵、資料表維護',
    eta_date: '生管採購工作台（船期到廠倒數）、訂單缺料分析（在途 PO ETA 瓶頸診斷）、資料表維護',
    actual_arrival_date: '資料表維護（到廠驗收核銷與準時率統計）',
    eta_variance_days: '生管採購工作台（ETA 偏差天數示警）、資料表維護',
    supplier_name: '生管採購工作台、資料表維護',
    status: '訂單缺料分析（在途物流狀態）、生管採購工作台、資料表維護'
  },
  demand_forecast_log: {
    demand_id: '預估需求流水追蹤、資料表維護',
    version_no: '業務工作台（預估版本波動追單）、總覽儀表板（預測版本篩選）、資料表維護',
    customer_id: '業務工作台（客戶維度查詢）、總覽儀表板（客戶預測偏差分析）、資料表維護',
    sku: '業務工作台、總覽儀表板、3 階 MRP 成品總需求來源、資料表維護',
    target_date: '業務工作台（交期確認）、生管採購工作台（最晚下單日倒推起點）、總覽儀表板、資料表維護',
    demand_qty: '業務工作台（預測量）、總覽儀表板（三向交叉比對與 Bias% 計算）、3 階 MRP 總需求、資料表維護',
    created_by_id: '資料表維護（審計日誌追蹤）',
    created_by_name: '業務工作台、資料表維護',
    notes: '業務工作台（商務情報備註）、資料表維護'
  },
  actual_order: {
    order_id: '業務工作台（PO 查詢）、訂單缺料分析（逐筆訂單診斷）、出貨排程審查看板（訂單放行）、資料表維護',
    customer_id: '業務工作台、訂單缺料分析、總覽儀表板、資料表維護',
    sku: '業務工作台、訂單缺料分析、出貨排程審查看板、3 階 MRP 總需求來源、資料表維護',
    order_date: '業務工作台、訂單缺料分析（急單識別與前置時間判定）、資料表維護',
    target_date: '業務工作台（約定交期）、出貨排程審查看板（雙週放行目標日）、訂單缺料分析、資料表維護',
    order_qty: '業務工作台、出貨排程審查看板（雙週待交數量）、總覽儀表板（實單比對）、訂單缺料分析、資料表維護',
    status: '業務工作台、訂單缺料分析（過濾未結案訂單）、出貨排程審查看板、資料表維護'
  },
  sorting_actual_yield_log: {
    log_id: '品檢日報記錄主鍵、資料表維護',
    sku: '品檢良率統計、資料表維護',
    batch_no: '製程批號追溯、資料表維護',
    sorting_date: '品檢全檢日報日期、歷史良率趨勢統計、資料表維護',
    qty_sorted: '全檢數量分母、資料表維護',
    qty_passed: '合格良品數量分子、資料表維護',
    actual_yield_rate: '品管動態反饋閉環（比對標準良率與動態調整）、資料表維護',
    operator_id: '資料表維護（品管責任簽核）',
    notes: '資料表維護（不良疵點原因記錄）'
  }
};

// Update MASTER_TABLE_SCHEMAS in memory with uiLocation
MASTER_TABLE_SCHEMAS.forEach(table => {
  const tableKey = table.tableKey;
  const mapping = FIELD_LOCATIONS[tableKey] || {};
  table.fields.forEach(f => {
    if (mapping[f.fieldKey]) {
      f.uiLocation = mapping[f.fieldKey];
    } else {
      f.uiLocation = '資料表維護 (DataTablesView)';
    }
  });
});

console.log('Generating docs/PMS_Master_Field_Data_Dictionary.html...');

const htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>料事如神系統 (PMS) — 主檔案欄位名稱定義與數據鏈位置權威手冊</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Noto+Sans+TC:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #F8FAFC;
      --bg-surface: #FFFFFF;
      --bg-card-header: #F1F5F9;
      --text-primary: #0F172A;
      --text-secondary: #475569;
      --text-muted: #64748B;
      --border-subtle: #E2E8F0;
      --border-card: #CBD5E1;
      
      --brand-primary: #0284C7;
      --brand-bg: #E0F2FE;
      --brand-text: #0369A1;

      --accent-purple: #7C3AED;
      --accent-purple-bg: #F3E8FF;
      --accent-purple-text: #6D28D9;

      --accent-emerald: #059669;
      --accent-emerald-bg: #D1FAE5;
      --accent-emerald-text: #047857;

      --accent-amber: #D97706;
      --accent-amber-bg: #FEF3C7;
      --accent-amber-text: #B45309;

      --tag-pk: #DC2626;
      --tag-fk: #2563EB;
      --tag-req: #059669;
      --tag-opt: #64748B;
      --tag-comp: #7C3AED;

      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-base: #0B1120;
        --bg-surface: #1E293B;
        --bg-card-header: #0F172A;
        --text-primary: #F8FAFC;
        --text-secondary: #CBD5E1;
        --text-muted: #94A3B8;
        --border-subtle: #334155;
        --border-card: #475569;

        --brand-primary: #38BDF8;
        --brand-bg: #0C4A6E;
        --brand-text: #BAE6FD;

        --accent-purple: #C084FC;
        --accent-purple-bg: #4C1D95;
        --accent-purple-text: #E9D5FF;

        --accent-emerald: #34D399;
        --accent-emerald-bg: #064E3B;
        --accent-emerald-text: #A7F3D0;

        --accent-amber: #FBBF24;
        --accent-amber-bg: #78350F;
        --accent-amber-text: #FDE68A;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans TC', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-primary);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Sticky Header */
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-sm);
      padding: 16px 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title h1 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .header-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      background: var(--brand-bg);
      color: var(--brand-text);
      border: 1px solid var(--brand-primary);
    }

    /* Search and Quick Filters */
    .search-box {
      position: relative;
      width: 100%;
      max-width: 360px;
    }
    .search-box input {
      width: 100%;
      padding: 8px 14px 8px 36px;
      font-size: 0.875rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-card);
      background: var(--bg-base);
      color: var(--text-primary);
      outline: none;
      transition: all 0.2s;
    }
    .search-box input:focus {
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* Layout: Sidebar + Main Content */
    .container {
      display: flex;
      max-width: 1600px;
      margin: 0 auto;
      min-height: calc(100vh - 72px);
    }

    /* Sidebar Navigation */
    aside {
      width: 280px;
      flex-shrink: 0;
      position: sticky;
      top: 72px;
      height: calc(100vh - 72px);
      overflow-y: auto;
      padding: 24px 16px;
      border-right: 1px solid var(--border-subtle);
      background: var(--bg-surface);
    }
    .nav-group-title {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 12px;
      padding-left: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 4px;
      transition: all 0.15s;
    }
    .nav-item:hover, .nav-item.active {
      background: var(--brand-bg);
      color: var(--brand-text);
    }
    .nav-item-count {
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--bg-base);
    }

    /* Main Area */
    main {
      flex: 1;
      padding: 32px 40px;
      overflow-y: auto;
    }

    /* Table Section */
    .table-section {
      margin-bottom: 48px;
      scroll-margin-top: 90px;
    }
    .table-header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }
    .table-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .table-title {
      font-size: 1.35rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .table-desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    .table-meta-tag {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-card-header);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    /* Field Card */
    .field-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-card:hover {
      border-color: var(--border-card);
      box-shadow: var(--shadow-md);
    }

    .field-card-header {
      background: var(--bg-card-header);
      padding: 14px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .field-key-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .field-key {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      font-weight: 700;
      color: var(--brand-primary);
    }
    .field-label {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .field-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-pk { background: #FEE2E2; color: #991B1B; border: 1px solid #F87171; }
    .badge-fk { background: #DBEAFE; color: #1E40AF; border: 1px solid #60A5FA; }
    .badge-pkfk { background: #EDE9FE; color: #5B21B6; border: 1px solid #A78BFA; }
    .badge-req { background: #D1FAE5; color: #065F46; border: 1px solid #34D399; }
    .badge-opt { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }
    .badge-comp { background: #FCE7F3; color: #9D174D; border: 1px solid #F472B6; }
    .badge-type { background: var(--bg-base); color: var(--text-secondary); border: 1px solid var(--border-card); }

    .field-card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Location Box */
    .location-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: var(--brand-bg);
      border: 1px solid var(--brand-primary);
      color: var(--brand-text);
      font-size: 0.875rem;
      font-weight: 600;
    }
    .location-icon { font-size: 1.1rem; }

    /* Plain Definition Box */
    .plain-box {
      background: var(--accent-amber-bg);
      border: 1px solid var(--accent-amber);
      color: var(--accent-amber-text);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      font-size: 0.925rem;
      line-height: 1.6;
    }
    .plain-box-title {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* 2-Column Grid Details */
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
    }
    .info-card {
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: 0.85rem;
    }
    .info-card-title {
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-card-content {
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Example Box */
    .example-box {
      background: var(--bg-card-header);
      border: 1px dashed var(--border-card);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      font-size: 0.85rem;
    }
    .example-code {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: var(--brand-primary);
      padding: 2px 6px;
      background: var(--bg-surface);
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
    }

    @media (max-width: 1024px) {
      aside { display: none; }
      main { padding: 20px; }
    }
  </style>
</head>
<body>

  <header>
    <div class="header-title">
      <span style="font-size: 1.5rem;">📊</span>
      <div>
        <h1>料事如神系統 (PMS) — 主檔案欄位名稱定義與數據鏈位置權威手冊</h1>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          Master Table Field Dictionary & Data Pipeline Location Guide · V2.0 3NF Standard
        </p>
      </div>
      <span class="header-badge">${MASTER_TABLE_SCHEMAS.length} 大核心主表 · ${MASTER_TABLE_SCHEMAS.reduce((s, t) => s + t.fields.length, 0)} 運算欄位</span>
    </div>
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="searchInput" placeholder="快速搜尋欄位代碼、中文名稱、位置或定義..." onkeyup="filterFields()">
    </div>
  </header>

  <div class="container">
    <aside>
      <div class="nav-group-title">主檔案清單 (Master Tables)</div>
      <nav id="sidebarNav">
        ${MASTER_TABLE_SCHEMAS.map(t => `
          <a href="#table-${t.tableKey}" class="nav-item">
            <span>${t.categoryIcon} ${t.tableLabel.split('(')[0].trim()}</span>
            <span class="nav-item-count">${t.fields.length}</span>
          </a>
        `).join('')}
      </nav>
    </aside>

    <main>
      ${MASTER_TABLE_SCHEMAS.map(table => `
        <section id="table-${table.tableKey}" class="table-section">
          <div class="table-header">
            <div class="table-header-top">
              <div class="table-title">
                <span>${table.categoryIcon}</span>
                <span>${table.tableLabel}</span>
                <code style="font-size: 0.9rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">[${table.tableKey}]</code>
              </div>
              <span class="table-meta-tag">權責單位：${table.ownerDepartment || '生管部 / 採購部 / 業務部'}</span>
            </div>
            <div class="table-desc">${table.description}</div>
          </div>

          <div class="field-list">
            ${table.fields.map(field => {
              const constraintBadge = field.constraint === 'PK' ? '<span class="badge badge-pk">PK 主鍵</span>' :
                                      field.constraint === 'FK' ? '<span class="badge badge-fk">FK 外鍵</span>' :
                                      field.constraint === 'PK/FK' ? '<span class="badge badge-pkfk">PK/FK 複合主外鍵</span>' :
                                      field.constraint === 'Required' ? '<span class="badge badge-req">必填 (Required)</span>' :
                                      field.constraint === 'Computed' ? '<span class="badge badge-comp">計算值 (Computed)</span>' :
                                      '<span class="badge badge-opt">選填 (Optional)</span>';

              const loc = field.uiLocation || '資料表維護 (DataTablesView)';

              return `
                <div class="field-card" data-key="${field.fieldKey.toLowerCase()}" data-label="${field.fieldLabel.toLowerCase()}" data-loc="${loc.toLowerCase()}" data-def="${field.definition.toLowerCase()} ${field.plainDefinition.toLowerCase()}">
                  <div class="field-card-header">
                    <div class="field-key-title">
                      <span class="field-key">${field.fieldKey}</span>
                      <span class="field-label">${field.fieldLabel}</span>
                    </div>
                    <div class="field-badges">
                      ${constraintBadge}
                      <span class="badge badge-type">${field.dataType}</span>
                    </div>
                  </div>

                  <div class="field-card-body">
                    <!-- 📍 位置 -->
                    <div class="location-box">
                      <span class="location-icon">📍</span>
                      <div>
                        <strong>在數據鏈與介面中的位置：</strong>
                        <span>${loc}</span>
                      </div>
                    </div>

                    <!-- 💡 大白話 -->
                    <div class="plain-box">
                      <div class="plain-box-title">
                        <span>💡 大白話解說 (這是什麼？)</span>
                      </div>
                      <p>${field.plainDefinition}</p>
                    </div>

                    <!-- 2-Column Grid -->
                    <div class="field-grid">
                      <div class="info-card">
                        <div class="info-card-title">🎯 業務價值與用途 (Why it matters)</div>
                        <div class="info-card-content">${field.businessPurpose}</div>
                      </div>

                      <div class="info-card">
                        <div class="info-card-title">⚙️ 系統推導與運算連動 (MRP Impact)</div>
                        <div class="info-card-content">${field.mrpImpact || '無直接連動，作為標籤或審計紀錄。'}</div>
                      </div>
                    </div>

                    <!-- 填寫規範與範例 -->
                    <div class="field-grid">
                      <div class="info-card" style="background: var(--bg-surface);">
                        <div class="info-card-title">📝 填寫規範與防呆要點 (Fill Guide)</div>
                        <div class="info-card-content">${field.fillGuide}</div>
                      </div>

                      <div class="example-box">
                        <div style="font-weight: 700; margin-bottom: 4px;">🔍 實務示範：<span class="example-code">${field.example}</span></div>
                        <div style="color: var(--text-secondary); font-size: 0.825rem;">${field.exampleExplanation}</div>
                      </div>
                    </div>

                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `).join('')}
    </main>
  </div>

  <script>
    function filterFields() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const cards = document.querySelectorAll('.field-card');
      cards.forEach(card => {
        const key = card.getAttribute('data-key') || '';
        const label = card.getAttribute('data-label') || '';
        const loc = card.getAttribute('data-loc') || '';
        const def = card.getAttribute('data-def') || '';
        if (!q || key.includes(q) || label.includes(q) || loc.includes(q) || def.includes(q)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      // Hide section if no visible cards
      document.querySelectorAll('.table-section').forEach(sec => {
        const visibleCards = sec.querySelectorAll('.field-card[style="display: block;"], .field-card:not([style*="display: none"])');
        if (q && visibleCards.length === 0) {
          sec.style.display = 'none';
        } else {
          sec.style.display = 'block';
        }
      });
    }
  </script>
</body>
</html>
`;

fs.writeFileSync('docs/PMS_Master_Field_Data_Dictionary.html', htmlContent, 'utf8');
console.log('Successfully written docs/PMS_Master_Field_Data_Dictionary.html');
