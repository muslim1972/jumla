const fs = require('fs');
const files = [
  'd:/jumla/src/app/(materials)/materials/page.tsx',
  'd:/jumla/src/app/(merchant)/dashboard/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Specifically target the master_products query
  // It looks like:
  //      supabase
  //        .from('master_products')
  //        .select('*')
  //        .order('created_at', { ascending: false })
  //        .limit(500),
  
  content = content.replace(/\.order\('created_at', \{ ascending: false \}\)[\s\n]*\.limit\(500\),/g, ".order('created_at', { ascending: false }),");
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed limit in both files');
