<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# دستور وقواعد مشروع جملتي (Jumla) — تُطبَّق تلقائياً في كل جلسة

تطبيق إنتاجي: منصة تجارة الجملة المتكاملة (Next.js 16 App Router + React 19 + Supabase Cloud + Vercel). مستخدمون وتجار حقيقيون — كل تعديل يُتابع أثره في كامل النظام.

> **أولاً في كل جلسة:** اقرأ `.agents/skills/jumla-architecture/SKILL.md` (الهيكل المرقّم، التقدم، القرارات) ثم `bricks/ARCHITECTURE.md` و `bricks/BRICKS.md`. وحدّث الـSkill بالإلحاق بعد كل خطوة يُعتد بها.

> **لا مجاملة أبداً:** العلم والحقيقة والصحيح برمجياً هو الحاكم، لا ما يطرحه المستخدم. إن كان في طلبه خطأ تقني أو أمني أو معماري فاعترض صراحةً وبيّن السبب والبديل والكلفة، ثم يقرّر هو وهو على بيّنة تامة. لا تنفّذ ما تراه خطأً بصمت، ولا تعِد بما لم يُنجز، ولا تصف عملاً ناقصاً بأنه مكتمل.

> **المؤقتات:** أي ملف فحص/تشخيص/ترقيع يُكتب في `_archive/<النوع>/` (انظر `_archive/README.md`) — يُمنع كلياً إنشاء ملفات حرة في الجذر أو في `src/`.

---

## سير النشر والتحقق المعتمد (الوحيد — لا تخترع بديلاً)

قبل أي اعتماد (`git commit`) أو دفع للإنتاج (`git push` نحو Vercel):

0. **حارس الطابوق (إجباري):**
```powershell
node scripts/verify-bricks.mjs
```
> يفشل إن فُقد ملف مملوك لطابوقة أو تكررت الملكية أو وُجد ملف يتيم في `src/`. يذكر اسم الطابوقة والملف. بعد أي تعديل معتمد يتم تحديث البصمات: `node scripts/verify-bricks.mjs --snapshot`.

1. **فحص الأنواع الصارم (إجباري):**
```powershell
npx tsc --noEmit
```
> لا يُقبل أي خطأ نوع جديد في الملفات المعدلة إطلاقاً.

2. **بناء الإنتاج والتحقق من التوافقية (إجباري):**
```powershell
npm run build
```
> يتحقق محلياً مع Turbopack من سلامة كل الـ Pages، Server Actions، و Middleware قبل الوصول لـ Vercel.

3. **النشر والاعتماد:**
- النشر يتم عبر Vercel تلقائياً عند الدفع لفرع `main`.
- لا يُدفع أي كود إلا بعد نجاح الخطوات (0 و 1 و 2) محلياً.

---

## ضوابط وحقائق المنظومة (ثابتة في كل المراحل)

1. **قاعدة بيانات Supabase Cloud (Free Tier):**
   - الحساب مجاني **لا يوفر نسخاً احتياطياً تلقائياً (Point-in-Time Recovery)**.
   - يُمنع منعاً باتاً التخمين في استعلامات SQL أو جداول DB أو دوال RPC.
   - أي تعديل في الـ Schema يجب توثيقه في ملف ترحيل تحت `scripts/` ومسجل في الطابوق المعني قبل تنفيذه.
   - الالتزام التام بسياسات الحماية على مستوى الصفوف (RLS) ومطابقة الأدوار (`admin`, `merchant`, `buyer`, `delivery`).

2. **عزل المكونات والواجهات:**
   - يمنع استخدام `setTimeout` لمزامنة الواجهات أو التحكم في التركيز؛ الاعتماد على دورة حياة React ومؤشرات التحميل الطبيعية و Server Actions.
   - العزل التام بين الميزات في مجلد `src/features/` عبر خطافات (hooks) ومكونات مستقلة.
   - احترام بيئة Next.js 16 (فصل واضح بين `use client` و Server Components).

3. **الأداء والامتثال:**
   - الالتزام الصارم بممارسات `.agents/skills/vercel-react-best-practices`.
   - استجابة سريعة، كود نظيف، توثيق دقيق، وصفر ثغرات أمنية.
