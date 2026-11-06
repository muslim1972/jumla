export function prioritizeSelectedProduct<T extends { id: string }>(
  products: readonly T[],
  selectedProductId?: string,
): T[] {
  if (!selectedProductId) return [...products]

  const selectedIndex = products.findIndex((product) => product.id === selectedProductId)
  if (selectedIndex <= 0) return [...products]

  return [
    products[selectedIndex],
    ...products.slice(0, selectedIndex),
    ...products.slice(selectedIndex + 1),
  ]
}
