const fs = require('fs');
const file = 'd:/jumla/src/features/materials/components/materials-manager.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetState = `  const [barcodeError, setBarcodeError] = useState("")`;
const replacementState = `  const [barcodeError, setBarcodeError] = useState("")
  
  // -- خاصية كشف التشابه الذكي (الحد من التكرار) --
  const [similarProducts, setSimilarProducts] = useState<{name: string, description: string | null, barcode: string | null}[]>([])
  
  useEffect(() => {
    if (!name.trim() || name.length < 3) {
      setSimilarProducts([])
      return
    }
    // استخدام setTimeout هنا حصراً لغرض (Debounce API Calls) وليس لمزامنة واجهة المستخدم
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('master_products')
        .select('name, description, barcode')
        .ilike('name', \`%\${name.trim()}%\`)
        .limit(6)
      
      let filtered = data || []
      if (initial) {
        filtered = filtered.filter(p => !(p.name === initial.name && p.description === initial.description))
      }
      setSimilarProducts(filtered)
    }, 400)
    return () => clearTimeout(timer)
  }, [name, initial])
`;

content = content.replace(targetState, replacementState);
fs.writeFileSync(file, content, 'utf8');
console.log('Added smart suggestion logic!');
