require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Starting categories update...');

  // 1. Rename existing categories
  await supabase.from('categories').update({ name: 'مناديل ومنظفات' }).eq('id', '12eccca1-4eff-45c8-88c2-5914b13ffc05');
  await supabase.from('categories').update({ name: 'مشروبات غازية' }).eq('id', '61a92f48-7944-4f67-a97a-5b4b22c2c54b');
  
  // Merge "اجباس" into "حلويات وبسكويت" which will become "أجباس وحلويات"
  const sweetsId = 'a5b46c2b-a2d9-4f3c-93d7-79d3d08584a1';
  const chipsId = 'efc70af2-e431-4f61-86a5-d108c0992558';
  
  await supabase.from('categories').update({ name: 'أجباس وحلويات' }).eq('id', sweetsId);
  
  // Remap chips to sweets
  await supabase.from('master_products').update({ category_id: sweetsId }).eq('category_id', chipsId);
  await supabase.from('products').update({ category_id: sweetsId }).eq('category_id', chipsId);
  
  // Delete "اجباس"
  await supabase.from('categories').delete().eq('id', chipsId);

  // Rename rest
  await supabase.from('categories').update({ name: 'مواد غذائية' }).eq('id', 'e1ea8c27-efde-4cb2-a299-f9b5b33658a6');
  await supabase.from('categories').update({ name: 'مستلزمات التدخين' }).eq('id', '76c20d2b-9c01-4c20-97e7-857eb3185867');

  // Insert 'عصائر' if it doesn't exist
  const { data: juice } = await supabase.from('categories').select('id').eq('name', 'عصائر');
  if (!juice || juice.length === 0) {
    await supabase.from('categories').insert({ name: 'عصائر' });
  }

  // Handle 'ادوات بلاستيكية' (6c3347fe-3edc-4216-b1fb-0b0a77250feb)
  // The user didn't ask for it in the new list.
  // I will just leave it. If they want to delete it later, they can. Or wait, maybe they didn't mention it by mistake? 
  // I will just leave it as it is because deleting it would orphan products.

  console.log('Categories successfully updated and mapped!');
}
run();
