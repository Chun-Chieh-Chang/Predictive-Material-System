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
  sorting_actual_yield_log: [],
  color_mixing_log: [],
};

// 2. 離線示範演練數據庫 (Demo / Training Sample Database - 52 筆代表性全階層物料鏈路)
export const DEMO_SAMPLE_DATABASE: SystemDatabase = {
  item_master: [
    // ═════════════════════════════════════════════════════════════════
    // A. 原料類 (RAW Materials - 12 筆)
    // ═════════════════════════════════════════════════════════════════
    {
      sku: 'RAW-PP-5011',
      alt_sku: 'PP-5011',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PP 聚丙烯醫療粒子',
      color: '本白 (Natural White)',
      unit: 'KG',
      description: '台塑化醫療包裝級高流動性 PP 原料 (MI=15)'
    },
    {
      sku: 'RAW-PP-7022',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PP 耐衝擊高韌性粒子',
      color: '半透本色',
      unit: 'KG',
      description: '台塑化射出級高韌性耐疲勞 PP 粒子'
    },
    {
      sku: 'RAW-ABS-2802',
      alt_sku: 'TERLUX 2802',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'MABS 醫療級高透原料',
      color: '透明本色 (Crystal Clear)',
      unit: 'KG',
      description: 'INEOS Styrolution 醫療級高透明耐衝擊 MABS 原料'
    },
    {
      sku: 'RAW-ABS-757',
      alt_sku: 'PA-757',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'ABS 射出級工程塑膠粒',
      color: '象牙白 (Ivory)',
      unit: 'KG',
      description: '奇美 POLYLAC PA-757 射出成型級通用 ABS 粒'
    },
    {
      sku: 'RAW-PC-110',
      alt_sku: 'PC-110',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PC 醫療級耐高溫聚碳酸酯',
      color: '透明微藍',
      unit: 'KG',
      description: '奇美 WONDERLITE PC-110 醫療耐滅菌級 PC 粒'
    },
    {
      sku: 'RAW-PC-1250Y',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PC 光學級聚碳酸酯',
      color: '高清全透',
      unit: 'KG',
      description: '帝人 Panlite 1250Y 醫療低粘度高流動透明 PC 粒'
    },
    {
      sku: 'RAW-PMMA-80N',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PMMA 壓克力高透光粒子',
      color: '全透光 (Optic Clear)',
      unit: 'KG',
      description: '奇美 ACRYREX PMMA-80N 高透光耐候壓克力成型粒'
    },
    {
      sku: 'RAW-PVC-M4910',
      alt_sku: 'Geon M4910',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'PVC 醫療硬質塑膠粒子',
      color: '半透本色',
      unit: 'KG',
      description: 'Avient PolyOne 醫療導管專用無毒硬質 PVC 粒'
    },
    {
      sku: 'RAW-TPU-95A',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'RAW',
      category: 'TPU 醫療彈性體粒子',
      color: '半透霧面 (Shore 95A)',
      unit: 'KG',
      description: 'Covestro Desmopan 醫療止水抗壓彈性體 TPU'
    },
    {
      sku: 'MB-WHITE-01',
      alt_sku: 'CB-WHITE-01',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: '白玉色母 (White Masterbatch)',
      color: '鈦白 (TiO2 40%)',
      unit: 'KG',
      description: '科萊恩醫療專用高濃度白色色母粒 (添加比 2%)'
    },
    {
      sku: 'MB-BLUE-02',
      alt_sku: 'CB-BLUE-01',
      customer_id: 'GEN',
      material_class: 'RAW',
      category: '醫療天藍色母 (Medical Blue)',
      color: '天藍 (Pantone 2915C)',
      unit: 'KG',
      description: '立安醫療專用無毒天藍色母粒 (添加比 1.5%)'
    },
    {
      sku: 'MB-GREEN-03',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'RAW',
      category: '安全綠色母 (Safety Green)',
      color: '青綠 (Pantone 347C)',
      unit: 'KG',
      description: '立安食品醫療級安全綠色母粒 (添加比 1.5%)'
    },

    // ═════════════════════════════════════════════════════════════════
    // B. 物料與包材類 (MAT Packaging & Aux Materials - 8 筆)
    // ═════════════════════════════════════════════════════════════════
    {
      sku: 'MAT-POUCH-100',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '泰維克滅菌袋 (100x150mm)',
      color: '白/透明',
      unit: 'PCS',
      description: '杜邦 Tyvek 醫療級單片環氧乙烷 EO 滅菌袋'
    },
    {
      sku: 'MAT-POUCH-250',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '透析管路專用滅菌袋 (250x400mm)',
      color: '白/透明',
      unit: 'PCS',
      description: '大尺寸呼吸與透析套組專用醫療滅菌立體袋'
    },
    {
      sku: 'MAT-BOX-01',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '外銷瓦楞紙箱 A型 (50x40x35cm)',
      color: '牛皮紙色',
      unit: 'PCS',
      description: '五層加厚外銷專用防潮抗壓紙箱 (容量 500 PCS)'
    },
    {
      sku: 'MAT-BOX-02',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '外銷瓦楞中箱 B型 (40x30x25cm)',
      color: '牛皮紙色',
      unit: 'PCS',
      description: '三層外銷分裝中箱 (容量 200 PCS)'
    },
    {
      sku: 'MAT-LABEL-MDX',
      alt_sku: null,
      customer_id: 'MDX',
      material_class: 'MAT',
      category: 'MDX 客戶追溯條碼標籤貼紙',
      color: '白底黑字',
      unit: 'PCS',
      description: 'MDX 專用抗酒精擦拭熱轉印 UDI 追溯標籤'
    },
    {
      sku: 'MAT-LABEL-ICU',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'MAT',
      category: 'ICU 雙層醫療序號標籤貼紙',
      color: '白底藍字',
      unit: 'PCS',
      description: 'ICU 專用雙層可撕式醫療追溯標籤'
    },
    {
      sku: 'MAT-DESIC-10G',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '醫療級矽膠乾燥劑 (10g)',
      color: '透明袋/藍珠',
      unit: 'PCS',
      description: '無塵室封裝食品醫療級防潮吸濕矽膠包'
    },
    {
      sku: 'MAT-CAP-SEAL',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'MAT',
      category: '接頭防塵保護易撕膜 (PE)',
      color: '透明',
      unit: 'PCS',
      description: '成型接頭端口防塵防汙保護易撕封口薄膜'
    },

    // ═════════════════════════════════════════════════════════════════
    // C. 零件類 (PART Single-molded Injected Parts - 18 筆，可出貨/可裝配)
    // ═════════════════════════════════════════════════════════════════
    {
      sku: 'A01-200-131',
      alt_sku: 'P-CON-T01',
      customer_id: 'MDX',
      material_class: 'PART',
      category: 'T接頭 (T-Connector)',
      color: '本色 (Natural)',
      unit: 'PCS',
      description: 'MDX 醫療級主力通風管 T型三向接頭本體'
    },
    {
      sku: 'A01-210-251',
      alt_sku: 'R1-2355',
      customer_id: 'MDX',
      material_class: 'PART',
      category: 'T接頭加壓款 (Pressure T-Connector)',
      color: '半透本色',
      unit: 'PCS',
      description: 'MDX 抽吸管 T型加壓接頭 (雙品號並存)'
    },
    {
      sku: 'C09-200-251',
      alt_sku: 'P-CON-Y01',
      customer_id: 'MDX',
      material_class: 'PART',
      category: 'Y管 (Y-Connector)',
      color: '本色 (Natural)',
      unit: 'PCS',
      description: 'MDX 呼吸照護迴路分流 Y管'
    },
    {
      sku: 'B02-100-011',
      alt_sku: 'ICU-B02',
      customer_id: 'ICU',
      material_class: 'PART',
      category: '直通接頭 (Straight Adapter)',
      color: '白色 (White)',
      unit: 'PCS',
      description: 'ICU 輸液導管高密封直通對接頭'
    },
    {
      sku: 'P-CON-STR02',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'PART',
      category: '快插母端接頭 (Female Quick Adapter)',
      color: '天藍色 (Blue)',
      unit: 'PCS',
      description: 'ICU 快速插拔母端直通接頭'
    },
    {
      sku: 'P-VALVE-BODY01',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'PART',
      category: '三通閥體 (3-Way Valve Body)',
      color: '高透 (Clear)',
      unit: 'PCS',
      description: '高壓三通旋塞閥 主閥體 (PC-110 射出)'
    },
    {
      sku: 'P-VALVE-CORE01',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'PART',
      category: '三通旋塞芯 (Stopcock Core)',
      color: '天藍色 (Blue)',
      unit: 'PCS',
      description: '三通閥 旋轉控制導流芯 (PP+藍色母)'
    },
    {
      sku: 'P-VALVE-CAP01',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'PART',
      category: '旋塞端蓋 (Stopcock Cap)',
      color: '高透 (Clear)',
      unit: 'PCS',
      description: '三通閥 旋鈕防脫止退端蓋 (PC-110)'
    },
    {
      sku: 'P-CHECK-BODY',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'PART',
      category: '止回閥透明閥體 (Check Valve Body)',
      color: '高透光',
      unit: 'PCS',
      description: '單向止回閥 外殼閥體 (PC-1250Y 光學級)'
    },
    {
      sku: 'P-CHECK-CORE',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'PART',
      category: '止回閥膜片座 (Check Valve Disc)',
      color: '霧面 (Shore 95A)',
      unit: 'PCS',
      description: '單向止回閥 逆止彈性矽膠瓣膜座 (TPU-95A)'
    },
    {
      sku: 'P-FILTER-TOP',
      alt_sku: null,
      customer_id: 'OEM',
      material_class: 'PART',
      category: '過濾器上蓋 (Filter Housing Top)',
      color: '全透光 (Clear)',
      unit: 'PCS',
      description: '微孔精密輸液過濾器 超音波熔接上蓋 (PMMA)'
    },
    {
      sku: 'P-FILTER-BTM',
      alt_sku: null,
      customer_id: 'OEM',
      material_class: 'PART',
      category: '過濾器下蓋 (Filter Housing Bottom)',
      color: '全透光 (Clear)',
      unit: 'PCS',
      description: '微孔精密輸液過濾器 導流下蓋 (PMMA)'
    },
    {
      sku: 'P-LUER-MALE',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'PART',
      category: '標準魯爾公接頭 (Male Luer Lock)',
      color: '象牙白 (White)',
      unit: 'PCS',
      description: 'ISO 80369-7 標準旋緊式魯爾公接頭 (ABS-757)'
    },
    {
      sku: 'P-LUER-FEMALE',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'PART',
      category: '標準魯爾母接頭 (Female Luer Lock)',
      color: '象牙白 (White)',
      unit: 'PCS',
      description: 'ISO 80369-7 標準旋緊式魯爾母接頭 (ABS-757)'
    },
    {
      sku: 'P-SYR-BARREL50',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'PART',
      category: '50ml 注射筒外筒 (50ml Barrel)',
      color: '高透本色',
      unit: 'PCS',
      description: '50ml 醫療注射針筒 外筒刻度套筒 (PP-5011)'
    },
    {
      sku: 'P-SYR-PLUNGER50',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'PART',
      category: '50ml 推桿活塞 (50ml Plunger)',
      color: '本白色',
      unit: 'PCS',
      description: '50ml 醫療注射針筒 推進桿 (PP-7022)'
    },
    {
      sku: 'P-DIAL-SHELL',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'PART',
      category: '透析器筒體 (Dialyzer Shell)',
      color: '透明高剛性',
      unit: 'PCS',
      description: '血液透析過濾器 圓柱耐壓外殼 (PC-110)'
    },
    {
      sku: 'P-DIAL-CAP',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'PART',
      category: '透析器導流端蓋 (Dialyzer Header Cap)',
      color: '天藍色 (Blue)',
      unit: 'PCS',
      description: '血液透析過濾器 兩端分流封蓋 (PC+藍色母)'
    },

    // ═════════════════════════════════════════════════════════════════
    // D. 組件類 (COMP Sub-assemblies - 8 筆，中間次總成，部分可出貨)
    // ═════════════════════════════════════════════════════════════════
    {
      sku: 'CP-3WAY-VALVE',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'COMP',
      category: '三通旋塞閥次總成 (3-Way Stopcock)',
      color: '透明/藍芯',
      unit: 'PCS',
      description: '三通閥體+旋塞芯+端蓋 超音波組裝合格次總成'
    },
    {
      sku: 'CP-CHECK-VALVE',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'COMP',
      category: '單向止回閥總成 (Check Valve Unit)',
      color: '全透明',
      unit: 'PCS',
      description: '高靈敏低開口壓單向止回閥 封裝總成'
    },
    {
      sku: 'CP-FILTER-UNIT',
      alt_sku: null,
      customer_id: 'OEM',
      material_class: 'COMP',
      category: '精密微孔過濾組件 (IV Filter Unit)',
      color: '透明',
      unit: 'PCS',
      description: '0.22um 膜片超音波熱熔過濾器總成'
    },
    {
      sku: 'CP-LUER-ADAPTER',
      alt_sku: null,
      customer_id: 'GEN',
      material_class: 'COMP',
      category: '雙向魯爾快速轉接器 (Dual Luer Adapter)',
      color: '白色',
      unit: 'PCS',
      description: '魯爾公+母雙向旋緊轉接器組件'
    },
    {
      sku: 'CP-SYR-50ML',
      alt_sku: null,
      customer_id: 'MED',
      material_class: 'COMP',
      category: '50ml 預組裝注射器空筒 (50ml Syringe Unit)',
      color: '本色/白桿',
      unit: 'PCS',
      description: '50ml 外筒+活塞推桿預裝配組件'
    },
    {
      sku: 'CP-BREATH-Y-CONN',
      alt_sku: null,
      customer_id: 'MDX',
      material_class: 'COMP',
      category: '呼吸迴路雙向分流連接總成 (Breathing Y-Unit)',
      color: '本色',
      unit: 'PCS',
      description: 'Y管+雙直通接頭 黏接次總成'
    },
    {
      sku: 'CP-PRESS-PORT',
      alt_sku: null,
      customer_id: 'MDX',
      material_class: 'COMP',
      category: '加壓監測接頭總成 (Pressure Port Unit)',
      color: '半透本色',
      unit: 'PCS',
      description: '加壓T接頭+快插接頭總成'
    },
    {
      sku: 'CP-DIAL-CORE-UNIT',
      alt_sku: null,
      customer_id: 'ICU',
      material_class: 'COMP',
      category: '透析器膜管封裝總成 (Dialyzer Core Unit)',
      color: '透明/藍蓋',
      unit: 'PCS',
      description: '透析筒體+雙端蓋封裝完成之透析柱次總成'
    },

    // ═════════════════════════════════════════════════════════════════
    // E. 套件/成品類 (SET Finished Goods Kits - 6 筆，最終出貨品)
    // ═════════════════════════════════════════════════════════════════
    {
      sku: 'SET-IV-EXT-01',
      alt_sku: 'IV-EXT-STD',
      customer_id: 'MED',
      material_class: 'SET',
      category: '標準輸液延長管套組 (150cm)',
      color: '透明無菌包裝',
      unit: 'SET',
      description: '含三通閥組件+魯爾接頭+150cm導管 單套滅菌成品'
    },
    {
      sku: 'SET-IV-EXT-02',
      alt_sku: 'IV-EXT-DUAL',
      customer_id: 'MED',
      material_class: 'SET',
      category: '雙向加藥輸液延長管套組',
      color: '透明無菌包裝',
      unit: 'SET',
      description: '含雙三通閥+止回閥+魯爾接頭 雙通道加藥延長管套組'
    },
    {
      sku: 'SET-BREATH-CIR-01',
      alt_sku: 'BC-ADULT-01',
      customer_id: 'MDX',
      material_class: 'SET',
      category: '成人呼吸照護加熱迴路套組',
      color: '透明/藍色管路',
      unit: 'SET',
      description: 'MDX 成人呼吸機專用加熱迴路管路套組 (含Y管、T接頭、滅菌袋包裝)'
    },
    {
      sku: 'SET-BREATH-CIR-02',
      alt_sku: 'BC-PED-02',
      customer_id: 'MDX',
      material_class: 'SET',
      category: '小兒專用低死腔呼吸迴路套組',
      color: '透明/青綠接頭',
      unit: 'SET',
      description: 'MDX 小兒呼吸照護極低死腔迴路管路套組'
    },
    {
      sku: 'SET-DIALYSIS-LINE',
      alt_sku: 'HD-BLOOD-LINE',
      customer_id: 'ICU',
      material_class: 'SET',
      category: '血液透析體外循環導管組',
      color: '紅藍標識套組',
      unit: 'SET',
      description: 'ICU 血液透析專用動靜脈體外循環導管與透析柱總套組'
    },
    {
      sku: 'SET-INFUSION-PUMP',
      alt_sku: 'PUMP-TUBING-SET',
      customer_id: 'OEM',
      material_class: 'SET',
      category: '微量注射泵專用輸液管路套件',
      color: '高精度透明套裝',
      unit: 'SET',
      description: '50ml 專用注射器+微孔過濾器+高阻隔導管 微量注射泵套組'
    }
  ],

  mold_master: [
    {
      mold_id: 'MI-T-16C',
      design_cavities: 16,
      active_cavities: 16,
      cycle_time_sec: 25.0,
      status: 'active',
      location: '1號廠 射出機 A-01 (T接頭主力模)'
    },
    {
      mold_id: 'MI-T-08C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 28.0,
      status: 'trial',
      location: '1號廠 射出機 A-02 (T接頭備用模/試模)'
    },
    {
      mold_id: 'MI-Y-08C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 30.0,
      status: 'active',
      location: '1號廠 射出機 A-03 (Y管成型模)'
    },
    {
      mold_id: 'MI-STR-32C',
      design_cavities: 32,
      active_cavities: 30, // 塞2穴
      cycle_time_sec: 18.0,
      status: 'active',
      location: '1號廠 射出機 A-04 (直通接頭高速模)'
    },
    {
      mold_id: 'MI-VALVE-BODY-08C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 24.0,
      status: 'active',
      location: '2號廠 射出機 B-01 (三通閥體模)'
    },
    {
      mold_id: 'MI-VALVE-CORE-16C',
      design_cavities: 16,
      active_cavities: 16,
      cycle_time_sec: 16.0,
      status: 'active',
      location: '2號廠 射出機 B-02 (三通旋塞芯模)'
    },
    {
      mold_id: 'MI-VALVE-CAP-16C',
      design_cavities: 16,
      active_cavities: 16,
      cycle_time_sec: 18.0,
      status: 'active',
      location: '2號廠 射出機 B-03 (旋塞端蓋模)'
    },
    {
      mold_id: 'MI-CHECK-BODY-16C',
      design_cavities: 16,
      active_cavities: 16,
      cycle_time_sec: 20.0,
      status: 'active',
      location: '2號廠 射出機 B-04 (止回閥體模)'
    },
    {
      mold_id: 'MI-CHECK-CORE-32C',
      design_cavities: 32,
      active_cavities: 32,
      cycle_time_sec: 15.0,
      status: 'active',
      location: '2號廠 射出機 B-05 (TPU閥芯模)'
    },
    {
      mold_id: 'MI-FILTER-TOP-08C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 26.0,
      status: 'active',
      location: '3號廠 射出機 C-01 (過濾器上蓋模)'
    },
    {
      mold_id: 'MI-FILTER-BTM-08C',
      design_cavities: 8,
      active_cavities: 8,
      cycle_time_sec: 26.0,
      status: 'active',
      location: '3號廠 射出機 C-02 (過濾器下蓋模)'
    },
    {
      mold_id: 'MI-LUER-M-32C',
      design_cavities: 32,
      active_cavities: 32,
      cycle_time_sec: 14.0,
      status: 'active',
      location: '3號廠 射出機 C-03 (魯爾公模)'
    },
    {
      mold_id: 'MI-LUER-F-32C',
      design_cavities: 32,
      active_cavities: 32,
      cycle_time_sec: 14.0,
      status: 'active',
      location: '3號廠 射出機 C-04 (魯爾母模)'
    },
    {
      mold_id: 'MI-SYR-B50-04C',
      design_cavities: 4,
      active_cavities: 4,
      cycle_time_sec: 32.0,
      status: 'active',
      location: '4號廠 射出機 D-01 (50ml外筒大模)'
    },
    {
      mold_id: 'MI-DIAL-SH-02C',
      design_cavities: 2,
      active_cavities: 2,
      cycle_time_sec: 42.0,
      status: 'active',
      location: '4號廠 射出機 D-02 (透析器外殼大模)'
    }
  ],

  product_mold_bom: [
    // T接頭 (MABS)
    {
      sku: 'A01-200-131',
      mold_id: 'MI-T-16C',
      rm_sku: 'RAW-ABS-2802',
      net_mold_weight_g: 9.60,
      runner_weight_g: 8.30,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '主力16穴模，單穴約 1.12g',
      valid_from: '2025-01-01', valid_to: null
    },
    {
      sku: 'A01-200-131',
      mold_id: 'MI-T-08C',
      rm_sku: 'RAW-ABS-2802',
      net_mold_weight_g: 8.90,
      runner_weight_g: 7.20,
      is_primary_mold: false,
      std_mfg_scrap_rate: 0.05,
      remarks: '備用8穴模，單穴約 2.01g',
      valid_from: '2025-01-01', valid_to: null
    },
    // 加壓T接頭 (PVC)
    {
      sku: 'A01-210-251',
      mold_id: 'MI-T-16C',
      rm_sku: 'RAW-PVC-M4910',
      net_mold_weight_g: 11.80,
      runner_weight_g: 10.40,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '硬質PVC加壓款，單穴約 1.39g',
      valid_from: '2025-01-01', valid_to: null
    },
    // Y管 (MABS)
    {
      sku: 'C09-200-251',
      mold_id: 'MI-Y-08C',
      rm_sku: 'RAW-ABS-2802',
      net_mold_weight_g: 14.50,
      runner_weight_g: 6.20,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.04,
      remarks: 'Y管分流件，單穴約 2.59g',
      valid_from: '2025-01-01', valid_to: null
    },
    // 直通接頭 (PP+白)
    {
      sku: 'B02-100-011',
      mold_id: 'MI-STR-32C',
      rm_sku: 'RAW-PP-5011',
      net_mold_weight_g: 18.20,
      runner_weight_g: 7.10,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      color_mixing_ratio_pct: 2.0,
      remarks: '32穴高速模(妥善30穴)，添加2%白玉色母',
      valid_from: '2025-01-01', valid_to: null
    },
    // 直通快插母端 (PP+藍)
    {
      sku: 'P-CON-STR02',
      mold_id: 'MI-STR-32C',
      rm_sku: 'RAW-PP-5011',
      net_mold_weight_g: 18.20,
      runner_weight_g: 7.10,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      color_mixing_ratio_pct: 1.5,
      remarks: '添加1.5%天藍色母',
      valid_from: '2025-01-01', valid_to: null
    },
    // 三通閥體 (PC-110)
    {
      sku: 'P-VALVE-BODY01',
      mold_id: 'MI-VALVE-BODY-08C',
      rm_sku: 'RAW-PC-110',
      net_mold_weight_g: 22.40,
      runner_weight_g: 9.60,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: 'PC耐壓閥體，單穴 4.00g',
      valid_from: '2025-01-01', valid_to: null
    },
    // 三通旋塞芯 (PP+藍)
    {
      sku: 'P-VALVE-CORE01',
      mold_id: 'MI-VALVE-CORE-16C',
      rm_sku: 'RAW-PP-7022',
      net_mold_weight_g: 14.20,
      runner_weight_g: 6.40,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      color_mixing_ratio_pct: 1.5,
      remarks: '添加1.5%天藍色母',
      valid_from: '2025-01-01', valid_to: null
    },
    // 旋塞端蓋 (PC-110)
    {
      sku: 'P-VALVE-CAP01',
      mold_id: 'MI-VALVE-CAP-16C',
      rm_sku: 'RAW-PC-110',
      net_mold_weight_g: 12.80,
      runner_weight_g: 5.60,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      remarks: 'PC超音波熔接端蓋',
      valid_from: '2025-01-01', valid_to: null
    },
    // 止回閥體 (PC-1250Y)
    {
      sku: 'P-CHECK-BODY',
      mold_id: 'MI-CHECK-BODY-16C',
      rm_sku: 'RAW-PC-1250Y',
      net_mold_weight_g: 15.60,
      runner_weight_g: 6.80,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      remarks: '光學級高透明止回閥殼',
      valid_from: '2025-01-01', valid_to: null
    },
    // 止回閥芯 (TPU-95A)
    {
      sku: 'P-CHECK-CORE',
      mold_id: 'MI-CHECK-CORE-32C',
      rm_sku: 'RAW-TPU-95A',
      net_mold_weight_g: 8.20,
      runner_weight_g: 4.60,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '高彈性耐壓止回膜片',
      valid_from: '2025-01-01', valid_to: null
    },
    // 過濾器上蓋 (PMMA)
    {
      sku: 'P-FILTER-TOP',
      mold_id: 'MI-FILTER-TOP-08C',
      rm_sku: 'RAW-PMMA-80N',
      net_mold_weight_g: 24.00,
      runner_weight_g: 8.80,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '壓克力高透光過濾器上蓋',
      valid_from: '2025-01-01', valid_to: null
    },
    // 過濾器下蓋 (PMMA)
    {
      sku: 'P-FILTER-BTM',
      mold_id: 'MI-FILTER-BTM-08C',
      rm_sku: 'RAW-PMMA-80N',
      net_mold_weight_g: 24.00,
      runner_weight_g: 8.80,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '壓克力高透光過濾器下蓋',
      valid_from: '2025-01-01', valid_to: null
    },
    // 魯爾公 (ABS)
    {
      sku: 'P-LUER-MALE',
      mold_id: 'MI-LUER-M-32C',
      rm_sku: 'RAW-ABS-757',
      net_mold_weight_g: 11.20,
      runner_weight_g: 5.40,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      remarks: '32穴高速魯爾公模',
      valid_from: '2025-01-01', valid_to: null
    },
    // 魯爾母 (ABS)
    {
      sku: 'P-LUER-FEMALE',
      mold_id: 'MI-LUER-F-32C',
      rm_sku: 'RAW-ABS-757',
      net_mold_weight_g: 11.20,
      runner_weight_g: 5.40,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.02,
      remarks: '32穴高速魯爾母模',
      valid_from: '2025-01-01', valid_to: null
    },
    // 50ml 注射外筒 (PP-5011)
    {
      sku: 'P-SYR-BARREL50',
      mold_id: 'MI-SYR-B50-04C',
      rm_sku: 'RAW-PP-5011',
      net_mold_weight_g: 48.00,
      runner_weight_g: 14.00,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.03,
      remarks: '4穴厚壁大筒模，單穴 15.5g',
      valid_from: '2025-01-01', valid_to: null
    },
    // 透析外殼 (PC-110)
    {
      sku: 'P-DIAL-SHELL',
      mold_id: 'MI-DIAL-SH-02C',
      rm_sku: 'RAW-PC-110',
      net_mold_weight_g: 96.00,
      runner_weight_g: 22.00,
      is_primary_mold: true,
      std_mfg_scrap_rate: 0.04,
      remarks: '2穴大型透析管模，單穴 59g',
      valid_from: '2025-01-01', valid_to: null
    }
  ],

  yield_master: [
    { sku: 'A01-200-131', std_sorting_yield: 0.98, notes: '主力T接頭全檢標竿' },
    { sku: 'A01-210-251', std_sorting_yield: 0.96, notes: '加壓款全檢' },
    { sku: 'C09-200-251', std_sorting_yield: 0.95, notes: 'Y管全檢' },
    { sku: 'B02-100-011', std_sorting_yield: 0.99, notes: '直通接頭全檢' },
    { sku: 'P-CON-STR02', std_sorting_yield: 0.985, notes: '快插母端全檢' },
    { sku: 'P-VALVE-BODY01', std_sorting_yield: 0.97, notes: '三通閥體高壓氣密全檢' },
    { sku: 'P-VALVE-CORE01', std_sorting_yield: 0.98, notes: '旋塞芯尺寸全檢' },
    { sku: 'P-VALVE-CAP01', std_sorting_yield: 0.99, notes: '端蓋外觀全檢' },
    { sku: 'P-CHECK-BODY', std_sorting_yield: 0.975, notes: '止回閥體外觀全檢' },
    { sku: 'P-CHECK-CORE', std_sorting_yield: 0.965, notes: '彈性閥瓣彈性全檢' },
    { sku: 'P-FILTER-TOP', std_sorting_yield: 0.97, notes: '光學級透光度全檢' },
    { sku: 'P-FILTER-BTM', std_sorting_yield: 0.97, notes: '導流下蓋全檢' },
    { sku: 'P-LUER-MALE', std_sorting_yield: 0.992, notes: '魯爾公螺紋量規全檢' },
    { sku: 'P-LUER-FEMALE', std_sorting_yield: 0.992, notes: '魯爾母螺紋量規全檢' },
    { sku: 'P-SYR-BARREL50', std_sorting_yield: 0.96, notes: '50ml外筒圓柱度全檢' },
    { sku: 'P-SYR-PLUNGER50', std_sorting_yield: 0.98, notes: '推桿垂直度全檢' },
    { sku: 'P-DIAL-SHELL', std_sorting_yield: 0.94, notes: '大型透析外殼耐壓全檢' },
    { sku: 'P-DIAL-CAP', std_sorting_yield: 0.975, notes: '導流蓋氣密全檢' },
    { sku: 'CP-3WAY-VALVE', std_sorting_yield: 0.98, notes: '三通閥次總成水壓測試' },
    { sku: 'CP-CHECK-VALVE', std_sorting_yield: 0.985, notes: '止回閥逆止氣密測試' },
    { sku: 'CP-FILTER-UNIT', std_sorting_yield: 0.975, notes: '過濾組件完整性起泡點測試' },
    { sku: 'SET-IV-EXT-01', std_sorting_yield: 0.995, notes: '輸液延長管套組包裝全檢' },
    { sku: 'SET-BREATH-CIR-01', std_sorting_yield: 0.99, notes: '成人呼吸迴路套件全檢' },
    { sku: 'SET-DIALYSIS-LINE', std_sorting_yield: 0.985, notes: '透析體外循環套組全檢' }
  ],

  supplier_rule_master: [
    {
      rm_sku: 'RAW-ABS-2802',
      supplier_name: 'INEOS Styrolution (德國原廠/海運進口)',
      lead_time_days: 120,
      moq_kg: 5000,
      safety_stock_kg: 2500,
      max_storage_capacity_kg: 12000,
      unit_price_usd: 3.85
    },
    {
      rm_sku: 'RAW-PVC-M4910',
      supplier_name: 'Avient PolyOne (美國/海運進口)',
      lead_time_days: 90,
      moq_kg: 3000,
      safety_stock_kg: 1500,
      max_storage_capacity_kg: 8000,
      unit_price_usd: 2.95
    },
    {
      rm_sku: 'RAW-PP-5011',
      supplier_name: '台灣化學纖維 (國內陸運)',
      lead_time_days: 30,
      moq_kg: 2000,
      safety_stock_kg: 1000,
      max_storage_capacity_kg: 15000,
      unit_price_usd: 1.65
    },
    {
      rm_sku: 'RAW-PP-7022',
      supplier_name: '台灣化學纖維 (國內陸運)',
      lead_time_days: 30,
      moq_kg: 2000,
      safety_stock_kg: 800,
      max_storage_capacity_kg: 10000,
      unit_price_usd: 1.75
    },
    {
      rm_sku: 'RAW-ABS-757',
      supplier_name: '奇美實業 (國內陸運)',
      lead_time_days: 20,
      moq_kg: 1000,
      safety_stock_kg: 500,
      max_storage_capacity_kg: 10000,
      unit_price_usd: 2.10
    },
    {
      rm_sku: 'RAW-PC-110',
      supplier_name: '奇美實業 (國內陸運)',
      lead_time_days: 25,
      moq_kg: 1000,
      safety_stock_kg: 600,
      max_storage_capacity_kg: 8000,
      unit_price_usd: 3.40
    },
    {
      rm_sku: 'RAW-PC-1250Y',
      supplier_name: '日本帝人 Teijin (海運進口)',
      lead_time_days: 75,
      moq_kg: 2000,
      safety_stock_kg: 1000,
      max_storage_capacity_kg: 6000,
      unit_price_usd: 4.20
    },
    {
      rm_sku: 'RAW-PMMA-80N',
      supplier_name: '奇美實業 (國內陸運)',
      lead_time_days: 25,
      moq_kg: 1000,
      safety_stock_kg: 500,
      max_storage_capacity_kg: 6000,
      unit_price_usd: 2.80
    },
    {
      rm_sku: 'RAW-TPU-95A',
      supplier_name: '科思創 Covestro (海運進口)',
      lead_time_days: 60,
      moq_kg: 1500,
      safety_stock_kg: 800,
      max_storage_capacity_kg: 5000,
      unit_price_usd: 5.60
    },
    {
      rm_sku: 'MB-WHITE-01',
      supplier_name: '科萊恩 Clariant (廠內常備)',
      lead_time_days: 14,
      moq_kg: 100,
      safety_stock_kg: 50,
      max_storage_capacity_kg: 1000,
      unit_price_usd: 8.50
    },
    {
      rm_sku: 'MB-BLUE-02',
      supplier_name: '立安色母 (國內陸運)',
      lead_time_days: 10,
      moq_kg: 50,
      safety_stock_kg: 30,
      max_storage_capacity_kg: 800,
      unit_price_usd: 9.20
    },
    {
      rm_sku: 'MB-GREEN-03',
      supplier_name: '立安色母 (國內陸運)',
      lead_time_days: 10,
      moq_kg: 50,
      safety_stock_kg: 30,
      max_storage_capacity_kg: 800,
      unit_price_usd: 9.20
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
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
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
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
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
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
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
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
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
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
      created_at: '2026-08-10 11:00',
      notes: 'ICU 急單專案'
    },
    {
      demand_id: 'FC-202608-006',
      version_no: '202608-W2',
      customer_id: 'MDX',
      sku: 'SET-BREATH-CIR-01',
      target_date: '2026-11-15',
      demand_qty: 25000,
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
      created_at: '2026-08-10 14:00',
      notes: '成人呼吸迴路套組 Q4 訂單'
    },
    {
      demand_id: 'FC-202608-007',
      version_no: '202608-W2',
      customer_id: 'MED',
      sku: 'SET-IV-EXT-01',
      target_date: '2026-10-15',
      demand_qty: 60000,
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
      created_at: '2026-08-12 09:15',
      notes: '輸液延長管常態供應'
    },
    {
      demand_id: 'FC-202608-008',
      version_no: '202608-W2',
      customer_id: 'ICU',
      sku: 'SET-DIALYSIS-LINE',
      target_date: '2026-12-01',
      demand_qty: 18000,
      created_by_id: 'usr_sales',
      created_by_name: '業務人員',
      created_at: '2026-08-15 16:30',
      notes: '透析導管年終標案'
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
    },
    {
      order_id: 'PO-ICU-202608-01',
      customer_id: 'ICU',
      sku: 'B02-100-011',
      target_date: '2026-09-30',
      order_qty: 80000,
      status: 'in_production',
      order_date: '2026-08-12'
    },
    {
      order_id: 'PO-MDX-202608-03',
      customer_id: 'MDX',
      sku: 'SET-BREATH-CIR-01',
      target_date: '2026-11-15',
      order_qty: 15000,
      status: 'confirmed',
      order_date: '2026-08-16'
    },
    {
      order_id: 'PO-MED-202608-01',
      customer_id: 'MED',
      sku: 'SET-IV-EXT-01',
      target_date: '2026-10-15',
      order_qty: 40000,
      status: 'partial_shipped',
      order_date: '2026-08-05'
    }
  ],

  inventory_wip_snapshot: [
    {
      snapshot_date: '2026-08-20',
      sku: 'A01-200-131',
      fg_ready_qty: 15000,
      wip_pending_qty: 25000,
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
    {
      snapshot_date: '2026-08-20',
      sku: 'P-VALVE-BODY01',
      fg_ready_qty: 12000,
      wip_pending_qty: 18000,
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'P-CHECK-BODY',
      fg_ready_qty: 6000,
      wip_pending_qty: 9000,
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'SET-BREATH-CIR-01',
      fg_ready_qty: 5000,
      wip_pending_qty: 8000,
      rm_on_hand_kg: 0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'SET-IV-EXT-01',
      fg_ready_qty: 12000,
      wip_pending_qty: 15000,
      rm_on_hand_kg: 0
    },
    // 原料在庫
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-ABS-2802',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 2450.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-PVC-M4910',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 1100.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-PP-5011',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 3200.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-PC-110',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 1850.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-PC-1250Y',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 950.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-TPU-95A',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 620.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-ABS-757',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 1400.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'RAW-PMMA-80N',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 780.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'MB-WHITE-01',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 120.0
    },
    {
      snapshot_date: '2026-08-20',
      sku: 'MB-BLUE-02',
      fg_ready_qty: 0,
      wip_pending_qty: 0,
      rm_on_hand_kg: 85.0
    }
  ],

  po_in_transit: [
    {
      po_number: 'PO-RM-2026-0501',
      rm_sku: 'RAW-ABS-2802',
      in_transit_qty_kg: 5000,
      eta_date: '2026-09-15',
      supplier_name: 'INEOS Germany',
      status: 'shipping'
    },
    {
      po_number: 'PO-RM-2026-0612',
      rm_sku: 'RAW-PVC-M4910',
      in_transit_qty_kg: 3000,
      eta_date: '2026-10-05',
      supplier_name: 'Avient USA',
      status: 'shipping'
    },
    {
      po_number: 'PO-RM-2026-0708',
      rm_sku: 'RAW-PC-1250Y',
      in_transit_qty_kg: 2000,
      eta_date: '2026-09-28',
      supplier_name: 'Teijin Japan',
      status: 'customs'
    }
  ],
  audit_log: [],
  material_classes: DEFAULT_MATERIAL_CLASSES,
  sorting_actual_yield_log: [
    {
      log_id: 'SYL-20260820-001',
      batch_no: 'LOT-20260820-A01',
      sku: 'A01-200-131',
      sorting_date: '2026-08-20',
      qty_sorted: 10000,
      qty_passed: 9850,
      actual_yield_rate: 0.985,
      operator_id: 'usr_operator',
      notes: '白班 3F 全檢合格入庫',
      created_at: '2026-08-20T17:00:00Z'
    },
    {
      log_id: 'SYL-20260820-002',
      batch_no: 'LOT-20260820-B02',
      sku: 'B02-100-011',
      sorting_date: '2026-08-20',
      qty_sorted: 15000,
      qty_passed: 14880,
      actual_yield_rate: 0.992,
      operator_id: 'usr_operator',
      notes: '白班 3F 直通接頭全檢',
      created_at: '2026-08-20T17:30:00Z'
    }
  ],
  color_mixing_log: [
    {
      mix_log_id: 'MIX-20260820-001',
      batch_no: 'BATCH-BLU-20260820',
      mixing_date: '2026-08-20',
      operator_id: 'usr_operator',
      base_resin_sku: 'RAW-PP-5011',
      base_resin_kg: 98.5,
      colorant_sku: 'MB-BLUE-02',
      colorant_kg: 1.5,
      mixing_ratio_pct: 1.50,
      total_batch_kg: 100.0,
      mold_id: 'MI-STR-32C',
      sku: 'P-CON-STR02',
      process_tag: 'mixed',
      notes: '天藍色接頭成型前導預混',
      created_at: '2026-08-20T08:30:00Z'
    },
    {
      mix_log_id: 'MIX-20260818-002',
      batch_no: 'BATCH-WHT-20260818',
      mixing_date: '2026-08-18',
      operator_id: 'usr_operator',
      base_resin_sku: 'RAW-PP-5011',
      base_resin_kg: 98.0,
      colorant_sku: 'MB-WHITE-01',
      colorant_kg: 2.0,
      mixing_ratio_pct: 2.00,
      total_batch_kg: 100.0,
      mold_id: 'MI-STR-32C',
      sku: 'B02-100-011',
      process_tag: 'mixed',
      notes: '白玉色母預混料',
      created_at: '2026-08-18T14:15:00Z'
    }
  ],
};

// 預設初次啟動為 52 筆代表性示範演練數據庫（開箱即用，匯入真實資料時自動換檔）
export const INITIAL_DATABASE: SystemDatabase = DEMO_SAMPLE_DATABASE;
