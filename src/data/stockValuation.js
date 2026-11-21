export function stockValuation(products) {
  return products.reduce((result, product) => {
    if (product.active === false) return result
    const onHand = Number(product.stockQuantity || 0)
    const reserved = Number(product.reservedQuantity || 0)
    const quantity = Math.max(0, onHand - reserved)
    result.purchaseCost += quantity * Number(product.averageCost || 0)
    if (reserved > onHand) result.reservationIssues.push({ id: product.id, name: product.article || product.code || product.name || 'Unnamed product', batch: product.batchNumber || 'Unknown batch', onHand, reserved })
    if (quantity <= 0) return result
    const isTan = product.productType === 'tan'
    const rawPrice = isTan ? product.salePricePerMeter : product.salePrice
    const price = Number(rawPrice)
    const length = isTan ? Number(product.metersPerTan) : 1
    const invalidPrice = rawPrice == null || String(rawPrice).trim() === '' || !Number.isFinite(price) || price < 0
    const invalidLength = isTan && (!Number.isFinite(length) || length <= 0)
    if (invalidPrice || invalidLength) {
      result.excludedProducts.push({ id: product.id, name: product.article || product.code || product.name || 'Unnamed product', batch: product.batchNumber || 'Unknown batch', reasons: [invalidPrice && 'Missing or invalid selling price', invalidLength && 'Invalid meters per Tan'].filter(Boolean) })
    } else {
      result.sellingValue += quantity * (isTan ? length : 1) * price
    }
    return result
  }, { sellingValue: 0, purchaseCost: 0, excludedProducts: [], reservationIssues: [] })
}
