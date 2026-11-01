import re

# 1. Update orders-client.tsx
orders_path = r"src/app/(merchant)/dashboard/orders/orders-client.tsx"
with open(orders_path, "r", encoding="utf-8") as f:
    orders_code = f.read()

target_orders = """  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    pending: true,
    preparing: false,
    approved: false,
    delivered: false,
    cancellation: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }"""

replace_orders = """  const [activeSection, setActiveSection] = useState<string>("pending")

  const toggleSection = (key: string) => {
    setActiveSection(prev => prev === key ? "" : key)
  }

  // أكورديون أحادي حصري: بطاقة واحدة فقط تبقى مفتوحة دائماً وتغلق البقية
  const openSections = {
    pending: activeSection === "pending",
    preparing: activeSection === "preparing",
    approved: activeSection === "approved",
    delivered: activeSection === "delivered",
    cancellation: activeSection === "cancellation",
  }"""

# Normalize CRLF
orders_code_norm = orders_code.replace("\r\n", "\n")
target_orders_norm = target_orders.replace("\r\n", "\n")

if target_orders_norm in orders_code_norm:
    orders_code_norm = orders_code_norm.replace(target_orders_norm, replace_orders.replace("\r\n", "\n"), 1)
    with open(orders_path, "w", encoding="utf-8") as f:
        f.write(orders_code_norm)
    print("orders-client.tsx: SUCCESS")
else:
    print("orders-client.tsx: TARGET NOT FOUND")

# 2. Update billing-list-client.tsx
billing_path = r"src/app/(merchant)/dashboard/billing/billing-list-client.tsx"
with open(billing_path, "r", encoding="utf-8") as f:
    billing_code = f.read()

target_billing = """  const [openSections, setOpenSections] = useState<{ pending: boolean, paid: boolean }>({
    pending: pendingBillings.length > 0,
    paid: pendingBillings.length === 0,
  })

  const toggleSection = (key: 'pending' | 'paid') => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }"""

replace_billing = """  const [activeSection, setActiveSection] = useState<'pending' | 'paid' | null>(
    pendingBillings.length > 0 ? 'pending' : 'paid'
  )

  const toggleSection = (key: 'pending' | 'paid') => {
    setActiveSection(prev => prev === key ? null : key)
  }

  // أكورديون أحادي حصري: فتح إحداهما يغلق الأخرى تلقائياً
  const openSections = {
    pending: activeSection === 'pending',
    paid: activeSection === 'paid',
  }"""

billing_code_norm = billing_code.replace("\r\n", "\n")
target_billing_norm = target_billing.replace("\r\n", "\n")

if target_billing_norm in billing_code_norm:
    billing_code_norm = billing_code_norm.replace(target_billing_norm, replace_billing.replace("\r\n", "\n"), 1)
    with open(billing_path, "w", encoding="utf-8") as f:
        f.write(billing_code_norm)
    print("billing-list-client.tsx: SUCCESS")
else:
    print("billing-list-client.tsx: TARGET NOT FOUND")
