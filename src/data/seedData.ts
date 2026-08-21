/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemDatabase } from '../types';
import { DEFAULT_MATERIAL_CLASSES } from '../types';

// 1. 純淨正式空資料庫 (Pure Production Empty Database)
export const EMPTY_DATABASE: SystemDatabase = {
  item_master: [],
  mold_master: [],
  product_mold_bom: [],
  yield_master: [],
  supplier_rule_master: [],
  demand_forecast_log: [],
  actual_order: [],
  inventory_wip_snapshot: [],
  po_in_transit: [],
  audit_log: [],
  material_classes: DEFAULT_MATERIAL_CLASSES,
  sorting_actual_yield_log: [], // Phase 3 初期為空，待實際全檢紀錄匯入
};

// 2. 離線示範演練數據庫 (Demo / Training Sample Database - 嚴禁與正式資料混淆)
export const DEMO_SAMPLE_DATABASE: SystemDatabase = {
  item_master: [
    {
      sku: 'A01-200-131',
      alt_sku: null,
      customer_id: 'MDX',
      material_class: 'SET',
      category: 'T接頭 (T-Connector)',
      color: '本色 (Natural)',
      unit: 'PCS',
      description: 'MDX 醫療級主力通風管 T型三向接頭'
    },
    {
      sku: 'A01-210-251',
      alt_sku: 'R1-2355',
      customer_id: 'MDX',
      material_class: 'SET',
      category: 'T接頭 (T-Connector)',
      color: '本色 (Natural)',
      unit: 'PCS',
      description: 'MDX 抽吸管 T型加壓接頭 (雙品號並存)'
    },
    {
      sku: 'C09-200-251',
      alt_sku: null,
      customer_id: 'MDX',
      material_class: 'SET',
      category: 'Y管 (Y-Connector)',
      color: '本色 (Natural)',
      unit: 'PCS',
      description: 'MDX 呼吸照護迴路分流 Y管'
    },
    {
      sku: 'B02-100-011',
      alt_sku: 'ICU-B02',
      customer_id: 'ICU',
      material_class: 'SET',
      category: '直通接頭 (Straight Adapter)',
      color: '白色 (White)',
      unit: 'PCS',
      description: 'ICU 輸液導管高密封直通對接頭'
    },
    // Raw Materials
    {
      sku: 'TERLUX 2802',
      alt_sku: null,
      customer_id: 'INEOS',
      material_class: 'RAW',
      category: 'ABS/MABS 醫療級塑膠粒子',
      color: '透明本色',
      unit: 'KG',
      description: 'INEOS Styrolution 醫療級高透明 MABS 原料'
    },
    {
      sku: 'Geon M4910',
      alt_sku: null,
      customer_id: 'Avient',
      material_class: 'RAW',
      category: 'PVC 醫療級塑膠粒子',
      color: '半透本色',
      unit: 'KG',
      description: 'Avient / PolyOne 醫療硬質 PVC 成型粒子'
    },
    {
      sku: 'PP-5011',
      alt_sku: null,
      customer_id: '台化',
      material_class: 'RAW',
      category: 'PP 聚丙烯粒子',
      color: '本白',
      unit: 'KG',
      description: '台塑化高流動性醫療包裝級 PP 原料'
    }
  ],

  mold_master: [
    {
      mold_id: 'MI17193',
      design_cavities: 16,
      active_cavities: 16,
      cycle_time_sec: 27.1,
      status: 'active',
      location: '1號廠 射出機 A-03'
    },
    {
      mold_id: 'MI17193-8C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 23.5,
      status: 'active',
      location: '1號廠 射出機 A-07 (備用模)'
    },
    {
      mold_id: 'MI09078',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 32.0,
      status: 'active',
      location: '2號廠 射出機 B-01'
    },
    {
      mold_id: 'MI20224',
      design_cavities: 24,
      active_cavities: 22, // 塞2穴
      cycle_time_sec: 18.5,
      status: 'maintenance',
      location: '1號廠 射出機 A-01 (第7、19穴塞穴修復中)'
    }
  ],

  product_mold_bom: [
    {
      sku: 'A01-200-131',
      mold_id: 'MI17193',
      rm_sku: 'TERLUX 2802',
      net_mold_weight_g: 9.63,
      runner_weight_g: 8.32,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '已完成 PPOV 驗證, 常態量產模',
      valid_from: '2025-01-01', valid_to: null
    },
    {
      sku: 'A01-210-251',
      mold_id: 'MI17193',
      rm_sku: 'Geon M4910',
      net_mold_weight_g: 11.84,
      runner_weight_g: 10.40,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '主力 16 穴模, 單穴克重約 1.39g',
      valid_from: '2025-01-01', valid_to: null
    },
    {
      sku: 'A01-210-251',
      mold_id: 'MI17193-8C',
      rm_sku: 'Geon M4910',
      net_mold_weight_g: 9.40,
      runner_weight_g: 8.36,
      is_primary_mold: false,
      std_mfg_scrap_rate: 0.05,
      remarks: '急單備用 8 穴模, 單穴克重 2.22g',
      valid_from: '2025-01-01', valid_to: null
    },
    {
      sku: 'C09-200-251',
      mold_id: 'MI09078',
      rm_sku: 'TERLUX 2802',
      net_mold_weight_g: 14.50,
      runner_weight_g: 6.20,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.04,
      remarks: 'Y管成型, 週期 32s',
      valid_from: '2025-01-01', valid_to: null
    },
    {
      sku: 'B02-100-011',
      mold_id: 'MI20224',
      rm_sku: 'PP-5011',
      net_mold_weight_g: 18.20,
      runner_weight_g: 7.10,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      remarks: '高產能 24 穴模 (目前妥善 22 穴)',
      valid_from: '2025-01-01', valid_to: null
    }
  ],

  yield_master: [
    {
      sku: 'A01-200-131',
      std_sorting_yield: 0.98, // 98%
      notes: '標準全檢'
    },
    {
      sku: 'A01-210-251',
      std_sorting_yield: 0.96, // 96%
      notes: '標準全檢'
    },
    {
      sku: 'C09-200-251',
      std_sorting_yield: 0.95, // 95%
      notes: '標準全檢'
    },
    {
      sku: 'B02-100-011',
      std_sorting_yield: 0.99, // 99%
      notes: '標準全檢'
    }
  ],

  supplier_rule_master: [
    {
      rm_sku: 'TERLUX 2802',
      supplier_name: 'INEOS Styrolution (德國原廠/海運進口)',
      lead_time_days: 120, // 4 個月
      moq_kg: 5000, // 5 噸
      safety_stock_kg: 2000,
      max_storage_capacity_kg: 10000, // 原料倉實體上限 10 噸
      unit_price_usd: 3.85
    },
    {
      rm_sku: 'Geon M4910',
      supplier_name: 'Avient PolyOne (美國/海運進口)',
      lead_time_days: 90, // 3 個月
      moq_kg: 3000,
      safety_stock_kg: 1500,
      max_storage_capacity_kg: 8000, // 原料倉實體上限 8 噸
      unit_price_usd: 2.95
    },
    {
      rm_sku: 'PP-5011',
      supplier_name: '台灣化學纖維 (國內陸運)',
      lead_time_days: 30, // 1 個月
      moq_kg: 2000,
      safety_stock_kg: 800,
      max_storage_capacity_kg: 12000, // 原料倉實體上限 12 噸
      unit_price_usd: 1.65
    }
  ],

  demand_forecast_log: [
    {
      demand_id: 'FC-202608-001',
      version_no: '202608-W1',
      customer_id: 'MDX',
      sku: 'A01-200-131',
      target_date: '2026-11-30',
      demand_qty: 120000,
      created_by_id: 'usr_iris',
      created_by_name: 'Iris (業務採購)',
      created_at: '2026-08-01 09:30',
      notes: 'MDX 歐美旺季初估需求'
    },
    {
      demand_id: 'FC-202608-002',
      version_no: '202608-W2',
      customer_id: 'MDX',
      sku: 'A01-200-131',
      target_date: '2026-11-30',
      demand_qty: 90000,
      created_by_id: 'usr_iris',
      created_by_name: 'Iris (業務採購)',
      created_at: '2026-08-08 14:15',
      notes: 'MDX 下修 Forecast (-30,000 PCS)，系統觸發防爆倉注意'
    },
    {
      demand_id: 'FC-202608-003',
      version_no: '202608-W2',
      customer_id: 'MDX',
      sku: 'A01-210-251',
      target_date: '2026-12-15',
      demand_qty: 80000,
      created_by_id: 'usr_iris',
      created_by_name: 'Iris (業務採購)',
      created_at: '2026-08-08 14:20',
      notes: '加壓接頭年末定期備量'
    },
    {
      demand_id: 'FC-202608-004',
      version_no: '202608-W2',
      customer_id: 'MDX',
      sku: 'C09-200-251',
      target_date: '2026-10-31',
      demand_qty: 45000,
      created_by_id: 'usr_iris',
      created_by_name: 'Iris (業務採購)',
      created_at: '2026-08-08 14:25',
      notes: 'Y管緊急追加 Forecast'
    },
    {
      demand_id: 'FC-202608-005',
      version_no: '202608-W2',
      customer_id: 'ICU',
      sku: 'B02-100-011',
      target_date: '2026-09-30',
      demand_qty: 150000,
      created_by_id: 'usr_kevin',
      created_by_name: 'Kevin (業務專案)',
      created_at: '2026-08-10 11:00',
      notes: 'ICU 急單專案'
    }
  ],

  actual_order: [
    {
      order_id: 'PO-MDX-202608-01',
      customer_id: 'MDX',
      sku: 'A01-200-131',
      target_date: '2026-11-30',
      order_qty: 50000,
      status: 'in_production',
      order_date: '2026-08-15'
    },
    {
      order_id: 'PO-MDX-202608-02',
      customer_id: 'MDX',
      sku: 'A01-210-251',
      target_date: '2026-12-15',
      order_qty: 30000,
      status: 'confirmed',
      order_date: '2026-08-18'
    }
  ],

  inventory_wip_snapshot: [
    {
      snapshot_date: '2026-08-20',
      sku: 'A01-200-131',
      fg_ready_qty: 15000, // 庫房合格
      wip_pending_qty: 25000, // Sorting 待驗
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'A01-210-251',
      fg_ready_qty: 8000,
      wip_pending_qty: 12000,
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'C09-200-251',
      fg_ready_qty: 3000,
      wip_pending_qty: 5000,
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'B02-100-011',
      fg_ready_qty: 20000,
      wip_pending_qty: 35000,
      rm_on_hand_kg: 0
    },
    // Raw materials on-hand
    {
      snapshot_date: '2026-08-20',
      sku: 'TERLUX 2802',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 2450.0 // KG
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'Geon M4910',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 1100.0 // KG
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'PP-5011',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 3200.0 // KG
    }
  ],

  po_in_transit: [
    {
      po_number: 'PO-RM-2026-0501',
      rm_sku: 'TERLUX 2802',
      in_transit_qty_kg: 5000, // 1 櫃
      eta_date: '2026-09-15',
      supplier_name: 'INEOS Germany',
      status: 'shipping'
    },
    {
      po_number: 'PO-RM-2026-0612',
      rm_sku: 'Geon M4910',
      in_transit_qty_kg: 3000,
      eta_date: '2026-10-05',
      supplier_name: 'Avient USA',
      status: 'shipping'
    }
  ],
  audit_log: [],
  material_classes: DEFAULT_MATERIAL_CLASSES,
  sorting_actual_yield_log: [], // Phase 3 初期為空，待實際全檢紀錄匯入
};

// 預設初次啟動為純淨空庫，不強行硬編碼假資料
export const INITIAL_DATABASE: SystemDatabase = EMPTY_DATABASE;
