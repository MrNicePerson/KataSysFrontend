export function planStockAdjustments(items = [], products = []) {
  return items.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId)
    if (!product) throw new Error('A stock item could not be found. Refresh the page and try again.')
    const currentAvailable = Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0)
    const difference = Number(item.countedAvailable) - currentAvailable
    return difference ? [{ productId: product.id, direction: difference > 0 ? 'add' : 'remove', quantity: Math.abs(difference) }] : []
  })
}
