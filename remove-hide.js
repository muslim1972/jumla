const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'hideCloseButton',
  ''
);

fs.writeFileSync(file, content, 'utf8');
console.log('Removed hideCloseButton');
