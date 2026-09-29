const fs = require('fs');
const file = 'd:/jumla/src/features/materials/actions.ts';
let content = fs.readFileSync(file, 'utf8');

// Update assertMaterialsRole
content = content.replace(
  `async function assertMaterialsRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || ""
  if (!['materials', 'admin'].includes(role)) {
    return { supabase, user: null, error: "غير مصرح لك بإدارة المواد" as const }
  }`,
  `async function assertMaterialsRole(allowMerchant: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || ""
  const allowed = allowMerchant ? ['materials', 'admin', 'merchant'] : ['materials', 'admin']
  if (!allowed.includes(role)) {
    return { supabase, user: null, error: "غير مصرح لك بإدارة المواد" as const }
  }`
);

// Update createCategory
content = content.replace(
  `export async function createCategory(name: string) {
  const { supabase, error: roleError } = await assertMaterialsRole()`,
  `export async function createCategory(name: string) {
  const { supabase, error: roleError } = await assertMaterialsRole(true)`
);

// Update createMasterProduct
content = content.replace(
  `export async function createMasterProduct(formData: FormData) {
  const { supabase, user, error: roleError } = await assertMaterialsRole()`,
  `export async function createMasterProduct(formData: FormData) {
  const { supabase, user, error: roleError } = await assertMaterialsRole(true)`
);

fs.writeFileSync(file, content, 'utf8');
console.log('actions.ts updated successfully');
