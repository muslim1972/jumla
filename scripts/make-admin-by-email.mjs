import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// جلب الإعدادات من ملف البيئة المحلي إن وجد
let supabaseUrl = 'https://pxlgucipkngecsvelsaa.supabase.co'
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGd1Y2lwa25nZWNzdmVsc2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTIzNDUsImV4cCI6MjA5NDMyODM0NX0.XqhTkA8W2DPcV_knfYHRH6lP_Y9g7aQ0Ozn2Gq-jOn0'

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/)
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/)
    if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim()
    if (keyMatch && keyMatch[1]) supabaseKey = keyMatch[1].trim()
  }
} catch (e) {
  // تجاهل خطأ قراءة الملف
}

const supabase = createClient(supabaseUrl, supabaseKey)

// معرف الحساب الخاص بالبريد muslimalmulali@gmail.com (الذي كان اسمه مسلم عقيل ولديه المعرف أدناه)
const TARGET_PROFILE_ID = 'd0eeb260-ca37-4b10-887c-737f7ac12913'

async function makeAdminByEmail() {
  console.log(`🔄 جاري ترقية الحساب ذو المعرف ${TARGET_PROFILE_ID} (muslimalmulali@gmail.com)...`)

  // تحديث الحساب ليصبح الاسم admin والصلاحية admin
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      full_name: 'admin', 
      role: 'admin' 
    })
    .eq('id', TARGET_PROFILE_ID)
    .select()

  if (error) {
    console.error('❌ فشل تحديث صلاحيات الحساب:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('\n🎉 تم الترقية بنجاح! 🎉')
    console.log(`👤 الاسم الجديد في profiles: ${data[0].full_name}`)
    console.log(`🔑 الصلاحية الجديدة في profiles: ${data[0].role}`)
    console.log('💡 يمكنك الآن تسجيل الدخول بالحساب muslimalmulali@gmail.com لمشاهدة لوحة التحكم كمسؤول بالكامل.')
  } else {
    console.log('❌ لم يتم العثور على الحساب المستهدف. يرجى التحقق من وجود الحساب في جدول profiles.')
  }
}

makeAdminByEmail()
