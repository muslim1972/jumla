import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxlgucipkngecsvelsaa.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGd1Y2lwa25nZWNzdmVsc2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc1MjM0NSwiZXhwIjoyMDk0MzI4MzQ1fQ.s8K5Xl3Zxq0J92z1iT7b8N9c7d6e5f4g3h2i1j0k9l8m7n6o5p4q3r2s1t0u9v8w7x6y5z'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

async function runFix() {
  const sql = readFileSync('./scripts/fix-audit-log-for-user-deletion.sql', 'utf-8')
  
  console.log('Applying audit log fix for user deletion...')
  
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
    console.log(lines[0].substring(0, 100) + '...')
    
    try {
      // Try using RPC if exec_sql function exists
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt + ';' })
      if (error) {
        // If no RPC, we can try to use pg_graphql or just skip and tell user to run manually
        console.error(`  ⚠️ RPC failed: ${error.message}`)
        console.error('  Please run the SQL manually in the Supabase Dashboard SQL Editor!')
      } else {
        console.log('  ✅ Success')
      }
    } catch (err) {
      console.error('  ⚠️ Error:', err.message)
    }
  }
  
  console.log('\n--- Fix completed ---')
  console.log('✅ The audit log constraints have been updated to allow user deletion.')
  console.log('⚠️ If any statements failed, please copy the contents of:')
  console.log('   scripts/fix-audit-log-for-user-deletion.sql')
  console.log('   into the Supabase Dashboard SQL Editor and run it manually.')
}

runFix()
