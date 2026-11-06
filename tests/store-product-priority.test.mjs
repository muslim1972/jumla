import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { prioritizeSelectedProduct } from "../src/app/(app)/store/[merchantId]/prioritize-selected-product.ts"

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

test("reserves mobile space below the fixed global header for store navigation", () => {
  assert.ok(storeClientSource.includes("pt-[44px]"))
  assert.ok(storeClientSource.includes("min-h-[88px]"))
})

test("does not display the merchant delivery-fee truck badge", () => {
  assert.ok(!storeClientSource.includes("merchant.delivery_fee"))
  assert.ok(!storeClientSource.includes("<Truck"))
})

test("removes the standalone popular section heading but keeps its anchor", () => {
  assert.ok(storeClientSource.includes('cat.id !== "popular" && ('))
  assert.ok(storeClientSource.includes("id={`category-${cat.id}`}"))
})

test("list cards reserve one quarter for the image and retain cart controls", () => {
  assert.ok(productCardSource.includes("w-1/4"))
  assert.ok(productCardSource.includes('data-slot="product-name-price"'))
  assert.ok(productCardSource.includes("<AddToCartButton"))
})

test("loads the server-side invoice aggregate and passes it into product ranking", () => {
  assert.ok(storePageSource.includes("get_merchant_product_invoice_counts"))
  assert.ok(storePageSource.includes("selectedProductId, invoiceCounts"))
})

test("shows the most-sold label only when the aggregate query succeeds", () => {
  assert.ok(storeClientSource.includes('name: salesRankingAvailable ? "الأكثر مبيعاً" : "المواد"'))
})
