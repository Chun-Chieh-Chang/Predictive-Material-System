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
const SKU_PREFIX_RULES: Record<MaterialClassCode, string[]> = {
  RAW:  ['RM-', 'RAW-', 'MABS-', 'PP-', 'PVC-', 'PE-', 'CB-', 'CP-', 'COLOR-'],
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

/** 檢查分類是否存在且啟用（內部使用） */
function isActiveClass(classes: MaterialClass[], code: string): boolean {
  return classes.some(c => c.code === code && c.is_active);
}

/** 取得分類樹階層深度（RAW = 1, 遞增）（內部使用） */
function getClassDepth(classes: MaterialClass[], code: string): number {
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
function inferClassFromSku(sku: string, customPrefixRules?: Partial<Record<MaterialClassCode, string[]>>): MaterialClassCode | null {
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

// ─── H-01 / H-02 / H-03：FK 分類校驗 ────────────────────────────────────────
// 備註：validateRmSkuAsRaw / validateYieldSku / validateSupplierRmSku 已於 2026-08-22 移除
// （H-01/H-02/H-03 規格尚未接入 handleSave，為保留功能暫留於 spec，待 MRP 完整整合後啟用）
