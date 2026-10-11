const fs = require('fs');
const file = 'd:/jumla/src/features/materials/actions.ts';
let content = fs.readFileSync(file, 'utf8');

// CREATE
content = content.replace(
  `  // فحص حماية ضد التكرار: لا يجوز وجود مادة بنفس الاسم والباركود معاً
  let duplicateQuery = supabase.from('master_products').select('id').eq('name', name)
  if (barcodeRaw) {
    duplicateQuery = duplicateQuery.eq('barcode', barcodeRaw)
  } else {
    duplicateQuery = duplicateQuery.is('barcode', null)
  }`,
  `  // فحص حماية ضد التكرار المستحدث: التطابق التام في (الاسم + الوصف + الباركود)
  let duplicateQuery = supabase.from('master_products').select('id').eq('name', name)
  if (description) {
    duplicateQuery = duplicateQuery.eq('description', description)
  } else {
    duplicateQuery = duplicateQuery.is('description', null)
  }
  if (barcodeRaw) {
    duplicateQuery = duplicateQuery.eq('barcode', barcodeRaw)
  } else {
    duplicateQuery = duplicateQuery.is('barcode', null)
  }`
);

// EDIT
content = content.replace(
  `  // فحص حماية ضد التكرار (استثناء المادة الحالية)
  let duplicateQuery = supabase.from('master_products').select('id').eq('name', name).neq('id', id)
  if (barcodeRaw) {
    duplicateQuery = duplicateQuery.eq('barcode', barcodeRaw)
  } else {
    duplicateQuery = duplicateQuery.is('barcode', null)
  }`,
  `  // فحص حماية ضد التكرار (استثناء المادة الحالية)
  let duplicateQuery = supabase.from('master_products').select('id').eq('name', name).neq('id', id)
  if (description) {
    duplicateQuery = duplicateQuery.eq('description', description)
  } else {
    duplicateQuery = duplicateQuery.is('description', null)
  }
  if (barcodeRaw) {
    duplicateQuery = duplicateQuery.eq('barcode', barcodeRaw)
  } else {
    duplicateQuery = duplicateQuery.is('barcode', null)
  }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed duplicate logic in actions!');
