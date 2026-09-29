const fs = require('fs');
const file = 'd:/jumla/src/features/materials/components/materials-manager.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'function MasterProductForm({',
  'export function MasterProductForm({'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Exported MasterProductForm');
