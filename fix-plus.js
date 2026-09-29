const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { Plus')) {
  content = content.replace(
    'import { Package, Search, X, ChevronDown, ChevronUp } from "lucide-react"',
    'import { Package, Search, X, ChevronDown, ChevronUp, Plus } from "lucide-react"'
  );
} else {
  // If the import statement is different, just inject it
  content = content.replace(
    'import { Package,',
    'import { Plus, Package,'
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Plus import');
