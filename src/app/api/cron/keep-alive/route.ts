import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic' // Ensure it's not cached

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron authentication (Optional but recommended to prevent abuse)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Connect to Supabase using Service Role Key to bypass RLS and perform a real write
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Perform a WRITE operation (Insert into audit_logs) to guarantee Supabase counts it as activity
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'system',
        record_id: 'cron_ping',
        action: 'KEEP_ALIVE_PING',
        new_data: { ping_time: new Date().toISOString() }
      });

    if (error) {
      console.error('Keep-alive cron error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database keep-alive ping successful (Write operation performed).',
      timestamp: new Date().toISOString()
    })
    
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
