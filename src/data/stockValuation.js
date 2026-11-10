export function stockValuation(products) {
  return products.reduce((result, product) => {
    const quantity = Number(product.stockQuantity || 0)
    result.purchaseCost += quantity * Number(product.averageCost || 0)
    if (quantity <= 0) return result
    const isTan = product.productType === 'tan'
    const rawPrice = isTan ? product.salePricePerMeter : product.salePrice
    const price = Number(rawPrice)
    const length = isTan ? Number(product.metersPerTan) : 1
    if (rawPrice == null || rawPrice === '' || !Number.isFinite(price) || price <= 0 || !Number.isFinite(length) || length <= 0) {
      result.missingPrices += 1
    } else {
      result.sellingValue += quantity * length * price
    }
    return result
  }, { sellingValue: 0, purchaseCost: 0, missingPrices: 0 })
}
