/**
 * Material Classification Validation Utilities
 *
 * 五層物料分類體系驗證函式庫：
 * - SKU 格式預設規則
 * - 分類有效性驗證
 * - 匯入資料批量校驗
 * - 分類路徑建構
 */

import type { MaterialClass, MaterialClassCode, ItemMaster, ProductMoldBOM } from '../types';

// ─── 預設 SKU 前綴規範（可匯入時覆寫）──
export const SKU_PREFIX_RULES: Record<MaterialClassCode, string[]> = {
  RAW:  ['RM-', 'RAW-', 'MABS-', 'PP-', 'PVC-', 'PE-'],
  MAT:  ['PKG-', 'MAT-', 'LABEL-', 'BAG-', 'BOX-'],
  PART: ['PT-', 'PART-', 'CONN-', 'VALVE-', 'FITTING-'],
  COMP: ['ASM-', 'COMP-', 'SUB-'],
  SET:  ['SET-', 'SKU-', 'A01-', 'B02-', 'C09-'],
};

// ─── 分類有效性驗證 ──────────────────────────────────────────────────────────

/** 檢查代碼是否為合法的五層分類 */
export function isValidClassCode(code: string): code is MaterialClassCode {
  return ['RAW', 'MAT', 'PART', 'COMP', 'SET'].includes(code);
}

/** 檢查分類是否存在且啟用 */
export function isActiveClass(classes: MaterialClass[], code: string): boolean {
  return classes.some(c => c.code === code && c.is_active);
}

/** 取得分類樹階層深度（RAW = 1, RAW>PART = 無，設定父節點後遞增） */
export function getClassDepth(classes: MaterialClass[], code: string): number {
  if (!isValidClassCode(code)) return 0;
  const target = classes.find(c => c.code === code);
  if (!target) return 0;
  if (!target.parent_code) return 1;
  return getClassDepth(classes, target.parent_code) + 1;
}

/** 構建完整路徑標籤（e.g. "原料類 > ABS/MABS"） */
export function buildClassPath(classes: MaterialClass[], code: string): string {
  if (!isValidClassCode(code)) return code;
  const parts: string[] = [];
  let current: string | undefined = code;
  while (current) {
    const node = classes.find(c => c.code === current);
    if (!node) break;
    parts.unshift(node.name);
    current = node.parent_code;
  }
  return parts.join(' > ');
}

// ─── SKU 前綴推測分類 ────────────────────────────────────────────────────────

/**
 * 根據 SKU 字首推測最可能分類。
 * 若無匹配則回傳 null，由匯入流程手動指定。
 */
export function inferClassFromSku(sku: string, customPrefixRules?: Partial<Record<MaterialClassCode, string[]>>): MaterialClassCode | null {
  const rules = { ...SKU_PREFIX_RULES, ...customPrefixRules };
  const upperSku = sku.toUpperCase();
  for (const [code, prefixes] of Object.entries(rules) as [MaterialClassCode, string[]][]) {
    if (prefixes.some(p => upperSku.startsWith(p))) return code;
  }
  return null;
}

// ─── 匯入資料批量驗證 ────────────────────────────────────────────────────────

interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  classifiedCount: number;
  unclassifiedSkus: string[];
}

function validateImportRows(
  rows: Record<string, unknown>[],
  existingClasses: MaterialClass[],
  existingSkus: Set<string>,
): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unclassifiedSkus: string[] = [];
  let classifiedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sku = String(row['sku'] ?? row['SKU'] ?? row['品號'] ?? '').trim();
    const materialClass = String(row['material_class'] ?? row['分類'] ?? '').toUpperCase().trim();

    // SKU 必填
    if (!sku) {
      errors.push(`第 ${i + 1} 行：缺少 SKU 品號`);
      continue;
    }

    // 重複 SKU 警告
    if (existingSkus.has(sku)) {
      warnings.push(`第 ${i + 1} 行：SKU「${sku}」已存在，將被跳過`);
      continue;
    }

    // 分類驗證
    if (!materialClass) {
      // 嘗試自動推測
      const inferred = inferClassFromSku(sku);
      if (inferred) {
        row['material_class'] = inferred;
        classifiedCount++;
      } else {
        unclassifiedSkus.push(sku);
        warnings.push(`第 ${i + 1} 行：SKU「${sku}」無法自動推斷分類，請手動指定`);
      }
    } else if (!isValidClassCode(materialClass)) {
      errors.push(`第 ${i + 1} 行：SKU「${sku}」分類代碼「${materialClass}」不合法（僅允許 RAW/MAT/PART/COMP/SET）`);
    } else if (!isActiveClass(existingClasses, materialClass)) {
      warnings.push(`第 ${i + 1} 行：SKU「${sku}」分類「${materialClass}」目前已停用`);
    } else {
      classifiedCount++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    classifiedCount,
    unclassifiedSkus,
  };
}

// ─── 分類節點 CRUD ───────────────────────────────────────────────────────────

export interface ClassAddPayload {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  parent_code?: string;
  color?: string;
  sort_order: number;
  business_type: string;
}

export function addMaterialClass(classes: MaterialClass[], payload: ClassAddPayload): { classes: MaterialClass[]; error?: string } {
  if (!isValidClassCode(payload.code)) return { classes, error: '分類代碼不合法' };
  if (classes.some(c => c.code === payload.code)) return { classes, error: '分類代碼已存在' };

  // 若指定了 parent_code，驗證父節點存在
  if (payload.parent_code && !classes.some(c => c.code === payload.parent_code)) {
    return { classes, error: `找不到父節點：${payload.parent_code}` };
  }

  const newClass: MaterialClass = {
    code: payload.code as MaterialClassCode,
    name: payload.name,
    nameEn: payload.nameEn,
    description: payload.description,
    parent_code: payload.parent_code as MaterialClassCode | undefined,
    color: payload.color,
    sort_order: payload.sort_order,
    is_active: true,
    business_type: payload.business_type as MaterialClass['business_type'],
  };

  return { classes: [...classes, newClass] };
}

export function toggleMaterialClass(classes: MaterialClass[], code: string): MaterialClass[] {
  return classes.map(c => c.code === code ? { ...c, is_active: !c.is_active } : c);
}

// ─── 舊版 ItemMaster 相容升級 ───────────────────────────────────────────────

export function migrateItemMasterClasses(items: ItemMaster[], classes: MaterialClass[]): ItemMaster[] {
  return items.map(item => {
    if (item.material_class) return item; // 已遷移
    // 根據 category 自動對應
    const cat = (item.category ?? '').toUpperCase();
    let inferred: MaterialClassCode | null = null;
    if (['ABS', 'MABS', 'PP', 'PVC', 'PE', 'RAW', '粒'].some(k => cat.includes(k))) inferred = 'RAW';
    else if (['PKG', 'BAG', 'LABEL', 'BOX', 'MAT'].some(k => cat.includes(k))) inferred = 'MAT';
    else if (['CONN', 'VALVE', 'FITTING', 'PART', '接頭', '閥'].some(k => cat.includes(k))) inferred = 'PART';
    else if (['ASM', 'COMP', '組件'].some(k => cat.includes(k))) inferred = 'COMP';
    else if (['SET', '成品', 'SET'].some(k => cat.includes(k))) inferred = 'SET';

    return {
      ...item,
      material_class: inferred,
      material_class_label: inferred ? buildClassPath(classes, inferred) : null,
    };
  });
}

// ─── H-01 / H-02 / H-03：FK 分類校驗 ────────────────────────────────────────

/**
 * 校驗 SKU 是否屬於指定類別（H-01/H-02/H-03 共用）。
 * @param sku          待校驗料號
 * @param expected     允許的分類代碼（e.g. ['RAW']、['PART','COMP','SET']）
 * @param itemMaster   料號主檔資料
 * @returns { valid, hint }  validity 與錯誤提示
 */
function validateSkuClass(
  sku: string,
  expected: MaterialClassCode[],
  itemMaster: ItemMaster[]
): { valid: boolean; hint: string } {
  const target = itemMaster.find(i => i.sku === sku);
  if (!target) return { valid: true, hint: '' }; // FK 不存在時由呼叫端處理
  const cls = target.material_class;
  if (cls && expected.includes(cls)) return { valid: true, hint: '' };
  if (!cls) return { valid: false, hint: `料號「${sku}」尚未分類，請先至物料分類體系指定分類` };
  return { valid: false, hint: `料號「${sku}」屬於 ${cls} 類，不屬於 ${expected.join('/')} 允許範圍` };
}

/** H-01：product_mold_bom.rm_sku 僅接受 RAW 類 */
function validateRmSkuAsRaw(
  rm_sku: string, itemMaster: ItemMaster[]
): { valid: boolean; hint: string } {
  return validateSkuClass(rm_sku, ['RAW'], itemMaster);
}

/** H-02：yield_master.sku 僅接受 PART / COMP / SET 類（不含 RAW/MAT）*/
/** 說明：SET 可直接由 PART 一次組裝，無需經 COMP 入庫，故 PART/COMP/SET 均可作為良率標準品號。*/
function validateYieldSku(
  sku: string, itemMaster: ItemMaster[]
): { valid: boolean; hint: string } {
  return validateSkuClass(sku, ['PART', 'COMP', 'SET'], itemMaster);
}

/** H-03：supplier_rule_master.rm_sku 僅接受 RAW 類 */
function validateSupplierRmSku(
  rm_sku: string, itemMaster: ItemMaster[]
): { valid: boolean; hint: string } {
  return validateSkuClass(rm_sku, ['RAW'], itemMaster);
}

/** M-01：計算 po_in_transit.eta_variance_days（實際到貨 − ETA）*/
export function computeEtaVarianceDays(
  etaDate: string, actualDate: string | null | undefined
): number | null {
  if (!actualDate) return null;
  const eta = new Date(etaDate);
  const actual = new Date(actualDate);
  return Math.round((actual.getTime() - eta.getTime()) / 86400000);
}

/** M-05：檢查 BOM 有效期區間是否有重疊（同一 sku+mold_id 不允許同時有效）*/
function checkBomValidityOverlap(
  bomEntries: ProductMoldBOM[],
  testEntry: ProductMoldBOM,
  excludeId?: { sku: string; mold_id: string }
): { hasOverlap: boolean; overlappingIds: string[] } {
  const overlapping: string[] = [];
  for (const entry of bomEntries) {
    if (excludeId && entry.sku === excludeId.sku && entry.mold_id === excludeId.mold_id) continue;
    if (entry.sku !== testEntry.sku) continue;
    // 日期重疊判斷：test.valid_from <= entry.valid_to (or null) AND test.valid_to (or Infinity) >= entry.valid_from
    const testStart = new Date(testEntry.valid_from).getTime();
    const testEnd   = testEntry.valid_to ? new Date(testEntry.valid_to).getTime() : Infinity;
    const entryStart = new Date(entry.valid_from).getTime();
    const entryEnd   = entry.valid_to ? new Date(entry.valid_to).getTime() : Infinity;
    if (testStart <= entryEnd && testEnd >= entryStart) {
      overlapping.push(`${entry.sku}+${entry.mold_id}`);
    }
  }
  return { hasOverlap: overlapping.length > 0, overlappingIds: overlapping };
}
