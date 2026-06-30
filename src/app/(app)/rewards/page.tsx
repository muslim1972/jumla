import { getUserRewards } from "./actions"
import { Award, Star, Zap, TrendingUp, Gift, ChevronLeft, Lock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "المكافآت | جملتي",
}

export default async function RewardsPage() {
  const { profile, history, error } = await getUserRewards()

  if (error || !profile) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-muted-foreground">
        <p>عذراً، يجب تسجيل الدخول لرؤية المكافآت.</p>
      </div>
    )
  }

  const { points, lifetime_points, tier, role } = profile

  // Tier configuration
  const tiers = [
    { name: 'bronze', label: 'برونزي', min: 0, max: 1000, color: 'from-orange-400 to-amber-600', text: 'text-amber-700 dark:text-amber-500', icon: Star },
    { name: 'silver', label: 'فضي', min: 1000, max: 5000, color: 'from-slate-300 to-slate-500', text: 'text-slate-600 dark:text-slate-400', icon: Zap },
    { name: 'gold', label: 'ذهبي', min: 5000, max: 10000, color: 'from-yellow-300 to-yellow-500', text: 'text-yellow-600', icon: Award },
    { name: 'platinum', label: 'ماسي', min: 10000, max: Infinity, color: 'from-cyan-300 to-blue-600', text: 'text-cyan-600', icon: Gift },
  ]

  const currentTierIndex = tiers.findIndex(t => t.name === (tier || 'bronze'))
  const currentTier = tiers[currentTierIndex] || tiers[0]
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null

  const progressPercentage = nextTier 
    ? Math.min(100, Math.max(0, ((lifetime_points - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
    : 100

  // Role based rewards catalog
  const rewardsCatalog = role === 'merchant' ? [
    { title: 'إعلان مجاني لمدة أسبوع', points: 2000, icon: TrendingUp, desc: 'ابرز متجرك في الصفحة الرئيسية للمشترين.' },
    { title: 'تخفيض العمولة 1%', points: 5000, icon: Zap, desc: 'احصل على تخفيض في عمولة التطبيق على مبيعاتك القادمة.' }
  ] : [
    { title: 'رصيد في المحفظة (5,000 د.ع)', points: 1500, icon: Gift, desc: 'حول نقاطك إلى رصيد حقيقي في محفظتك.' },
    { title: 'خصم 10% على فاتورتك القادمة', points: 3000, icon: Award, desc: 'احصل على خصم فوري عند الطلب من أي تاجر.' }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header section with Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white shadow-2xl">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", currentTier.color)}></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        {/* Back Button */}
        <div className="absolute top-6 right-6 z-20">
          <Link 
            href={role === 'merchant' ? "/dashboard" : "/"}
            className="flex items-center gap-2 bg-white/95 hover:bg-white text-brand-orange px-4 py-2 rounded-full shadow-xl transition-all hover:scale-105 border border-white/20"
          >
            <ChevronLeft className="w-5 h-5 rotate-180" />
            <span className="font-bold text-sm">العودة</span>
          </Link>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-right">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
              <currentTier.icon className="w-10 h-10 animate-pulse" />
              مكافآت جملتي
            </h1>
            <p className="text-white/90 text-lg">
              أنت الآن في المستوى <strong className="bg-white/20 px-3 py-1 rounded-full">{currentTier.label}</strong>
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-inner text-center min-w-[200px]">
            <p className="text-white/80 text-sm font-medium mb-1">نقاطك الحالية</p>
            <div className="text-5xl font-black tracking-tighter">{points?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="bg-card rounded-3xl p-6 sm:p-8 border shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">التقدم نحو المستوى <span className={cn("font-bold", nextTier.text)}>{nextTier.label}</span></p>
              <h3 className="text-xl font-bold">{lifetime_points?.toLocaleString() || 0} / {nextTier.min.toLocaleString()} نقطة</h3>
            </div>
            <nextTier.icon className={cn("w-12 h-12 opacity-20 absolute left-8 bottom-8", nextTier.text)} />
          </div>
          <div className="h-4 w-full bg-muted rounded-full overflow-hidden shadow-inner">
            <div 
              className={cn("h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r", nextTier.color)}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            تبقّى لك {((nextTier.min) - (lifetime_points || 0)).toLocaleString()} نقطة للترقية!
          </p>
        </div>
      )}

      {/* Rewards Catalog */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="text-brand-orange" />
          مكافآت يمكنك الحصول عليها
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewardsCatalog.map((reward, idx) => {
            const canAfford = (points || 0) >= reward.points
            return (
              <div 
                key={idx} 
                className={cn(
                  "p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden group",
                  canAfford 
                    ? "bg-card hover:shadow-lg hover:-translate-y-1 hover:border-brand-blue/30 cursor-pointer" 
                    : "bg-muted/30 opacity-70 cursor-not-allowed"
                )}
              >
                {!canAfford && (
                  <div className="absolute top-4 left-4 p-2 bg-background rounded-full shadow-sm">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                  canAfford ? "bg-brand-blue/10 text-brand-blue group-hover:bg-brand-blue group-hover:text-white" : "bg-muted text-muted-foreground"
                )}>
                  <reward.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{reward.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{reward.desc}</p>
                
                <div className="mt-auto pt-4 border-t flex justify-between items-center">
                  <span className={cn("font-black", canAfford ? "text-brand-orange" : "text-muted-foreground")}>
                    {reward.points.toLocaleString()} نقطة
                  </span>
                  <button 
                    disabled={!canAfford}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      canAfford 
                        ? "bg-brand-orange text-white hover:bg-brand-orange/90 hover:shadow-md" 
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    استبدل الآن
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-bold">سجل النقاط</h2>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {history.map((record: any, idx: number) => (
              <div key={record.id} className={cn(
                "p-4 flex items-center justify-between",
                idx !== history.length - 1 && "border-b"
              )}>
                <div>
                  <p className="font-medium text-sm">{record.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(record.created_at).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
                <span className={cn(
                  "font-bold font-mono",
                  record.points_change > 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {record.points_change > 0 ? '+' : ''}{record.points_change}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  )
}
