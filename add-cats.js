require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  await supabase.from('categories').insert([{ name: 'حليب أطفال' }, { name: 'حفاضات' }]);
  console.log('Added new categories!');
}
run();
