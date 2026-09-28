require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: allMasters, error } = await supabase.from('master_products').select('id, name, barcode, created_at');
  if (error) { console.error(error); return; }

  const groups = {};
  for (const m of allMasters) {
    const key = m.name + '|' + (m.barcode || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  const duplicates = Object.values(groups).filter(g => g.length > 1);
  console.log('Duplicate groups found:', duplicates.length);
  for (const g of duplicates) {
    console.log('Group:', g[0].name, '- Barcode:', g[0].barcode || 'NULL', '=> Count:', g.length);
    g.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    // Keep the first one, delete the rest
    // console.log('Keep:', g[0].id);
    // console.log('Delete:', g.slice(1).map(x => x.id).join(', '));
  }
}
run();
