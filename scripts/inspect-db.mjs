import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pxlgucipkngecsvelsaa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGd1Y2lwa25nZWNzdmVsc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTIzNDUsImV4cCI6MjA5NDMyODM0NX0.XqhTkA8W2DPcV_knfYHRH6lP_Y9g7aQ0Ozn2Gq-jOn0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectDB() {
  // Get all tables in the public schema
  const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info')
  
  if (tablesError) {
    console.log('RPC not available, trying direct query...')
    
    // Try to get info from information_schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (error) {
      console.log('Direct query failed too:', error.message)
      console.log('\n--- Trying to query known tables ---')
      
      // Try known tables
      const knownTables = ['profiles', 'products', 'cart_items', 'orders', 'order_items', 'invoices', 'delivery_assignments']
      
      for (const table of knownTables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (!error) {
          console.log(`\n✅ Table: ${table}`)
          if (data && data.length > 0) {
            console.log('  Columns:', Object.keys(data[0]).join(', '))
            console.log('  Sample:', JSON.stringify(data[0], null, 2))
          } else {
            console.log('  (empty table)')
            // Try to get column info from an empty table
            const { data: d2, error: e2 } = await supabase
              .from(table)
              .select('*')
              .limit(0)
            if (!e2) {
              console.log('  Empty result')
            }
          }
        } else {
          console.log(`\n❌ Table: ${table} - ${error.message}`)
        }
      }
    }
    return
  }
  
  console.log('Tables:', JSON.stringify(tables, null, 2))
}

inspectDB()
