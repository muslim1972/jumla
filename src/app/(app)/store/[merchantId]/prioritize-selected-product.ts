export function prioritizeSelectedProduct<T extends { id: string }>(
  products: readonly T[],
  selectedProductId?: string,
  invoiceCounts: ReadonlyMap<string, number> = new Map(),
): T[] {
  const rankedProducts = products
    .map((product, index) => ({
      product,
      index,
      invoiceCount: invoiceCounts.get(product.id) ?? 0,
    }))
    .sort((a, b) => b.invoiceCount - a.invoiceCount || a.index - b.index)
    .map(({ product }) => product)

  if (!selectedProductId) return rankedProducts

  const selectedIndex = rankedProducts.findIndex((product) => product.id === selectedProductId)
  if (selectedIndex <= 0) return rankedProducts

  return [
    rankedProducts[selectedIndex],
    ...rankedProducts.slice(0, selectedIndex),
    ...rankedProducts.slice(selectedIndex + 1),
  ]
}

export function filterStoreProductsByCategory<T extends { category_id?: string | null }>(
  products: readonly T[],
  categoryId: string | null,
): readonly T[] {
  if (categoryId === null) return products
  return products.filter((product) => product.category_id === categoryId)
}
