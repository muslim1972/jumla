import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic' // Ensure it's not cached

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron authentication (Optional but recommended to prevent abuse)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Connect to Supabase
    const supabase = await createClient()

    // 3. Perform a simple query to keep the database active
    // Fetching 1 row from profiles is enough to register activity
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Keep-alive cron error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database keep-alive ping successful.',
      timestamp: new Date().toISOString()
    })
    
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
