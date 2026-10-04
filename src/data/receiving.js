export function receivingLabel(purchase) {
  if (!purchase) return ''
  if (purchase.batchNumber) return purchase.batchNumber
  const items = purchase.items || []
  const batch = items[0]?.batchNumber
  if (batch && items.every((item) => item.batchNumber === batch)) return batch
  return purchase.reference || purchase.id || ''
}

// Preview only: the backend assigns the final number while saving the bill.
export function receivingBatchPreview(supplier, date, purchases = []) {
  const code = String(supplier?.supplierCode || '').trim().toUpperCase()
  if (!code || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return ''
  const own = purchases.filter((purchase) => purchase.supplierId === supplier.id)
  let sequence = own.reduce((max, purchase) => {
    const match = receivingLabel(purchase).match(/-\d{8}-(\d+)$/)
    return Math.max(max, Number(purchase.supplierBillNumber || 0), match ? Number(match[1]) : 0)
  }, own.length) + 1
  const [year, month, day] = date.split('-')
  const used = new Set(purchases.flatMap((purchase) => [purchase.batchNumber, ...(purchase.items || []).map((item) => item.batchNumber)]).filter(Boolean).map((batch) => batch.toUpperCase()))
  let batch = `${code}-${day}${month}${year}-${String(sequence).padStart(3, '0')}`
  while (used.has(batch)) batch = `${code}-${day}${month}${year}-${String(++sequence).padStart(3, '0')}`
  return batch
}
