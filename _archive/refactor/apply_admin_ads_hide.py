# 1. Update top-announcement-bar.tsx
path_top = r"src/components/global/top-announcement-bar.tsx"
with open(path_top, "r", encoding="utf-8") as f:
    top_code = f.read()

target_top = "if (pathname === '/' || pathname?.startsWith('/store/') || pathname?.startsWith('/dashboard')) return null"
replace_top = "if (pathname === '/' || pathname?.startsWith('/store/') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) return null"

if target_top in top_code:
    top_code = top_code.replace(target_top, replace_top, 1)
    with open(path_top, "w", encoding="utf-8") as f:
        f.write(top_code)
    print("TOP BANNER: SUCCESS")
else:
    print("TOP BANNER: TARGET NOT FOUND")

# 2. Update promo-banners.tsx
path_promo = r"src/components/global/promo-banners.tsx"
with open(path_promo, "r", encoding="utf-8") as f:
    promo_code = f.read()

target_promo = "if (pathname === '/' || pathname?.startsWith('/store/') || pathname?.startsWith('/dashboard') || pathname === '/login' || pathname === '/register') return null"
replace_promo = "if (pathname === '/' || pathname?.startsWith('/store/') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname === '/login' || pathname === '/register') return null"

if target_promo in promo_code:
    promo_code = promo_code.replace(target_promo, replace_promo, 1)
    with open(path_promo, "w", encoding="utf-8") as f:
        f.write(promo_code)
    print("PROMO BANNER: SUCCESS")
else:
    print("PROMO BANNER: TARGET NOT FOUND")
