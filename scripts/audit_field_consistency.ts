import fs from 'fs';
import { MASTER_TABLE_SCHEMAS } from '../src/data/masterFieldDictionary.ts';

const allFields = MASTER_TABLE_SCHEMAS.flatMap(t => t.fields);

// 1. 同名欄位分析 (Homonyms)
const byKey = new Map();
allFields.forEach(f => {
  if (!byKey.has(f.fieldKey)) byKey.set(f.fieldKey, []);
  byKey.get(f.fieldKey).push(f);
});

const homonyms = [];
for (const [key, list] of byKey.entries()) {
  if (list.length > 1) {
    // 檢查是否有型別不一致、約束衝突或定義衝突
    const dataTypes = [...new Set(list.map(f => f.dataType))];
    const labels = [...new Set(list.map(f => f.fieldLabel))];
    const isConflict = dataTypes.length > 1 || labels.length > 1;

    homonyms.push({
      fieldKey: key,
      occurrenceCount: list.length,
      tables: list.map(f => f.tableName),
      dataTypes,
      labels,
      isConflict,
      items: list.map(f => ({
        table: f.tableName,
        tableLabel: f.tableLabel,
        label: f.fieldLabel,
        type: f.dataType,
        constraint: f.constraint,
        definition: f.definition,
        plainDefinition: f.plainDefinition,
      }))
    });
  }
}

// 2. 同義異名分析 (Synonyms) - 尋找具有相同/相似業務意涵但 fieldKey 不同的欄位
const semanticGroups = {
  '客戶代碼關聯': allFields.filter(f => f.fieldKey.includes('customer') || f.fieldLabel.includes('客戶')),
  '品號關聯 (SKU)': allFields.filter(f => f.fieldKey.includes('sku') || f.fieldLabel.includes('品號')),
  '模具代碼 (Mold)': allFields.filter(f => f.fieldKey.includes('mold') || f.fieldLabel.includes('模具')),
  '數量 (Quantity)': allFields.filter(f => f.fieldKey.includes('qty') || f.fieldLabel.includes('量')),
  '日期 (Date)': allFields.filter(f => f.fieldKey.includes('date') || f.fieldLabel.includes('日')),
  '備註/說明 (Notes/Remarks)': allFields.filter(f => ['notes', 'remarks', 'description'].includes(f.fieldKey)),
  '人員代碼 (User/Operator)': allFields.filter(f => f.fieldKey.includes('created_by') || f.fieldKey.includes('operator_id')),
  '供應商名稱': allFields.filter(f => f.fieldKey.includes('supplier')),
  '狀態 (Status)': allFields.filter(f => f.fieldKey.includes('status')),
};

const report = {
  totalTables: MASTER_TABLE_SCHEMAS.length,
  totalFields: allFields.length,
  homonymSummary: homonyms,
  synonymSummary: Object.entries(semanticGroups).map(([groupName, fields]) => ({
    groupName,
    count: fields.length,
    fieldKeys: [...new Set(fields.map(f => `${f.tableName}.${f.fieldKey}`))],
    details: fields.map(f => ({
      table: f.tableName,
      key: f.fieldKey,
      label: f.fieldLabel,
      type: f.dataType,
      constraint: f.constraint,
      purpose: f.businessPurpose,
    }))
  }))
};

fs.writeFileSync('scratch_field_audit_report.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Successfully written scratch_field_audit_report.json');
