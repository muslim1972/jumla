const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const categoriesDir = path.join(__dirname, '..', 'public', 'categories');
const files = ['cat_all.jpg', 'cat_smoking.jpg', 'cat_grocery.jpg', 'cat_sweets.jpg', 'cat_plastics.jpg', 'cat_dairy.jpg', 'cat_cleaning.jpg'];

async function uploadImages() {
  console.log('Starting upload of category images to Supabase...');
  
  for (const file of files) {
    const filePath = path.join(categoriesDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${file} not found in public/categories, skipping`);
      continue;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `categories/${file}`;
    
    console.log(`Uploading ${file} to bucket 'products' at path '${storagePath}'...`);
    
    const { data, error } = await supabase.storage
      .from('products')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.error(`Failed to upload ${file}:`, error.message);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(storagePath);
      console.log(`Successfully uploaded ${file}. Public URL: ${publicUrl}`);
    }
  }
}

uploadImages().catch(console.error);
