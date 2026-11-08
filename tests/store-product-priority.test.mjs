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

test("hides the native category scrollbar while retaining horizontal scrolling", () => {
  const categoryScroller = storeClientSource.match(/ref={categoriesContainerRef}[\s\S]*?className="([^"]+)"/)?.[1] ?? ""

  assert.ok(categoryScroller.includes("overflow-x-auto"))
  assert.ok(categoryScroller.includes("[-ms-overflow-style:none]"))
  assert.ok(categoryScroller.includes("[scrollbar-width:none]"))
  assert.ok(categoryScroller.includes("[&::-webkit-scrollbar]:hidden"))
  assert.ok(!categoryScroller.includes("hide-scrollbar"))
})
