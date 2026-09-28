require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Starting duplicate cleanup...');
  
  // 1. Get all master products
  const { data: allMasters, error } = await supabase.from('master_products').select('id, name, barcode, created_at');
  if (error) { console.error('Error fetching master products:', error); return; }

  const groups = {};
  for (const m of allMasters) {
    const key = (m.name || '').trim() + '|' + (m.barcode || '').trim();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  const duplicates = Object.values(groups).filter(g => g.length > 1);
  console.log('Duplicate groups found:', duplicates.length);
  
  let deletedCount = 0;
  let remappedCount = 0;

  for (const g of duplicates) {
    // Sort by created_at ascending (oldest first)
    g.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const keepId = g[0].id;
    const duplicateIds = g.slice(1).map(x => x.id);
    
    // Remap merchant products linking to duplicates -> to the keepId
    const { data: linkedProducts, error: linkErr } = await supabase
      .from('products')
      .select('id, master_product_id')
      .in('master_product_id', duplicateIds);
      
    if (linkErr) {
      console.error('Error fetching linked products for group', g[0].name, linkErr);
      continue;
    }
    
    if (linkedProducts && linkedProducts.length > 0) {
      const { error: updateErr } = await supabase
        .from('products')
        .update({ master_product_id: keepId })
        .in('master_product_id', duplicateIds);
        
      if (updateErr) {
        console.error('Error updating linked products:', updateErr);
        continue;
      }
      remappedCount += linkedProducts.length;
      console.log(`Remapped ${linkedProducts.length} merchant products for ${g[0].name}`);
    }

    // Now safe to delete duplicates
    const { error: delErr } = await supabase
      .from('master_products')
      .delete()
      .in('id', duplicateIds);
      
    if (delErr) {
      console.error('Error deleting duplicate master products:', delErr);
    } else {
      deletedCount += duplicateIds.length;
    }
  }

  console.log('Cleanup finished!');
  console.log(`Total duplicate master products deleted: ${deletedCount}`);
  console.log(`Total merchant products re-linked: ${remappedCount}`);
}
run();
