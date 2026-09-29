const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<span className="font-bold text-sm truncate">{p.name}</span>',
  '<span className="font-bold text-sm whitespace-normal break-words leading-tight flex-1">{p.name}</span>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed truncation!');
