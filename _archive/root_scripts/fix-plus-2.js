const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { Search, X, Loader2, AlertCircle, ChevronDown, ChevronUp, Package, Link2 } from "lucide-react"',
  'import { Search, X, Loader2, AlertCircle, ChevronDown, ChevronUp, Package, Link2, Plus } from "lucide-react"'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Plus import for real');
