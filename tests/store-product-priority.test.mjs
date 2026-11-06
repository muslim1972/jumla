import assert from "node:assert/strict"
import test from "node:test"
import { prioritizeSelectedProduct } from "../src/app/(app)/store/[merchantId]/prioritize-selected-product.ts"

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
