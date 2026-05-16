import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://pxlgucipkngecsvelsaa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGd1Y2lwa25nZWNzdmVsc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTIzNDUsImV4cCI6MjA5NDMyODM0NX0.XqhTkA8W2DPcV_knfYHRH6lP_Y9g7aQ0Ozn2Gq-jOn0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const sql = readFileSync('./scripts/create-orders-tables.sql', 'utf-8')
  
  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Found ${statements.length} SQL statements to execute`)
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    // Skip pure comment blocks
    const lines = stmt.split('\n').filter(l => !l.trim().startsWith('--') && l.trim().length > 0)
    if (lines.length === 0) continue
    
    console.log(`\nExecuting statement ${i + 1}...`)
    console.log(lines[0].substring(0, 80) + '...')
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' })
    if (error) {
      // Try direct approach
      console.log(`  RPC failed: ${error.message}`)
      console.log('  Trying alternative approach...')
    } else {
      console.log('  ✅ Success')
    }
  }
  
  console.log('\n--- Verifying tables ---')
  
  // Check if orders table exists
  const { data: ordersCheck, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .limit(0)
  
  if (ordersErr) {
    console.log('❌ orders table NOT found:', ordersErr.message)
    console.log('\n⚠️  You need to run the SQL script manually in the Supabase Dashboard:')
    console.log('   1. Go to https://supabase.com/dashboard/project/pxlgucipkngecsvelsaa')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Paste the contents of scripts/create-orders-tables.sql')
    console.log('   4. Click Run')
  } else {
    console.log('✅ orders table exists')
  }
  
  const { data: itemsCheck, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .limit(0)
  
  if (itemsErr) {
    console.log('❌ order_items table NOT found:', itemsErr.message)
  } else {
    console.log('✅ order_items table exists')
  }
}

runMigration()
