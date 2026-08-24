/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 料事如神系統（PMS）專業術語辭典
 *
 * 使用方式：
 *  - GlossaryView.tsx 獨立專頁提供搜尋與分類瀏覽
 *  - 新增術語時直接在本檔案追加 entries 陣列項目即可
 *  - category 支援：'fk_sku' | 'mrp' | 'molding' | 'system' | 'process' | 'alert' | 'doc'
 */

export type GlossaryCategory =
  | 'fk_sku'       // FK / SKU 基礎概念
  | 'mrp'          // MRP 運算核心術語
  | 'molding'      // 射出成型製程術語
  | 'system'       // 系統功能與技術術語
  | 'process'      // 業務流程與角色術語
  | 'alert'        // 警報類型說明
  | 'doc'          // 文件與管理術語
  | 'fields'       // 主檔案欄位名稱定義表 (Master Table Field Dictionary)

export interface GlossaryEntry {
  id: string
  term: string         // 中文主名詞
  en?: string          // 英文對照（選填）
  category: GlossaryCategory
  definition: string   // 通俗解釋
  example?: string     // 實際範例（選填）
  related?: string[]   // 關聯術語 ID（選填）
  tableName?: string   // 所屬資料表（針對 fields 分類）
  tableLabel?: string  // 資料表中文字（針對 fields 分類）
  dataType?: string    // 欄位型別與約束（針對 fields 分表）
  uiLocation?: string  // 📍 在數據鏈或介面中的位置
  plainDefinition?: string    // 💡 白話大白話解說
  businessPurpose?: string    // 🎯 業務價值與用途
  mrpImpact?: string          // ⚙️ 系統推導與運算連動
  fillGuide?: string          // 📝 填寫規範與防呆要點
  exampleExplanation?: string // 🔍 示範數值詳細說明
}

export interface MasterFieldDefinition {
  fieldKey: string
  fieldLabel: string
  tableName: string
  tableLabel: string
  dataType: string
  constraint: 'PK' | 'FK' | 'PK/FK' | 'Required' | 'Optional' | 'Computed'
  uiLocation?: string            // 📍 在數據鏈或介面中的位置
  plainDefinition: string        // 💡 白話通俗定義（用工廠日常口語講清楚）
  definition: string             // 權威業務定義
  businessPurpose: string        // 🎯 業務價值與用途（為什麼需要它）
  fillGuide: string              // 📝 填寫規範與防呆要點（該怎麼填、注意事項）
  example: string                // 實務示範數值
  exampleExplanation: string     // 🔍 示範詳細解說（為什麼這樣填、情境背景）
  mrpImpact: string              // ⚙️ 系統推導與 MRP 連動衝擊
}

export const GLOSSARY_CATEGORIES: { id: GlossaryCategory; label: string; icon: string }[] = [
  { id: 'fields',    label: '主檔案欄位名稱定義表', icon: '📊' },
  { id: 'fk_sku',    label: 'FK / SKU 基礎',   icon: '🔗' },
  { id: 'mrp',       label: 'MRP 運算術語',    icon: '📐' },
  { id: 'molding',   label: '射出成型術語',    icon: '🏭' },
  { id: 'system',    label: '系統功能術語',    icon: '⚙️' },
  { id: 'process',   label: '業務流程術語',    icon: '📋' },
  { id: 'alert',     label: '警報類型說明',    icon: '🔔' },
  { id: 'doc',       label: '文件管理術語',    icon: '📄' },
]

const BASE_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ── FK / SKU 基礎 ──────────────────────────────────────────────────────────
  {
    id: 'sku',
    term: 'SKU',
    en: 'Stock Keeping Unit',
    category: 'fk_sku',
    definition: '品號，是系统中每一笔物料或成品的唯一识别码。可以想像成每個商品的「身分證字號」，全系統不可重複。',
    example: 'A01-200-131（成品）、TERLUX 2802（原料）、CB-BLACK-01（黑色色母）',
    related: ['rm_sku', 'material_class'],
  },
  {
    id: 'fk',
    term: 'FK',
    en: 'Foreign Key（外鍵）',
    category: 'fk_sku',
    definition: '關連到其他資料表主鍵的欄位。當你在 A 表的某個欄位填入了 B 表的品號，這個欄位就是 FK。它用來建立跨表的關聯，讓系統知道這筆資料與哪一筆資料相關。',
    example: 'product_mold_bom 表的 rm_sku 欄位，指向 item_master 表的 sku',
    related: ['sku', 'fk_select'],
  },
  {
    id: 'rm_sku',
    term: 'RM SKU',
    en: 'Raw Material SKU（原料品號）',
    category: 'fk_sku',
    definition: '專指原料層的 SKU，其值必須存在於 item_master 表且 material_class 為 RAW。它是 BOM、供應商規則、在途採購三張表的共同 FK 欄位。',
    example: 'TERLUX 2802（ABS 原料）、PP-5011（PP 原料）、CB-BLACK-01（色母）',
    related: ['sku', 'material_class'],
  },
  {
    id: 'material_class',
    term: 'material_class（物料分類）',
    en: 'Material Class',
    category: 'fk_sku',
    definition: '將所有品號分為五層級：RAW（原料）、MAT（包材/材料）、PART（零件）、COMP（組件）、SET（成品）。這個分類決定該品號能出現在哪些表的 FK 欄位中，以及 MRP 是否展開計算。',
    example: 'RAW 類→可當 rm_sku；SET 類→可當 forecast/order 的 sku；PART/COMP/SET→可當 yield_master 的 sku',
    related: ['sku', 'rm_sku', 'fk'],
  },
  {
    id: 'fk_select',
    term: 'FK Select',
    en: 'Foreign Key Select（外鍵下拉選單）',
    category: 'fk_sku',
    definition: '表單中的一種輸入元件，會自動讀取參考表的資料產生下拉選單，讓使用者從現有的品號中選擇，避免手動輸入錯誤的 SKU。',
    example: '新增 BOM 時，「使用原料品號」欄位會顯示所有 RAW 類品號供選擇',
    related: ['fk', 'sku'],
  },
  {
    id: 'composite_key',
    term: '複合主鍵',
    en: 'Composite Key',
    category: 'fk_sku',
    definition: '由兩個或以上欄位組合起來擔任唯一識別的主鍵。例如庫存快照檔同時用「日期 + 品號」才能唯一定位一筆記錄。',
    example: 'inventory_wip_snapshot 的主鍵 = snapshot_date + sku；product_mold_bom 的主鍵 = sku + mold_id',
  },

  // ── MRP 運算術語 ───────────────────────────────────────────────────────────
  {
    id: 'mrp',
    term: 'MRP',
    en: 'Material Requirements Planning（物料需求計畫）',
    category: 'mrp',
    definition: '系統的核心引擎，將客戶需求一併考量後，反推需要採購多少原料、何時下單。計算分為三階：① 成品淨需求 → ② 原料毛需求（BOM 爆炸）→ ③ 原料淨需求與採購決策。',
    example: '輸入：某成品需要 10,000 PCS、交期 11/30；輸出：需採購 TERLUX 2802 約 52.5 KG，最晚 9/1 前發單',
    related: ['gross_requirement', 'net_requirement', 'bom_explosion'],
  },
  {
    id: 'gross_requirement',
    term: '毛需求',
    en: 'Gross Requirement',
    category: 'mrp',
    definition: '未扣除任何庫存與在途量之前，根據 BOM 展開計算出的「理論總需求量」。可以理解為「完全不考慮已有庫存，我們需要多少原料」。',
    example: '某產品需 10,000 PCS，單穴克重 8.5g，模具 16 穴 → 毛需求 = 10000 × 8.5 × 16 / (1-0.03) / 1000 ≈ 1,412 KG',
    related: ['mrp', 'net_requirement'],
  },
  {
    id: 'net_requirement',
    term: '淨需求',
    en: 'Net Requirement',
    category: 'mrp',
    definition: '扣減掉現有在庫與已訂購在途的量之後，真正需要採購的數量。公式：淨需求 = 毛需求 − 在庫 − 在途 + 安全庫存。若結果 ≤ 0 則不需採購。',
    example: '毛需求 1,412 KG，現存 200 KG，在途 300 KG，安全庫存 100 KG → 淨需求 = 1,412 − 200 − 300 + 100 = 1,012 KG',
    related: ['mrp', 'gross_requirement', 'safety_stock'],
  },
  {
    id: 'bom_explosion',
    term: 'BOM 爆炸',
    en: 'BOM Explosion（Bill of Materials Explosion）',
    category: 'mrp',
    definition: '從成品的需求量出發，依據 BOM（產品模具成型關聯檔）中的用料比例，逆向拆解计算出各層原料的需求量。想像把一個組裝好的產品拆開來看每一份零件用量。',
    example: 'SET 成品 A01-200-131 需要 10,000 PCS → 展開至原料 TERLUX 2802 需 50 KG + 色母 CB-BLACK-01 需 1 KG',
    related: ['mrp', 'gross_requirement', 'product_mold_bom'],
  },
  {
    id: 'safety_stock',
    term: '安全庫存',
    en: 'Safety Stock',
    category: 'mrp',
    definition: '為了防堵供料中斷風險而預留的最低保險庫存量。即使未來幾天沒有到貨，仍有存量可供生產。每個原料的的安全庫存可在供應商規則檔中設定。',
    example: 'TERLUX 2802 的安全庫存設為 500 KG，表示系統會確保至少保留 500 KG 才視為正常',
    related: ['mrp', 'net_requirement', 'moq'],
  },
  {
    id: 'moq',
    term: 'MOQ',
    en: 'Minimum Order Quantity（最小起訂量）',
    category: 'mrp',
    definition: '供應商要求的最小採購門檻。系統計算出的建議採購量會向上取整至 MOQ 的倍數。例如 MOQ=1000 KG，淨需求 1012 KG → 建議採購 2000 KG。',
    example: '某色母 MOQ=50 KG，淨需求 12 KG → 建議採購 50 KG（1 倍 MOQ）',
    related: ['mrp', 'safety_stock', 'lead_time'],
  },
  {
    id: 'lead_time',
    term: 'Lead Time（採購交期）',
    en: 'Lead Time',
    category: 'mrp',
    definition: '從下單到原料到廠所需的時間（天數）。國外海運通常 90~150 天，廠內调配可僅需 1 天。系統用它來倒推「最晚下單日」。',
    example: '交期 90 天，需求交期 11/30 → 建議最晚下單日 = 11/30 − 90 天 = 9/1',
    related: ['mrp', 'moq', 'suggested_order_date'],
  },
  {
    id: 'suggested_order_date',
    term: '建議最晚下單日',
    en: 'Suggested Order Date',
    category: 'mrp',
    definition: '系統根據需求交期與採購交期，倒推出的「必須下單的最後期限」。超過這個日期下單，原料可能無法在需求交期前到廠。',
    example: '需求交期 2026-11-30，交期 90 天 → 建議最晚下單日 = 2026-09-01',
    related: ['mrp', 'lead_time'],
  },
  {
    id: 'demand_consumption_mode',
    term: '需求彙總模式',
    en: 'Demand Consumption Mode',
    category: 'mrp',
    definition: '決定如何計算總需求量的策略：疊加模式（預估 + 訂單全算）、PO 沖銷模式（訂單抵減预估）、僅訂單模式、僅预估模式。不同模式適合不同業務情境。',
    example: 'additive（預設）：預估 8,000 + 訂單 2,000 = 總需求 10,000 PCS',
    related: ['mrp', 'multi_mold_strategy'],
  },
  {
    id: 'multi_mold_strategy',
    term: '多模備料策略',
    en: 'Multi-Mold Strategy',
    category: 'mrp',
    definition: '當同一品號有多副模具時，選擇哪一副的數據來計算備料。有三種：最保守重量（選克重最高者，最穩）、僅主模（只算主要模具）、精實最輕（選克重最低者，最省料）。',
    example: '保守原則：A 模 8.5g/穴，B 模 7.2g/穴 → 以 8.5g 計算備料，確保不短缺',
    related: ['mrp', 'demand_consumption_mode'],
  },
  {
    id: 'color_mixing_ratio',
    term: '色母/色粉配比',
    en: 'Color Mixing Ratio',
    category: 'mrp',
    definition: '在 BOM 層級設定的色母或色粉添加百分比。當配比 > 0 時，MRP 會自動將原料總需求拆分為「基礎樹脂需求」與「色母/色粉需求」兩筆獨立採購建議。',
    example: '配比 2.0%：總需求 102 KG → 基礎樹脂 100 KG + 色母 2 KG',
    related: ['mrp', 'base_resin', 'colorant'],
  },
  {
    id: 'colorant_detail',
    term: '色母/色粉需求分析',
    en: 'Colorant Detail',
    category: 'mrp',
    definition: 'MRP 計算結果中的子物件，當產品有配色時自動產生。包含色母的毛需求、現存庫存、在途量、淨需求、建議採購量（含 MOQ 取整）及交期。',
    example: 'CB-BLACK-01：毛需求 1.0 KG，現存 0.3 KG，在途 0 KG，淨需求 0.7 KG，建議採購 50 KG（MOQ 取整）',
    related: ['color_mixing_ratio', 'mrp'],
  },

  // ── 射出成型術語 ───────────────────────────────────────────────────────────
  {
    id: 'design_cavities',
    term: '設計穴數',
    en: 'Design Cavities',
    category: 'molding',
    definition: '模具出廠時原裝設計的總穴數，代表該模具的物理最高潛在產能。例如一副模具設計有 16 穴，表示理論上每次開模可同時射出 16 個產品。',
    example: 'MI17193 模具設計穴數 = 16 穴',
    related: ['active_cavities', 'cavity_degradation'],
  },
  {
    id: 'active_cavities',
    term: '妥善穴數',
    en: 'Active Cavities',
    category: 'molding',
    definition: '產線上實際可用且正常注膠出模的穴數。當模具部分穴數因磨損或堵塞無法使用時，此數值會小於設計穴數。是計算日產能與單穴克重的實際依據。',
    example: '設計 16 穴中 2 穴塞住 → 妥善穴數 = 14 穴',
    related: ['design_cavities', 'cavity_degradation'],
  },
  {
    id: 'cavity_degradation',
    term: '塞穴',
    en: 'Cavity Degradation',
    category: 'molding',
    definition: '模具穴數因磨損、堵塞或損壞導致有效穴數下降的現象。系統會在妥善穴數 < 設計穴數時發出黃色警示，提醒安排模具保養。',
    example: '16 穴模具仅剩 14 穴正常運作 → 塞穴警示，建議排入保養',
    related: ['active_cavities', 'design_cavities'],
  },
  {
    id: 'cycle_time',
    term: '成型週期',
    en: 'Cycle Time',
    category: 'molding',
    definition: '射出成型從一次注膠到下一次注膠所需的標準秒數。包含注膠、冷卻、開模、取件等全部步驟的時間。週期越短，產能越高。',
    example: '某模具成型週期 = 25 秒/模',
    related: ['daily_capacity'],
  },
  {
    id: 'daily_capacity',
    term: '日產能',
    en: 'Daily Capacity',
    category: 'molding',
    definition: '一副模具在一天（24 小時）內理論上可生產的最大成品數量。計算公式：(86,400 ÷ 成型週期秒數) × 妥善穴數。',
    example: '成型週期 25 秒、妥善穴數 14 → 日產能 = (86400/25) × 14 = 48,384 PCS/日',
    related: ['cycle_time', 'active_cavities'],
  },
  {
    id: 'unit_weight',
    term: '單穴克重',
    en: 'Unit Weight',
    category: 'molding',
    definition: '每生產 1 個成品所分攤的注膠總克重。計算公式：(整模淨重 + 流道重量) ÷ 妥善穴數。是 MRP 計算原料需求的關鍵參數。',
    example: '整模 9.63g + 流道 8.32g ÷ 16 穴 = 1.128 g/穴',
    related: ['net_mold_weight', 'runner_weight'],
  },
  {
    id: 'net_mold_weight',
    term: '整模重量',
    en: 'Net Mold Weight',
    category: 'molding',
    definition: '一模所有產品淨重總和（不含流道）。是一模之中所有穴的產品重量相加。',
    example: '一模 16 穴，每穴 9.63g → 整模重量 = 16 × 9.63 = 154.08g',
    related: ['runner_weight', 'unit_weight'],
  },
  {
    id: 'runner_weight',
    term: '流道重量',
    en: 'Runner Weight',
    category: 'molding',
    definition: '冷流道或副流道的重量。熔膠在注入模具前會先經過流道系統，這部分的塑膠在脫模後成為廢料（料頭），屬於正常損耗。',
    example: '冷流道系統重量約 8.32g/模',
    related: ['net_mold_weight', 'scrap_rate'],
  },
  {
    id: 'scrap_rate',
    term: '生產損耗率',
    en: 'Manufacturing Scrap Rate',
    category: 'molding',
    definition: '射出成型過程中正常的調機、啟動與料頭損耗比例，預設 3%。MRP 計算時會在毛需求上加成此比例，確保原料足夠。',
    example: '毛需求 1,000 KG，損耗率 3% → 實際需投料 1,000 / (1-0.03) ≈ 1,031 KG',
    related: ['unit_weight', 'gross_requirement'],
  },
  {
    id: 'primary_mold',
    term: '主模標記',
    en: 'Primary Mold Flag',
    category: 'molding',
    definition: '當一個成品有多副模具時，標記其中一副為「主模」。MRP 的「主模優先」策略會只使用主模數據來計算備料，其他模具作為備援。',
    example: 'A01-200-131 有 MI17193（主模）與 MI17194（備用模）兩副模具',
    related: ['multi_mold_strategy'],
  },
  {
    id: 'bom_validity',
    term: 'BOM 有效期',
    en: 'BOM Validity Period',
    category: 'molding',
    definition: 'BOM 記錄的生效起始日與失效日。模具更換或材料變更時，舊 BOM 設失效日，新 BOM 設生效日，避免過時數據影響 MRP 計算。',
    example: '舊 BOM valid_to = 2025-05-31，新 BOM valid_from = 2025-06-01',
    related: ['product_mold_bom', 'change_audit'],
  },

  // ── 系統功能術語 ───────────────────────────────────────────────────────────
  {
    id: 'audit_log',
    term: '變更稽核日誌',
    en: 'Audit Log',
    category: 'system',
    definition: '系統自動記錄所有 Level 2 與 Level 3 欄位變更的 append-only 日誌表。每筆記錄包含：變更時間、資料表、主鍵值、欄位名稱、舊值→新值、變更等級、變更原因。僅增不刪，確保變更軌跡永不遺失。',
    example: '2026-08-20 14:32:10 | product_mold_bom | A01-200-131+MI17193 | std_mfg_scrap_rate | 0.03 → 0.05 | L2',
    related: ['change_level', 'editability'],
  },
  {
    id: 'change_level',
    term: '變更等級（Level 1/2/3）',
    en: 'Change Level',
    category: 'system',
    definition: '欄位影響程度的三級分類：Level 1（低影響，直接儲存，無紀錄）、Level 2（中影響，彈出確認對話框，寫入稽核日誌）、Level 3（高影響工程變更，必填變更原因，完整紀錄）。',
    example: '「標準生產損耗率」為 L2 欄位，變更時需確認；「品號」為 L3 欄位，變更時需填寫原因',
    related: ['audit_log', 'editability'],
  },
  {
    id: 'editability',
    term: '編輯等級',
    en: 'Editability',
    category: 'system',
    definition: '欄位的編輯權限型別。locked（鎖定，不可編輯）、computed（計算值，系統自動產生）、1~3（對應三級變更管制）。',
    example: 'mixing_ratio_pct 是 computed 欄位，由 base_resin_kg 與 colorant_kg 自動計算；std_mfg_scrap_rate 是 Level 2 欄位',
    related: ['change_level', 'audit_log'],
  },
  {
    id: 'ssot',
    term: 'SSOT',
    en: 'Single Source of Truth（單一資料來源）',
    category: 'system',
    definition: '系統的設計原則：所有資料僅存在瀏覽器的 LocalStorage 中，沒有後端伺服器。這意味著資料的唯一真實來源就是本機，不涉及雲端同步或多人競寫。',
    example: '所有資料匯出為 JSON 檔案後，可在其他裝置匯入，資料一致性由用戶自行管理',
  },
  {
    id: 'localstorage',
    term: 'LocalStorage',
    en: 'Local Storage',
    category: 'system',
    definition: '瀏覽器內建的持久化儲存空間。系統所有資料（主檔、庫存、MRP 結果等）均存儲於此，關閉瀏覽器再開啟資料仍然存在。容量上限約 10MB。',
    example: '儲存的 key：PMS_DATABASE_STATE_V1、PMS_SYSTEM_PARAMETERS_V1、PMS_BACKUP_CONFIG_V1',
  },
  {
    id: 'deep_relational_audit',
    term: '深度關聯稽核',
    en: 'Deep Relational Audit',
    category: 'system',
    definition: '資料匯入時執行的完整性驗證流程。會掃描所有 FK 欄位，檢查是否有斷鏈（參考的品號不存在）、主模缺失、BOM 未配置等問題，並產生警告或錯誤報告。',
    example: '匯入時發現 BOM 中 mold_id = "MI99999" 但在模具主檔中不存在 → 產生錯誤："模具斷鏈"',
    related: ['fk', 'import_validation'],
  },

  // ── 業務流程術語 ───────────────────────────────────────────────────────────
  {
    id: 'demand_forecast',
    term: '業務預估需求',
    en: 'Demand Forecast',
    category: 'process',
    definition: '業務部門針對未來某一段期間的預計銷售量所做的預估。以「版本號」區分不同時間點的預測，可有多個版本並存比較。MRP 計算時會讀取最新的預估數據。',
    example: '版本 202608-W1 預估 A01-200-131 需要 8,000 PCS，交期 11/30',
    related: ['actual_order', 'version_no'],
  },
  {
    id: 'actual_order',
    term: '實際訂單',
    en: 'Actual Order',
    category: 'process',
    definition: '客戶已確認的正式訂單。與「預估需求」不同，實際訂單具有法律效力的承諾交貨量與交期。MRP 計算時會將實際訂單納入需求總量。',
    example: '訂單 ORD-20260820-001：A客戶 下單 A01-200-131，5,000 PCS，交期 11/15',
    related: ['demand_forecast', 'target_date'],
  },
  {
    id: 'version_no',
    term: '預估版本號',
    en: 'Version Number',
    category: 'process',
    definition: '業務預估需求檔的版本識別碼，格式為「年月-W 週數」，例如 202608-W1 代表 2026 年 8 月第 1 週的預估。不同版本可並存，方便比較預估變化。',
    example: '202608-W1（8 月第 1 週預估）、202608-W2（8 月第 2 週更新預估）',
    related: ['demand_forecast'],
  },
  {
    id: 'target_date',
    term: '需求交期',
    en: 'Target Date',
    category: 'process',
    definition: '客戶要求成品到貨的日期。MRP 計算時以此為基準，扣除採購交期後得出「建議最晚下單日」，確保原料能在需求交期前到位。',
    example: '訂單目標交期：2026-11-30',
    related: ['actual_order', 'demand_forecast'],
  },
  {
    id: 'po_in_transit',
    term: '在途採購',
    en: 'Purchase Order In Transit',
    category: 'process',
    definition: '已經下單但尚未到廠的原料採購量。MRP 計算淨需求時會扣除在途量，避免重複採購。到廠後需更新為實際庫存。',
    example: 'PO-20260801-001：已訂購 TERLUX 2802 共 500 KG，預計 2026-09-15 到廠',
    related: ['eta_date', 'rm_sku'],
  },
  {
    id: 'eta_date',
    term: 'ETA（預計到廠日）',
    en: 'Estimated Time of Arrival',
    category: 'process',
    definition: '採購訂單預計到廠的日期。系統會與實際到廠日比對，計算偏差天數（eta_variance_days），幫助評估供應商準時率。',
    example: 'ETA：2026-09-15，實際到廠：2026-09-17 → 偏差 +2 天',
    related: ['po_in_transit', 'actual_arrival_date'],
  },
  {
    id: 'sorting_yield',
    term: 'Sorting 全檢良率',
    en: 'Sorting Yield Rate',
    category: 'process',
    definition: '成型品經過全數檢驗（Sorting）後，合格品所佔的比例。MRP 計算 WIP 有效待驗品時，會用此良率折減待驗量。預設 98%。',
    example: 'Sorting 待驗品 1,000 PCS，良率 98% → WIP 有效待驗品 = 980 PCS',
    related: ['wip_pending_qty', 'fg_ready_qty'],
  },
  {
    id: 'wip',
    term: 'WIP（在製品／待驗品）',
    en: 'Work In Progress',
    category: 'process',
    definition: '已經完成射出成型但尚未通過全數檢驗（Sorting）的準成品。系統以「Sorting 待驗品」數量記錄，並乘以良率後折算為「WIP 有效待驗品」參與 MRP 淨需求計算。',
    example: 'Sorting 待驗品 2,000 PCS × 良率 98% = 1,960 PCS WIP 有效待驗品',
    related: ['sorting_yield', 'fg_ready_qty'],
  },
  {
    id: 'fg_ready_qty',
    term: '成品在庫良品',
    en: 'FG Ready Quantity',
    category: 'process',
    definition: '已通過全檢、存放於成品庫房可供出貨的良品數量。MRP 計算成品淨需求時會優先扣除此數量，避免重複生產。',
    example: '庫房現有 A01-200-131 良品 500 PCS → MRP 會從總需求中扣除這 500 PCS',
    related: ['wip', 'sorting_yield'],
  },
  {
    id: 'color_mixing_process',
    term: '色母/色粉混合製程',
    en: 'Color Mixing Process',
    category: 'process',
    definition: '將色母（CB-）或色粉（CP-）與基礎樹脂按指定配比預先混合的製程。混合後才投入射出成型機。系統透過「色母/色粉混合製程紀錄檔」追蹤每批混合作業的詳細數據。',
    example: 'MIX-20260820-001：取 TERLUX 2802 49.0 KG + CB-BLACK-01 1.0 KG，配比 2.04%，製程標籤 mixed',
    related: ['color_mixing_ratio', 'process_tag', 'color_mixing_log'],
  },
  {
    id: 'process_tag',
    term: '製程標籤',
    en: 'Process Tag',
    category: 'process',
    definition: '標記混合製程方式的三種選項：mixed（預先混合，色母先與樹脂攪拌後再射出）、pre_mix（預混樣品，試模或小批量用）、direct（直接成型，色母滴注或色粉噴灑於料筒，非預混）。',
    example: '一般量產用 mixed；試模用 pre_mix；某些色母可直接滴注用 direct',
    related: ['color_mixing_process'],
  },

  // ── 警報類型說明 ───────────────────────────────────────────────────────────
  {
    id: 'shortage_alert',
    term: '缺料警戒',
    en: 'Shortage Alert（紅色）',
    category: 'alert',
    definition: '當距離「建議最晚下單日」只剩 15 天以內（或已逾期）時觸發。代表如果不立刻發單，原料將無法在需求交期前到廠。需立即開立採購單或改採空運。',
    example: '距最晚下單日僅剩 3 天 → 🔴 缺料警戒',
    related: ['mrp', 'suggested_order_date'],
  },
  {
    id: 'overstock_alert',
    term: '超備呆滯預警',
    en: 'Overstock Alert（黃色）',
    category: 'alert',
    definition: '當「現有庫存 + 在途量」超過「需求量 × 1.6 倍」時觸發。代表原料可能備太多，占用資金與倉儲空間。建議暫停後續採購。',
    example: '需求量 1,000 KG，但在庫 + 在途 = 1,800 KG（1.8x） → 🟡 超備預警',
  },
  {
    id: 'warehouse_overcapacity',
    term: '爆倉預警',
    en: 'Warehouse Overcapacity Alert（橘色）',
    category: 'alert',
    definition: '當「現有庫存 + 在途量」超過該原料的實體倉容上限時觸發。代表倉庫可能放不下，需協調分批交貨或租用外部倉庫。',
    example: 'TERLUX 2802 倉容上限 5,000 KG，在庫 + 在途 = 5,500 KG → 🟠 爆倉預警',
    related: ['max_storage_capacity_kg'],
  },
  {
    id: 'capacity_bottleneck',
    term: '產能瓶頸／塞穴警示',
    en: 'Capacity Bottleneck / Cavity Warning（紫色）',
    category: 'alert',
    definition: '兩種情境均觸發：① 生產所需天數超過可用交期天數（產能不足）；② 妥善穴數 < 設計穴數（塞穴）。前者需提早投線或啟動備用模，後者需安排模具保養。',
    example: '需 12 天生產但只剩 8 天交期 → 🟣 產能瓶頸；16 穴模具僅 14 穴正常 → 🟣 塞穴警示',
    related: ['cavity_degradation', 'daily_capacity'],
  },
  {
    id: 'normal_status',
    term: '正常狀態',
    en: 'Normal Status（綠色）',
    category: 'alert',
    definition: '所有指標均在安全範圍內，無需特殊處置。MRP 結果顯示綠燈，按標準流程正常執行即可。',
  },

  // ── 文件管理術語 ───────────────────────────────────────────────────────────
  {
    id: 'prd',
    term: 'PRD',
    en: 'Product Requirements Document（產品需求規格書）',
    category: 'doc',
    definition: '描述系統功能與設計規範的文件。本系統的 PRD 內建於 PrdDocView 中，包含 MRP 三階計算公式、變更稽核三級管制、五層物料分類體系等核心規格。可切換 Rich 排版、辭典或 Markdown 原始碼三種檢視模式。',
    example: 'PRD 第三章說明：MRP 階段一 = max(0, 需求 - 在庫 - WIP×良率)',
    related: ['development_status'],
  },
  {
    id: 'development_status',
    term: 'DevelopmentStatus',
    en: 'Development Status（開發進度追蹤）',
    category: 'doc',
    definition: '記錄系統開發進度的文檔，包含已完成功能清單、待辦事項（P0/P1/P2 優先級）、技術約束與 Commit 記錄。用於跨 session 承接開發工作。',
    example: 'T-01 H-01/H-02/H-03 校驗函式尚未接入 DataTablesView handleSave（P0 待辦）',
    related: ['prd', 'capa'],
  },
  {
    id: 'capa',
    term: 'CAPA',
    en: 'Corrective and Preventive Action（糾正與預防措施）',
    category: 'doc',
    definition: '問題追蹤機制，用於記錄發現的缺陷、根本原因分析、改善行動與關閉狀態。格式為 CAPA-NNN，目前記錄於 DEV_LOG.md 中。',
    example: 'CAPA-001：Navbar 日期硬編碼問題 → 改為 TaiwanDate 元件 → 已關閉',
    related: ['dev_log', 'field_architecture_audit'],
  },
  {
    id: 'dev_log',
    term: 'DEV_LOG',
    en: 'Development Log（開發日誌）',
    category: 'doc',
    definition: '記錄每次版本發佈的變更內容、問題修復與 CAPA 追蹤的日誌文件。格式包含版本號（V-YYYYMMDD-NN）、狀態標記（✅/⚠️/❌）與 CAPA 編號。',
    example: 'V-20260822-01 — 色母/色粉管理系統完整規劃與實作',
    related: ['capa', 'development_status'],
  },
  {
    id: 'field_architecture_audit',
    term: 'Field Architecture Audit',
    en: '欄位架構盤點報告',
    category: 'doc',
    definition: '針對系統資料模型進行全面盤點的報告，包含 HIGH（影響正確性）、MEDIUM（功能完整性）、LOW（優化建議）三級問題清單與解決方案。',
    example: 'H-01：product_mold_bom.rm_sku 應僅接受 RAW 類 — 已定義校驗函式但未接入 handleSave',
    related: ['prd', 'development_status'],
  },
  {
    id: 'mece',
    term: 'MECE 原則',
    en: 'Mutually Exclusive Collectively Exhaustive',
    category: 'doc',
    definition: '系統設計的核心原則之一：各資料類別「彼此獨立、完全窮盡」，不重不漏。例如料號分類五層互不交叉，每筆品號必屬且僅屬其中一層。',
    example: 'RAW 類與 SET 類永不相交；任何 SKU 必能被歸入 RAW/MAT/PART/COMP/SET 其中之一',
  },
]

import { ALL_MASTER_FIELD_ENTRIES, MASTER_TABLE_SCHEMAS } from './masterFieldDictionary'

export { MASTER_TABLE_SCHEMAS }

/** 全域完整術語條目（含 90+ 個主檔欄位名稱定義） */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  ...ALL_MASTER_FIELD_ENTRIES,
  ...BASE_GLOSSARY_ENTRIES,
]

/** 依分類 ID 篩選 */
export function getEntriesByCategory(category: GlossaryCategory): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter(e => e.category === category)
}

/** 全文字搜尋（搜尋 term、en、definition、example） */
export function searchGlossary(query: string): GlossaryEntry[] {
  if (!query.trim()) return GLOSSARY_ENTRIES
  const q = query.toLowerCase()
  return GLOSSARY_ENTRIES.filter(e =>
    e.term.toLowerCase().includes(q) ||
    (e.en && e.en.toLowerCase().includes(q)) ||
    e.definition.toLowerCase().includes(q) ||
    (e.example && e.example.toLowerCase().includes(q))
  )
}

/** 依 ID 取得單一條目 */
export function getEntryById(id: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES.find(e => e.id === id)
}
