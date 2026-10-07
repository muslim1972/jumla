const fs = require('fs');
const file = 'd:/jumla/src/features/warehouse/components/warehouse-add-item.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove " — تُشارك بالكتالوج منسوبة إليك"
content = content.replace(
  'من مواد التطبيق (الكتالوج المركزي) أو مادة جديدة منك — تُشارك بالكتالوج منسوبة إليك',
  'من مواد التطبيق (الكتالوج المركزي) أو إضافة مادة جديدة'
);

content = content.replace(
  '<div className="text-xs font-black text-brand-blue dark:text-brand-blue">المادة تُسجَّل في الكتالوج المركزي منسوبة إليك</div>',
  '<div className="text-xs font-black text-brand-blue dark:text-brand-blue">المادة تُسجَّل في الكتالوج المركزي</div>'
);

content = content.replace(
  'أما <b>أسعارك ورصيدك وحدّ التنبيه فتبقى خاصة بك وحدك ولا تُنشر أبداً</b>.',
  'الأسعار والرصيد وحدّ التنبيه تبقى خاصة بك وحدك ولا تُنشر.'
);

// 2. Change search logic to show ALL matching items, not just unlinked ones.
content = content.replace(
  'const unlinked = useMemo(() => pool.filter(p => !linkedMasterIds.has(p.id)), [pool, linkedMasterIds])',
  'const unlinked = useMemo(() => pool, [pool]) // Show all to avoid confusion, disable linked ones below'
);

// 3. Update the UI for results to show "Already added" badge and disable button if linked.
// Let's find where it renders `results.map(p => ...)`
fs.writeFileSync(file, content, 'utf8');
console.log('Part 1 updated');
