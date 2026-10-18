import { receivingLabel } from './receiving.js'

export function receivingForProduct(product, purchases = []) {
  const linked = product.purchaseId && purchases.find((purchase) => purchase.id === product.purchaseId)
  const productCodes = [product.code, product.articleNumber, product.article].filter(Boolean).map((value) => String(value).trim().toLowerCase())
  const matchesLine = (item, entry) => {
    if (item.productId === product.id) return true
    if (item.productId || !productCodes.length) return false
    const itemCodes = [item.code, item.articleNumber, item.article, item.productName, item.name].filter(Boolean).map((value) => String(value).trim().toLowerCase())
    const sameItem = itemCodes.some((value) => productCodes.includes(value))
    const itemBatch = item.batchNumber || receivingLabel(entry)
    return sameItem && (!product.batchNumber || !itemBatch || itemBatch === product.batchNumber)
  }
  const matchesPurchase = (entry) =>
    (entry.items || []).some((item) => matchesLine(item, entry)) &&
    (!product.supplierId || entry.supplierId === product.supplierId) &&
    (!product.batchNumber || !receivingLabel(entry) || receivingLabel(entry) === product.batchNumber)
  const purchase = linked || purchases.find(matchesPurchase)
  if (!purchase) return null
  const lines = (purchase.items || []).filter((item) => matchesLine(item, purchase))
  return { purchase, quantity: lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0) }
}
