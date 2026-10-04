import { receivingLabel } from './receiving.js'

export function receivingForProduct(product, purchases = []) {
  const linked = product.purchaseId && purchases.find((purchase) => purchase.id === product.purchaseId)
  const purchase = linked || purchases.find((entry) =>
    receivingLabel(entry) === product.batchNumber &&
    entry.supplierId === product.supplierId &&
    (entry.items || []).some((item) => item.productId === product.id),
  )
  if (!purchase) return null
  const lines = (purchase.items || []).filter((item) => item.productId === product.id)
  return { purchase, quantity: lines.reduce((sum, item) => sum + Number(item.quantity || 0), 0) }
}
