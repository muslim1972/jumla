import { createClient } from '@supabase/supabase-js'
import readline from 'readline'
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (query) => new Promise((resolve) => rl.question(query, resolve))

async function run() {
  console.log('🔄 جاري جلب الحسابات المسجلة من Supabase...')
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ حدث خطأ أثناء جلب الحسابات:', error.message)
    rl.close()
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('\n❌ لم يتم العثور على أي حسابات في جدول profiles.')
    console.log('⚠️  يرجى الذهاب إلى صفحة إنشاء حساب جديد في التطبيق وتسجيل الحساب أولاً بالاسم admin والبريد muslimalmulali@gmail.com')
    rl.close()
    return
  }

  console.log(`\n📋 تم العثور على ${profiles.length} حسابات مسجلة:\n`)
  profiles.forEach((p, idx) => {
    console.log(`[${idx + 1}] الاسم: ${p.full_name || 'مجهول'} | الصلاحية الحالية: ${p.role || 'guest'} | المعرف: ${p.id}`)
  })

  // البحث عن الحساب التلقائي ذو الاسم admin
  const defaultIndex = profiles.findIndex(p => p.full_name && p.full_name.toLowerCase() === 'admin')
  
  console.log('\n------------------------------------------------------------------')
  if (defaultIndex !== -1) {
    console.log(`👉 تم العثور تلقائياً على حساب باسم "admin" بالرقم [${defaultIndex + 1}]`)
  } else {
    console.log('⚠️  لم يتم العثور على حساب باسم "admin" بشكل تلقائي.')
  }
  
  const answer = await question(
    `\nأدخل رقم الحساب الذي تريد تعديل اسمه وصلاحياته إلى admin (أو اضغط Enter لاختيار ${defaultIndex !== -1 ? `[${defaultIndex + 1}]` : 'الحساب الأخير'}): `
  )

  let selectedIdx = defaultIndex !== -1 ? defaultIndex : 0
  if (answer.trim() !== '') {
    const parsed = parseInt(answer.trim()) - 1
    if (parsed >= 0 && parsed < profiles.length) {
      selectedIdx = parsed
    } else {
      console.log('❌ رقم غير صالح. سيتم استخدام الخيار الافتراضي.')
    }
  }

  const targetProfile = profiles[selectedIdx]
  console.log(`\n🔄 جاري تعديل الحساب (المعرف: ${targetProfile.id})...`)
  
  // تحديث الحساب ليصبح الاسم admin والصلاحية admin
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      full_name: 'admin', 
      role: 'admin' 
    })
    .eq('id', targetProfile.id)
    .select()

  if (updateError) {
    console.error('❌ فشل تحديث صلاحيات الحساب:', updateError.message)
  } else {
    console.log('\n🎉 تم التحديث بنجاح! 🎉')
    console.log(`👤 الاسم الجديد: admin`)
    console.log(`🔑 الصلاحية الجديدة: admin`)
    console.log('💡 يمكنك الآن تسجيل الدخول بالحساب muslimalmulali@gmail.com لمشاهدة لوحة التحكم كمسؤول بالكامل.')
  }

  rl.close()
}

run()
