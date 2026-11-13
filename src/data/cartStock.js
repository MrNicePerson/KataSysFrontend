export const configuredSalePrice = (product) => Number(product.productType === 'tan' ? product.salePricePerMeter : product.salePrice)
export function refreshCartStock(items, products) {
  return items.map((item) => {
    if (item.isReturn || item.originalSaleId) return item
    const product = products.find((entry) => entry.id === item.productId)
    if (!product || product.active === false) return { ...item, availableQuantity: 0, stockUnavailable: true }
    const configuredPrice = configuredSalePrice(product)
    const changed = (item.configuredSalePrice != null && item.configuredSalePrice !== configuredPrice) || (item.productType === 'tan' && Number(item.metersPerTan) !== Number(product.metersPerTan))
    return { ...item, name: product.name, productName: product.name, code: product.code, articleNumber: product.article || product.code, batchNumber: product.batchNumber, availableQuantity: Math.max(0, Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0)), stockUnavailable: false, stockPriceChanged: item.stockPriceChanged || changed, nextStockPrice: configuredPrice, nextMetersPerTan: Number(product.metersPerTan || 0) }
  })
}
