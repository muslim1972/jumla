"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, UserPlus, KeyRound, Pause, Play, Pencil, ShieldCheck } from "lucide-react"
import { createStaff, updateStaff, toggleStaffActive, resetStaffPassword } from "@/features/staff/actions"
import { generateStaffPassword, isValidStaffUsername } from "@/utils/staff"
import { STAFF_PERMISSION_LABELS, type PickerStat, type StaffPermission, type StaffMember } from "@/features/warehouse/lib/types"

interface Props {
  staff: StaffMember[]
  pickerStats: PickerStat[]
  canManage: boolean
}

export function WarehouseStaffTab({ staff, pickerStats, canManage }: Props) {
  const [isPending, startTransition] = useTransition()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [pwTarget, setPwTarget] = useState<StaffMember | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [okMsg, setOkMsg] = useState("")

  const statById = useMemo(() => new Map(pickerStats.map(s => [s.staffId, s])), [pickerStats])

  return (
    <div className="space-y-4">
      {errorMsg && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{errorMsg}</div>}
      {okMsg && <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-md font-bold">{okMsg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.map(s => {
          const stat = statById.get(s.id)
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/15 text-brand-blue flex items-center justify-center font-black text-base shrink-0">
                  {(s.full_name || "؟").trim().charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm truncate">{s.full_name || "بدون اسم"}</div>
                  <div className="text-[11px] text-muted-foreground font-bold" dir="ltr" style={{ textAlign: "right" }}>{s.username}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {s.is_active ? "نشط" : "معطّل"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {s.permissions.map(p => (
                  <span key={p} className="text-[10px] font-bold bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">
                    {STAFF_PERMISSION_LABELS[p]?.label ?? p}
                  </span>
                ))}
                {s.permissions.length === 0 && (
                  <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">بدون صلاحيات</span>
                )}
              </div>

              <div className="flex gap-4 pt-2 border-t border-dashed border-border">
                <div>
                  <div className="font-black text-sm">{stat?.pickedLists ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">قائمة تجهيز (30 يوم)</div>
                </div>
                <div>
                  <div className={`font-black text-sm ${(stat?.shortageItems ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {stat?.shortageItems ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">نقص مسجل</div>
                </div>
                <div>
                  <div className="font-black text-sm">{stat?.avgPickMinutes != null ? `${stat.avgPickMinutes} د` : "—"}</div>
                  <div className="text-[10px] text-muted-foreground">متوسط الجمع</div>
                </div>
              </div>

              {canManage && (
                <div className="flex gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditTarget(s)}>
                    <Pencil className="w-3.5 h-3.5 ml-1" /> الصلاحيات
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setPwTarget(s)}>
                    <KeyRound className="w-3.5 h-3.5 ml-1" /> كلمة المرور
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-xs ${s.is_active ? "text-destructive hover:text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}
                    disabled={isPending}
                    onClick={() => {
                      setErrorMsg("")
                      startTransition(async () => {
                        const res = await toggleStaffActive(s.id, !s.is_active)
                        if (res?.error) setErrorMsg(res.error)
                      })
                    }}
                  >
                    {s.is_active ? <><Pause className="w-3.5 h-3.5 ml-1" /> تعطيل</> : <><Play className="w-3.5 h-3.5 ml-1" /> تفعيل</>}
                  </Button>
                </div>
              )}
            </div>
          )
        })}

        {canManage && (
          <button
            onClick={() => { setErrorMsg(""); setAddOpen(true) }}
            className="rounded-2xl border-2 border-dashed border-border hover:border-brand-orange/50 p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-brand-orange transition-colors min-h-[180px]"
          >
            <UserPlus className="w-8 h-8" />
            <div className="font-black text-sm">إضافة موظف جديد</div>
            <div className="text-[11px] text-center leading-5">اسم مستخدم وكلمة مرور داخلية<br />لا يدخل إلا صفحات متجرك</div>
          </button>
        )}
      </div>

      {canManage && staff.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs text-brand-blue dark:text-brand-blue leading-6">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            الموظفون حسابات داخلية حقيقية مشفرة: لا يستطيع أحد — حتى أنت — قراءة كلمات مرورهم (إعادة تعيين فقط)،
            يُقفل الحساب مؤقتاً بعد محاولات دخول فاشلة، وتُسجَّل محاولات الدخول الفاشلة في سجل التغييرات.
          </span>
        </div>
      )}

      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditStaffDialog key={editTarget?.id ?? "none"} staff={editTarget} onClose={() => setEditTarget(null)} />
      <ResetPasswordDialog staff={pwTarget} onClose={() => setPwTarget(null)} onDone={msg => setOkMsg(msg)} />
    </div>
  )
}

function AddStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState(generateStaffPassword())
  const [showPassword, setShowPassword] = useState(true)
  const [perms, setPerms] = useState<StaffPermission[]>(["warehouse", "picking"])
  const [error, setError] = useState("")

  const togglePerm = (p: StaffPermission) =>
    setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const submit = () => {
    setError("")
    startTransition(async () => {
      const res = await createStaff(fullName, username, password, perms)
      if (res?.error) setError(res.error)
      else {
        onOpenChange(false)
        setFullName(""); setUsername(""); setPassword(generateStaffPassword()); setPerms(["warehouse", "picking"])
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onOpenChange(false); setError("") } }}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة موظف جديد</DialogTitle>
          <DialogDescription className="text-right">سيظهر ضمن فريق متجرك فقط، وكل حركة تُنسب لاسمه</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{error}</div>}

          <div className="space-y-1.5">
            <Label className="text-xs">اسم الموظف (يظهر في السجلات)</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="مثال: حسين علي جواد" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">اسم المستخدم الداخلي</Label>
            <Input dir="ltr" className="text-left font-bold" value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase())}
              placeholder="hussein.ali" />
            {username && !isValidStaffUsername(username) && (
              <p className="text-[10px] text-destructive font-bold">3–20 محرفاً لاتينياً/أرقاماً</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">كلمة المرور الداخلية</Label>
            <div className="flex gap-2">
              <Input dir="ltr" className="text-left font-bold" type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => setPassword(generateStaffPassword())}>توليد</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "إخفاء" : "إظهار"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">صلاحيات الموظف</Label>
            <div className="space-y-1.5">
              {(Object.keys(STAFF_PERMISSION_LABELS) as StaffPermission[]).map(p => (
                <label key={p} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30 cursor-pointer">
                  <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="accent-[var(--brand-orange)] w-4 h-4" />
                  <div>
                    <div className="text-xs font-black">{STAFF_PERMISSION_LABELS[p].label}</div>
                    <div className="text-[10px] text-muted-foreground">{STAFF_PERMISSION_LABELS[p].desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={submit} disabled={isPending} className="w-full font-bold">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء حساب الموظف"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditStaffDialog({ staff, onClose }: { staff: StaffMember | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  // يُعاد تركيبه بالكامل عند تغيير الموظف (key في الأب) فالتهيئة الأولى كافية
  const [fullName, setFullName] = useState(staff?.full_name ?? "")
  const [perms, setPerms] = useState<StaffPermission[]>(staff?.permissions ?? [])
  const [error, setError] = useState("")

  if (!staff) return null

  const submit = () => {
    setError("")
    startTransition(async () => {
      const res = await updateStaff(staff.id, fullName, perms)
      if (res?.error) setError(res.error)
      else onClose()
    })
  }

  return (
    <Dialog open={!!staff} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">تعديل الموظف: {staff.full_name}</DialogTitle>
          <DialogDescription className="text-right">الاسم يظهر في كل السجلات — عدّله عند الحاجة</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{error}</div>}
          <div className="space-y-1.5">
            <Label className="text-xs">الاسم</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الصلاحيات</Label>
            <div className="space-y-1.5">
              {(Object.keys(STAFF_PERMISSION_LABELS) as StaffPermission[]).map(p => (
                <label key={p} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30 cursor-pointer">
                  <input type="checkbox" checked={perms.includes(p)}
                    onChange={() => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                    className="accent-[var(--brand-orange)] w-4 h-4" />
                  <div>
                    <div className="text-xs font-black">{STAFF_PERMISSION_LABELS[p].label}</div>
                    <div className="text-[10px] text-muted-foreground">{STAFF_PERMISSION_LABELS[p].desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={isPending} className="w-full font-bold">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ staff, onClose, onDone }: { staff: StaffMember | null; onClose: () => void; onDone: (m: string) => void }) {
  const [isPending, startTransition] = useTransition()
  const [pw, setPw] = useState("")
  const [error, setError] = useState("")

  if (!staff) return null

  const submit = () => {
    setError("")
    startTransition(async () => {
      const res = await resetStaffPassword(staff.id, pw)
      if (res?.error) setError(res.error)
      else { onDone(`أُعيدت تعيين كلمة مرور ${staff.full_name} ✓`); setPw(""); onClose() }
    })
  }

  return (
    <Dialog open={!!staff} onOpenChange={v => { if (!v) { onClose(); setError("") } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">إعادة تعيين كلمة المرور</DialogTitle>
          <DialogDescription className="text-right">للموظف: {staff.full_name} ({staff.username})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-md font-bold">{error}</div>}
          <div className="space-y-1.5">
            <Label className="text-xs">كلمة المرور الجديدة (8 محارف على الأقل)</Label>
            <div className="flex gap-2">
              <Input dir="ltr" className="text-left font-bold" value={pw} onChange={e => setPw(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => setPw(generateStaffPassword())}>توليد</Button>
            </div>
          </div>
          <Button onClick={submit} disabled={isPending || pw.length < 8} className="w-full font-bold">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إعادة التعيين"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
