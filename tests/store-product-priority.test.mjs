import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import * as storeProductHelpers from "../src/app/(app)/store/[merchantId]/prioritize-selected-product.ts"

const { prioritizeSelectedProduct } = storeProductHelpers

const storeClientSource = readFileSync(
  new URL("../src/app/(app)/store/[merchantId]/store-client.tsx", import.meta.url),
  "utf8",
)
const productCardSource = readFileSync(
  new URL("../src/features/products/components/product-card.tsx", import.meta.url),
  "utf8",
)
const storePageSource = readFileSync(
  new URL("../src/app/(app)/store/[merchantId]/page.tsx", import.meta.url),
  "utf8",
)
const merchantSettingsSource = readFileSync(
  new URL("../src/features/merchant/components/merchant-settings.tsx", import.meta.url),
  "utf8",
)
const merchantProductsSource = readFileSync(
  new URL("../src/features/merchant/components/merchant-products-list.tsx", import.meta.url),
  "utf8",
)
const cartClientSource = readFileSync(
  new URL("../src/app/(app)/cart/cart-client.tsx", import.meta.url),
  "utf8",
)
const cartPageSource = readFileSync(
  new URL("../src/app/(app)/cart/page.tsx", import.meta.url),
  "utf8",
)
const rootLayoutSource = readFileSync(
  new URL("../src/app/layout.tsx", import.meta.url),
  "utf8",
)
const productExplorerSource = readFileSync(
  new URL("../src/features/products/components/product-explorer.tsx", import.meta.url),
  "utf8",
)

const products = [
  { id: "product-a", merchant_id: "merchant-1" },
  { id: "product-b", merchant_id: "merchant-1" },
  { id: "product-c", merchant_id: "merchant-1" },
]

test("moves the selected merchant product first and preserves the others' order", () => {
  const ordered = prioritizeSelectedProduct(products, "product-c")

  assert.deepEqual(ordered.map((product) => product.id), ["product-c", "product-a", "product-b"])
  assert.deepEqual(products.map((product) => product.id), ["product-a", "product-b", "product-c"])
})

test("keeps the default order when no selected product belongs to this merchant", () => {
  const ordered = prioritizeSelectedProduct(products, "not-this-merchant-product")

  assert.deepEqual(ordered.map((product) => product.id), ["product-a", "product-b", "product-c"])
})

test("keeps the default order when no product id was selected", () => {
  const ordered = prioritizeSelectedProduct(products)

  assert.deepEqual(ordered.map((product) => product.id), ["product-a", "product-b", "product-c"])
})

test("ranks products by distinct completed-invoice counts, preserving ties", () => {
  const invoiceCounts = new Map([
    ["product-a", 2],
    ["product-b", 6],
    ["product-c", 6],
  ])

  const ordered = prioritizeSelectedProduct(products, undefined, invoiceCounts)

  assert.deepEqual(ordered.map((product) => product.id), ["product-b", "product-c", "product-a"])
})

test("keeps the clicked product first, then ranks the remaining products by invoices", () => {
  const invoiceCounts = new Map([
    ["product-a", 2],
    ["product-b", 6],
    ["product-c", 6],
  ])

  const ordered = prioritizeSelectedProduct(products, "product-a", invoiceCounts)

  assert.deepEqual(ordered.map((product) => product.id), ["product-a", "product-b", "product-c"])
})

test("treats products without completed invoices as zero sales", () => {
  const invoiceCounts = new Map([["product-b", 1]])

  const ordered = prioritizeSelectedProduct(products, undefined, invoiceCounts)

  assert.deepEqual(ordered.map((product) => product.id), ["product-b", "product-a", "product-c"])
})

test("removes the redundant home button and moves store content below the global header", () => {
  assert.ok(!storeClientSource.includes("العودة للرئيسية"))
  assert.ok(!storeClientSource.includes("router.push('/')"))
  assert.ok(storeClientSource.includes("pt-[48px]"))
  assert.ok(!storeClientSource.includes("min-h-[88px]"))
})

test("does not display the merchant delivery-fee truck badge", () => {
  assert.ok(!storeClientSource.includes("merchant.delivery_fee"))
  assert.ok(!storeClientSource.includes("<Truck"))
})

test("uses the supplied shrine photo in the wholesale directory promotion", () => {
  const shrineImage = readFileSync(new URL("../public/ضريح الامام.jpeg", import.meta.url))
  const promoStart = productExplorerSource.indexOf('aria-labelledby="merchant-directory-title"')
  const promoEnd = productExplorerSource.indexOf('<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">', promoStart)
  const promoMarkup = productExplorerSource.slice(promoStart, promoEnd)

  assert.ok(shrineImage.byteLength > 0)
  assert.ok(productExplorerSource.includes('src="/ضريح الامام.jpeg"'))
  assert.ok(productExplorerSource.includes('alt="مرقد الإمام الحسين في كربلاء"'))
  assert.ok(productExplorerSource.includes("دليل <span className="))
  assert.ok(productExplorerSource.includes("تجار الجملة الكبار"))
  assert.ok(productExplorerSource.includes('aria-label="العودة للمواد"'))
  assert.ok(productExplorerSource.includes("fixed left-11 top-2"))
  assert.ok(productExplorerSource.includes('<span className="hidden min-[280px]:inline sm:hidden">المواد</span>'))
  assert.ok(productExplorerSource.includes("min-[280px]:inline"))
  assert.ok(promoMarkup.includes("flex items-center text-[7px]"))
  assert.ok(promoMarkup.includes("shrink-0 whitespace-nowrap rounded-full"))
  assert.ok(promoMarkup.includes("left-[clamp(4.5rem,calc(50vw-5.2rem),32rem)]"))
  assert.ok(promoMarkup.includes("كربلاء المقدسة"))
  assert.ok(promoMarkup.includes("خيارات متنوعة"))
  assert.ok(promoMarkup.includes("أسعار جملة"))
  assert.ok(!promoMarkup.includes("العودة للمواد"))
  assert.ok(promoMarkup.includes("min-h-[184px]"))
  assert.ok(promoMarkup.includes("min-h-[148px]"))
  assert.ok(!productExplorerSource.includes("wholesale-dome-fill"))
  assert.ok(!productExplorerSource.includes("دليل كبار مجهزي وتجار الجملة"))
})

test("filters the entire displayed product list instead of scrolling to grouped sections", () => {
  assert.ok(storeClientSource.includes("filterStoreProductsByCategory"))
  assert.ok(!storeClientSource.includes('id={`category-${cat.id}`}'))
  assert.ok(!storeClientSource.includes("scrollToCategory"))
})

test("list cards reserve one quarter for the image and retain cart controls", () => {
  assert.ok(productCardSource.includes("w-1/4"))
  assert.ok(productCardSource.includes('data-slot="product-name-price"'))
  assert.ok(productCardSource.includes("<AddToCartButton"))
})

test("aligns the cart and quantity controls to the physical left edge of every card", () => {
  assert.ok(productCardSource.includes('dir="ltr" className="flex w-full items-center justify-start border-t'))
  assert.ok(productCardSource.includes('<div dir="rtl">'))
})

test("improves small-screen product name and description readability", () => {
  assert.ok(productCardSource.includes("text-base sm:text-lg font-bold"))
  assert.ok(productCardSource.includes("text-sm sm:text-base text-muted-foreground"))
})

test("wraps long product names within their own space instead of truncating into the price", () => {
  const nameClass = productCardSource.match(/<h4 className="([^"]+)"/)?.[1] ?? ""

  assert.ok(nameClass.includes("min-w-0 flex-1"))
  assert.ok(nameClass.includes("line-clamp-2"))
  assert.ok(nameClass.includes("break-words"))
  assert.ok(!nameClass.includes("truncate"))
  assert.ok(productCardSource.includes('data-slot="product-name-price" className="flex min-w-0 items-start gap-1.5"'))
})

test("loads the server-side invoice aggregate and passes it into product ranking", () => {
  assert.ok(storePageSource.includes("get_merchant_product_invoice_counts"))
  assert.ok(storePageSource.includes("selectedProductId, invoiceCounts"))
})

test("uses the most-sold label only when the invoice aggregate is available", () => {
  assert.ok(storeClientSource.includes('name: salesRankingAvailable ? "الأكثر مبيعاً" : "المواد"'))
})

test("filters products by category id without changing their existing rank order", () => {
  assert.equal(typeof storeProductHelpers.filterStoreProductsByCategory, "function")

  const rankedProducts = [
    { id: "top-dairy", category_id: "dairy" },
    { id: "top-grocery", category_id: "grocery" },
    { id: "next-dairy", category_id: "dairy" },
  ]

  const filtered = storeProductHelpers.filterStoreProductsByCategory(rankedProducts, "dairy")
  assert.deepEqual(filtered.map((product) => product.id), ["top-dairy", "next-dairy"])
  assert.deepEqual(rankedProducts.map((product) => product.id), ["top-dairy", "top-grocery", "next-dairy"])
})

test("returns every product unchanged when no category is selected", () => {
  assert.equal(typeof storeProductHelpers.filterStoreProductsByCategory, "function")

  const rankedProducts = [
    { id: "first", category_id: null },
    { id: "second", category_id: "dairy" },
  ]

  assert.deepEqual(storeProductHelpers.filterStoreProductsByCategory(rankedProducts, null), rankedProducts)
})

test("queries category ids and names from the existing table and passes them to the supplier store", () => {
  assert.ok(storePageSource.includes(".from('categories')"))
  assert.ok(storePageSource.includes(".select('id, name')"))
  assert.ok(storePageSource.includes("categories={categories}"))
})

test("replaces keyword sections with dynamic category filter chips and scroll arrows", () => {
  assert.ok(storeClientSource.includes("categories.map"))
  assert.ok(storeClientSource.includes("filterStoreProductsByCategory"))
  assert.ok(storeClientSource.includes('aria-label="تمرير الأقسام لليمين"'))
  assert.ok(storeClientSource.includes('aria-label="تمرير الأقسام لليسار"'))
  assert.ok(!storeClientSource.includes("const CATEGORIES = ["))
  assert.ok(!storeClientSource.includes("IntersectionObserver"))
})

test("uses the compact navy floating cart banner with count and checkout action", () => {
  const cartBanner = storeClientSource
    .split("{/* Floating Go to Cart Banner */}")[1]
    ?.split("{/* نافذة تقييمات المتجر")[0] ?? ""

  assert.ok(cartBanner.includes("fixed bottom-3 sm:bottom-5 left-3 sm:left-4 right-3 sm:right-4 z-50 max-w-lg mx-auto"))
  assert.ok(cartBanner.includes('href="/cart"'))
  assert.ok(cartBanner.includes("bg-[#0c1c2e]"))
  assert.ok(cartBanner.includes("<ShoppingCart"))
  assert.ok(cartBanner.includes("لديك مشتريات في السلة"))
  assert.ok(cartBanner.includes("إتمام الطلب"))
  assert.ok(!cartBanner.includes("المجموع:"))
  assert.ok(!cartBanner.includes("عرض السلة"))
})

test("hides the native category scrollbar while retaining horizontal scrolling", () => {
  const categoryScroller = storeClientSource.match(/ref={categoriesContainerRef}[\s\S]*?className="([^"]+)"/)?.[1] ?? ""

  assert.ok(categoryScroller.includes("overflow-x-auto"))
  assert.ok(categoryScroller.includes("[-ms-overflow-style:none]"))
  assert.ok(categoryScroller.includes("[scrollbar-width:none]"))
  assert.ok(categoryScroller.includes("[&::-webkit-scrollbar]:hidden"))
  assert.ok(!categoryScroller.includes("hide-scrollbar"))
})

test("places merchant delivery fee and support phone labels beside their inputs", () => {
  const inlineRows = merchantSettingsSource.match(
    /grid grid-cols-\[auto_minmax\(0,1fr\)\] items-center gap-2/g,
  ) ?? []

  assert.equal(inlineRows.length, 3)
  assert.ok(merchantSettingsSource.includes("الحد الأدنى للمشتريات ليكون التوصيل مجاني"))
  assert.ok(merchantSettingsSource.includes("أجور التوصيل (د.ع)"))
  assert.ok(merchantSettingsSource.includes("رقم الدعم للطلبات"))
})

test("puts the merchant product search beside the list and grid view buttons", () => {
  const toolbarStart = merchantProductsSource.indexOf(
    '<div className="flex items-center gap-2 mb-2">',
  )
  const productsStart = merchantProductsSource.indexOf("!products || products.length === 0", toolbarStart)
  const toolbar = merchantProductsSource.slice(toolbarStart, productsStart)

  assert.ok(toolbarStart >= 0)
  assert.ok(productsStart > toolbarStart)
  assert.ok(toolbar.includes('placeholder="ابحث في منتجاتك باسم المنتج..."'))
  assert.ok(toolbar.includes("<List"))
  assert.ok(toolbar.includes("<LayoutGrid"))
  assert.ok(!merchantProductsSource.includes("منتجاتي ("))
})

test("places the cart title opposite the archive and tracking tabs in one shared header", () => {
  const headers = cartClientSource.match(
    /<div className="sticky top-16 z-30[\s\S]*?<span className="text-xs font-bold">تتبع مشترياتي<\/span>[\s\S]*?<\/Button>\s*<\/div>\s*<\/div>/g,
  ) ?? []

  assert.equal(headers.length, 2)
  for (const header of headers) {
    assert.ok(header.includes("flex items-center justify-between"))
    assert.ok(header.indexOf("سلة المشتريات") < header.indexOf("<Archive"))
    assert.ok(header.includes("تتبع مشترياتي"))
  }
})

test("removes the cart route's extra top padding below the announcement banner", () => {
  assert.ok(cartPageSource.includes('className="container mx-auto px-2 sm:px-4 pt-0 pb-0"'))
})

test("removes duplicate cart scroll padding while preserving the fixed-ad safe area", () => {
  assert.ok(!cartClientSource.includes("pb-[140px]"))
  assert.ok(rootLayoutSource.includes('className="flex-1 pb-28 sm:pb-36"'))
})

test("places quantity and delete controls above the item total in a compact left column", () => {
  const itemsStart = cartClientSource.indexOf("{group.items.map(item => (")
  const summaryStart = cartClientSource.indexOf("{/* ملخص المجموعة */}", itemsStart)
  const itemCards = cartClientSource.slice(itemsStart, summaryStart)
  const controlsIndex = itemCards.indexOf("{/* Left Side: Quantity & Actions */}")
  const totalIndex = itemCards.indexOf("المجموع:", controlsIndex)

  assert.ok(itemsStart >= 0)
  assert.ok(summaryStart > itemsStart)
  assert.ok(itemCards.includes("w-20 h-20"))
  assert.ok(controlsIndex >= 0)
  assert.ok(totalIndex > controlsIndex)
  assert.ok(itemCards.includes('title="حذف من السلة"'))
  assert.ok(itemCards.includes('title="زيادة"'))
  assert.ok(itemCards.includes('title="تقليل"'))
})

test("shows the rounding note beside the grand total without a separate adjustment row", () => {
  assert.ok(cartClientSource.includes("مقرباً لأقرب 250 د.ع"))
  assert.ok(!cartClientSource.includes("تقريب لأقرب 250 د.ع"))
  assert.ok(cartClientSource.includes("roundTo250(groupSubtotal + effectiveDeliveryFee)"))
})
