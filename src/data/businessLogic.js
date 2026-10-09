import { receivingLabel, receivingBatchPreview } from './receiving.js'

export const APP_DB_VERSION = 2

export function createEmptyDatabase() {
  return {
    version: APP_DB_VERSION,
    products: [],
    categories: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    returns: [],
    supplierReturns: [],
    payments: [],
    cheques: [],
    expenses: [],
    heldOrders: [],
    claims: [],
    stockMovements: [],
    stockAudits: [],
    dailyClosings: [],
    settings: {},
    business: {},
    counters: {},
    auditHistory: [],
    financeEntries: [],
    installments: [],
    bankAccounts: [],
    bankTransactions: [],
    bankBalanceRecords: [],
  }
}

const now = () => new Date().toISOString()
export const localDateString = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateOf = (value) => value || localDateString()
const amountOf = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amounts must be zero or greater.')
  return amount
}
const positiveQuantity = (value) => {
  const quantity = Number(value)
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.')
  return quantity
}
const nonnegativeWholeQuantity = (value) => {
  const quantity = Number(value)
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Stock quantity must be a non-negative whole number.')
  return quantity
}
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
const record = (prefix, values) => ({ id: makeId(prefix), createdAt: now(), ...values })

function addAudit(database, type, referenceId, description) {
  return [...database.auditHistory, record('audit', { type, referenceId, description, date: now() })]
}

function updateBalance(rows, id, delta) {
  if (!id) return rows
  let found = false
  const updated = rows.map((row) => {
    if (row.id !== id) return row
    found = true
    return { ...row, balance: Number(row.balance ?? row.openingBalance ?? 0) + delta }
  })
  if (!found) throw new Error('The selected account could not be found.')
  return updated
}

function getProduct(products, item) {
  let product
  if (item.productId) {
    product = products.find((entry) => entry.id === item.productId)
    if (!product) throw new Error('The selected stock item could not be found. Refresh the item list and choose it again.')
  } else {
    const code = String(item.productCode ?? item.code ?? '').trim().toLowerCase()
    const name = String(item.name ?? item.productName ?? '').trim().toLowerCase()
    const matches = code ? products.filter((entry) => entry.code?.trim().toLowerCase() === code) : products.filter((entry) => entry.name?.trim().toLowerCase() === name)
    if (matches.length > 1) throw new Error('This article exists in multiple stock batches. Select the exact batch before continuing.')
    product = matches[0]
  }
  if (!product) throw new Error(`Product “${item.name ?? item.productName ?? item.code ?? 'unknown'}” was not found in stock.`)
  if (product.active === false) throw new Error(`${product.name} is inactive and cannot be sold.`)
  return product
}

function addMovement(database, { productId, type, quantity, referenceId, date, note }) {
  return [...database.stockMovements, record('move', { productId, type, quantity, referenceId, date, note })]
}

function addPayment(database, payment) {
  return [...database.payments, record('payment', { date: dateOf(payment.date), createdAt: now(), ...payment })]
}

function validateSplits(total, payments) {
  const cash = amountOf(payments?.cash ?? 0)
  const bank = amountOf(payments?.bank ?? 0)
  const cheque = amountOf(payments?.cheque ?? 0)
  if (cash + bank > total + 0.005) throw new Error('Cash and bank payments cannot exceed the bill total.')
  if (cheque > total + 0.005) throw new Error('Cheque amount cannot exceed the bill total.')
  return { cash, bank, cheque, credit: Math.max(0, total - cash - bank) }
}

export function createSale(database, input) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('Add at least one item before saving the sale.')
  const saleInputs = input.items.filter((item) => !item.isReturn)
  const returnInputs = input.items.filter((item) => item.isReturn || item.returnQuantity)
  const saleItems = saleInputs.map((item) => {
    const quantity = positiveQuantity(item.quantity)
    const product = getProduct(database.products, item)
    const unitPrice = amountOf(item.price ?? item.unitPrice ?? product.salePrice)
    const reserved = Number(product.reservedQuantity || 0)
    if (Number(product.stockQuantity || 0) - reserved < quantity) throw new Error(`Not enough available stock for ${product.name}.`)
    return { lineId: makeId('line'), productId: product.id, code: product.code ?? '', name: product.name, quantity, price: unitPrice, unitPrice, unitCostAtSale: Number(product.averageCost || 0), lineTotal: quantity * unitPrice }
  })
  const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0)
  for (const product of database.products) {
    const requested = saleItems.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)
    if (Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0) < requested) throw new Error(`Not enough available stock for ${product.name}.`)
  }
  const returnItems = returnInputs.map((item) => {
    const originalSale = database.sales.find((sale) => sale.id === item.originalSaleId && (!input.customerId || sale.customerId === input.customerId))
    if (!originalSale) throw new Error('Each cart return must be linked to a previous sale for this customer.')
    const originalItem = item.originalSaleLineId
      ? originalSale.items.find((entry) => entry.lineId === item.originalSaleLineId)
      : originalSale.items.find((entry) => entry.productId === item.productId || entry.code === item.returnCode)
    if (!originalItem) throw new Error('The returned item is not on the linked sale.')
    const quantity = positiveQuantity(item.returnQuantity ?? item.quantity)
    const alreadyReturned = database.returns.filter((entry) => entry.saleId === originalSale.id && (entry.lineId ? entry.lineId === originalItem.lineId : entry.productId === originalItem.productId)).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    if (alreadyReturned + quantity > originalItem.quantity) throw new Error('Return quantity exceeds the amount sold and not yet returned.')
    return { originalSale, originalItem, quantity, condition: item.returnCondition || 'sellable', amount: quantity * Number(originalItem.unitPrice ?? originalItem.price ?? 0) }
  })
  for (let i = 0; i < returnItems.length; i += 1) {
    const current = returnItems.slice(0, i).filter((entry) => entry.originalItem.lineId === returnItems[i].originalItem.lineId && entry.originalSale.id === returnItems[i].originalSale.id).reduce((sum, entry) => sum + entry.quantity, 0)
    const already = database.returns.filter((entry) => entry.saleId === returnItems[i].originalSale.id && entry.lineId === returnItems[i].originalItem.lineId).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    if (already + current + returnItems[i].quantity > returnItems[i].originalItem.quantity) throw new Error('Combined return quantities exceed the amount sold.')
  }
  const discount = amountOf(input.discount ?? 0)
  if (discount > subtotal) throw new Error('Discount cannot exceed the subtotal.')
  const returnTotal = returnItems.reduce((sum, item) => sum + item.amount, 0)
  const total = subtotal - discount - returnTotal
  if (total < 0) throw new Error('Returns cannot exceed the new sale total. Process a cash or khata refund from Customer returns instead.')
  const split = validateSplits(total, input.payments)
  if (split.cash + split.bank + split.cheque > total + 0.005) throw new Error('Combined cash, bank and cheque payments cannot exceed the bill total.')
  if (split.credit > 0 && !input.customerId) throw new Error('Choose a customer before saving a sale with an unpaid balance.')
  const sale = record('sale', {
    number: input.number,
    date: dateOf(input.date),
    customerId: input.customerId || null,
    customer: input.customer || database.customers.find((entry) => entry.id === input.customerId)?.name || '',
    customerDetails: input.customerDetails || null,
    customerPhone: input.customerPhone || '',
    customerAddress: input.customerAddress || '',
    padInvoiceNumber: input.padInvoiceNumber || input.paidInvoiceNumber || '',
    items: [...saleItems, ...returnItems.map(({ originalSale, originalItem, quantity, condition, amount }) => ({ lineId: makeId('line'), productId: originalItem.productId, code: originalItem.code, name: `Return · ${originalItem.name}`, quantity, price: -amount / quantity, unitPrice: -amount / quantity, unitCostAtSale: Number(originalItem.unitCostAtSale || 0), lineTotal: -amount, isReturn: true, returnCondition: condition, originalSaleId: originalSale.id, originalSaleLineId: originalItem.lineId }))],
    subtotal,
    discount,
    returnTotal,
    total,
    payments: { cash: split.cash, bank: split.bank, cheque: split.cheque },
    paid: split.cash + split.bank,
    due: split.credit,
    paymentDue: input.paymentDue || '',
    status: split.credit > 0 ? 'credit' : 'paid',
  })
  let products = database.products.map((product) => {
    const sold = saleItems.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)
    const returnedSellable = returnItems.filter((item) => item.originalItem.productId === product.id && item.condition === 'sellable').reduce((sum, item) => sum + item.quantity, 0)
    const returnedDefective = returnItems.filter((item) => item.originalItem.productId === product.id && item.condition !== 'sellable').reduce((sum, item) => sum + item.quantity, 0)
    return sold || returnedSellable || returnedDefective ? { ...product, stockQuantity: Number(product.stockQuantity || 0) - sold + returnedSellable, defectiveQuantity: Number(product.defectiveQuantity || 0) + returnedDefective } : product
  })
  let stockMovements = database.stockMovements
  for (const item of saleItems) stockMovements = addMovement({ ...database, stockMovements }, { productId: item.productId, type: 'sale', quantity: -item.quantity, referenceId: sale.id, date: sale.date, note: sale.number || 'Sale' })
  let returnRecords = []
  for (const item of returnItems) {
    const returnRecord = record('return', { saleId: item.originalSale.id, saleNumber: item.originalSale.number, adjustmentSaleId: sale.id, customerId: item.originalSale.customerId, productId: item.originalItem.productId, lineId: item.originalItem.lineId, code: item.originalItem.code, itemName: item.originalItem.name, quantity: item.quantity, unitPrice: item.amount / item.quantity, amount: item.amount, condition: item.condition, refundType: 'sale-adjustment', date: sale.date })
    returnRecords.push(returnRecord)
    stockMovements = addMovement({ ...database, stockMovements }, { productId: item.originalItem.productId, type: item.condition === 'sellable' ? 'customer-return' : 'customer-return-defective', quantity: item.quantity, referenceId: returnRecord.id, date: sale.date, note: item.originalSale.number })
  }
  let customers = database.customers
  if (sale.customerId && split.credit > 0) customers = updateBalance(customers, sale.customerId, split.credit)
  let next = { ...database, products, customers, sales: [sale, ...database.sales], returns: [...returnRecords, ...database.returns], stockMovements }
  if (split.cash > 0) next = { ...next, payments: addPayment(next, { type: 'customer-payment', method: 'cash', amount: split.cash, customerId: sale.customerId, referenceId: sale.id, date: sale.date }) }
  if (split.bank > 0) next = { ...next, payments: addPayment(next, { type: 'customer-payment', method: 'bank', amount: split.bank, customerId: sale.customerId, referenceId: sale.id, date: sale.date }) }
  if (split.cheque > 0) next = { ...next, cheques: [record('cheque', { direction: 'received', partyType: 'customer', partyId: sale.customerId, party: sale.customer, amount: split.cheque, issued: sale.date, bank: input.cheque?.bank || '', number: input.cheque?.number || '', referenceId: sale.id, status: 'Pending' }), ...next.cheques] }
  next = { ...next, counters: { ...next.counters, sale: (next.counters.sale || 0) + 1 }, auditHistory: addAudit(next, 'sale', sale.id, `Sale ${sale.number || sale.id} recorded`) }
  return { database: next, record: sale }
}

export function receivePurchase(database, input) {
  if (!input.supplierId) throw new Error('Choose a supplier before saving the purchase.')
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('Add at least one stock item before saving the purchase.')
  const supplier = database.suppliers.find((entry) => entry.id === input.supplierId)
  if (!supplier) throw new Error('The selected supplier could not be found.')
  const batchNumber = receivingBatchPreview(supplier, dateOf(input.date ?? input.arrivalDate), database.purchases)
  if (!batchNumber) throw new Error('Add a Supplier Code to the selected supplier before receiving stock.')
  const purchaseItems = input.items.map((item) => ({
    lineId: item.lineId || makeId('purchase-line'),
    productId: item.productId || null,
    productName: String(item.productName ?? item.name ?? item.code ?? item.articleNumber ?? '').trim(),
    code: String(item.code ?? item.articleNumber ?? '').trim(),
    batchNumber,
    size: String(item.size ?? '').trim(),
    rackLocation: String(item.rackLocation ?? item.location ?? '').trim(),
    quantity: positiveQuantity(item.quantity),
    unitCost: amountOf(item.unitCost ?? item.cost ?? 0),
    salePrice: amountOf(item.salePrice ?? 0),
  }))
  if (purchaseItems.some((item) => item.productId && !database.products.some((product) => product.id === item.productId))) throw new Error('A delivery item points to a stock product that no longer exists.')
  if (purchaseItems.some((item) => !item.productName && (!item.productId || !database.products.some((product) => product.id === item.productId)))) throw new Error('Each delivery item needs an existing product or a product name/article number.')
  const total = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const cash = amountOf(input.payments?.cash ?? 0)
  const bank = amountOf(input.payments?.bank ?? input.payments?.bankTransfer ?? 0)
  const cheque = amountOf(input.payments?.cheque ?? 0)
  if (cash + bank + cheque > total + 0.005) throw new Error('Combined payments cannot exceed the purchase total.')
  let bankDetails = null
  if (bank > 0 || input.bankDetails) {
    const bankName = typeof input.bankDetails?.bankName === 'string' ? input.bankDetails.bankName.trim() : ''
    const accountNumber = typeof input.bankDetails?.accountNumber === 'string' ? input.bankDetails.accountNumber.trim() : ''
    if (!bankName) throw new Error('Select a bank/account or enter a bank name for the bank payment.')
    bankDetails = { bankName, accountNumber, amount: bank }
  }
  const purchase = record('purchase', {
    batchNumber,
    supplierBillNumber: Number(batchNumber.split('-').at(-1)),
    padNumber: String(input.padNumber ?? '').trim(),
    supplierId: supplier.id,
    supplier: supplier.name,
    date: dateOf(input.date ?? input.arrivalDate),
    items: purchaseItems,
    total,
    payments: { cash, bank, cheque },
    bankDetails,
    paid: cash + bank,
    due: Math.max(0, total - cash - bank),
  })
  let products = [...database.products]
  let stockMovements = database.stockMovements
  for (const item of purchaseItems) {
    const sameBatch = (entry) =>
      entry.supplierId === supplier.id &&
      String(entry.batchNumber || '').trim().toLowerCase() === item.batchNumber.toLowerCase() &&
      String(entry.size || '').trim().toLowerCase() === item.size.toLowerCase()
    const sourceProduct = item.productId ? products.find((entry) => entry.id === item.productId) : null
    if (sourceProduct) {
      item.productName ||= sourceProduct.name
      item.code ||= sourceProduct.code
      item.size ||= sourceProduct.size || ''
    }
    let product = item.productId
      ? products.find((entry) => entry.id === item.productId && sameBatch(entry))
      : products.find((entry) => item.code && entry.code?.toLowerCase() === item.code.toLowerCase() && sameBatch(entry))
    if (!product && item.productName) product = products.find((entry) => entry.name.toLowerCase() === item.productName.toLowerCase() && sameBatch(entry))
    if (product) {
      item.productId = product.id
      products = products.map((entry) => entry.id === product.id ? {
        ...entry,
        stockQuantity: Number(entry.stockQuantity || 0) + item.quantity,
        averageCost: ((Number(entry.stockQuantity || 0) * Number(entry.averageCost || 0)) + (item.quantity * item.unitCost)) / (Number(entry.stockQuantity || 0) + item.quantity || 1),
        salePrice: item.salePrice || Number(entry.salePrice || 0),
        supplierId: supplier.id,
        batchNumber,
        purchaseId: purchase.id,
        arrivalDate: purchase.date,
        size: item.size || entry.size || '',
        rackLocation: item.rackLocation || entry.rackLocation,
      } : entry)
      stockMovements = addMovement({ ...database, stockMovements }, { productId: product.id, type: 'purchase', quantity: item.quantity, referenceId: purchase.id, date: purchase.date, note: batchNumber })
    } else {
      const newProduct = record('product', { name: item.productName, code: item.code || makeId('sku'), categoryId: null, size: item.size, stockQuantity: item.quantity, reservedQuantity: 0, defectiveQuantity: 0, averageCost: item.unitCost, salePrice: item.salePrice, supplierId: supplier.id, batchNumber: item.batchNumber, rackLocation: item.rackLocation, active: true })
      newProduct.purchaseId = purchase.id
      newProduct.arrivalDate = purchase.date
      products.push(newProduct)
      purchaseItems[purchaseItems.indexOf(item)] = { ...item, productId: newProduct.id }
      stockMovements = addMovement({ ...database, stockMovements }, { productId: newProduct.id, type: 'purchase', quantity: item.quantity, referenceId: purchase.id, date: purchase.date, note: batchNumber })
    }
  }
  for (const item of purchaseItems) item.productName = item.productName || products.find((product) => product.id === item.productId)?.name || ''
  purchase.items = purchaseItems
  let suppliers = database.suppliers
  if (purchase.due > 0) suppliers = updateBalance(suppliers, supplier.id, purchase.due)
  let next = { ...database, products, suppliers, purchases: [purchase, ...database.purchases], stockMovements }
  if (cash > 0) next = { ...next, payments: addPayment(next, { type: 'supplier-payment', method: 'cash', amount: cash, supplierId: supplier.id, referenceId: purchase.id, date: purchase.date }) }
  if (bank > 0) next = { ...next, payments: addPayment(next, { type: 'supplier-payment', method: 'bank', amount: bank, bankDetails, supplierId: supplier.id, referenceId: purchase.id, date: purchase.date }) }
  if (cheque > 0) next = { ...next, cheques: [record('cheque', { direction: 'given', partyType: 'supplier', partyId: supplier.id, party: supplier.name, amount: cheque, issued: input.cheque?.date || purchase.date, bank: input.cheque?.bank || '', number: input.cheque?.number || '', referenceId: purchase.id, status: 'Pending' }), ...next.cheques] }
  next = { ...next, auditHistory: addAudit(next, 'purchase', purchase.id, `Receive stock ${batchNumber} recorded`) }
  return { database: next, record: purchase }
}

export function createAccount(database, accountType, input) {
  const key = accountType === 'customer' ? 'customers' : accountType === 'supplier' ? 'suppliers' : null
  if (!key) throw new Error('Account type must be customer or supplier.')
  const name = String(input.name || '').trim()
  if (!name) throw new Error(`${accountType} name is required.`)
  if (database[key].some((entry) => entry.name.trim().toLowerCase() === name.toLowerCase())) throw new Error(`A ${accountType} with this name already exists.`)
  const openingBalance = Number(input.openingBalance ?? 0)
  if (!Number.isFinite(openingBalance)) throw new Error('Opening balance must be a valid amount.')
  const account = record(accountType, { ...input, name, openingBalance, balance: openingBalance, active: true })
  const next = { ...database, [key]: [account, ...database[key]], auditHistory: addAudit(database, accountType, account.id, `${accountType} account created`) }
  return { database: next, record: account }
}

export function createProduct(database, input) {
  const name = String(input.name || '').trim()
  if (!name) throw new Error('Product name is required.')
  const code = String(input.code || '').trim()
  const batchNumber = String(input.batchNumber || '').trim().toLowerCase()
  const size = String(input.size || '').trim().toLowerCase()
  if (database.products.some((entry) => (code && entry.code?.toLowerCase() === code.toLowerCase() || entry.name.toLowerCase() === name.toLowerCase()) && String(entry.batchNumber || '').trim().toLowerCase() === batchNumber && String(entry.size || '').trim().toLowerCase() === size)) throw new Error('This product, batch, and size already exists.')
  const stockQuantity = nonnegativeWholeQuantity(input.stockQuantity ?? 0)
  const product = record('product', { ...input, name, code: code || makeId('sku'), batchNumber: String(input.batchNumber || '').trim(), size: String(input.size || '').trim(), stockQuantity, reservedQuantity: 0, defectiveQuantity: 0, averageCost: amountOf(input.averageCost ?? 0), salePrice: amountOf(input.salePrice ?? 0), active: true })
  const next = { ...database, products: [product, ...database.products], auditHistory: addAudit(database, 'product', product.id, `Product ${product.name} created`) }
  return { database: next, record: product }
}

export function adjustStock(database, input) {
  const product = database.products.find((entry) => entry.id === input.productId)
  if (!product) throw new Error('Product could not be found.')
  const quantity = positiveQuantity(input.quantity)
  const direction = input.direction === 'remove' ? -1 : input.direction === 'add' ? 1 : 0
  if (!direction) throw new Error('Stock adjustment must add or remove stock.')
  const current = Number(product.stockQuantity || 0)
  if (direction < 0 && current - quantity < Number(product.reservedQuantity || 0)) throw new Error('Stock cannot be reduced below the amount reserved for held orders.')
  const result = record('adjustment', { productId: product.id, quantity: direction * quantity, reason: input.reason || '', date: dateOf(input.date) })
  const products = database.products.map((entry) => entry.id === product.id ? { ...entry, stockQuantity: current + direction * quantity } : entry)
  const stockMovements = addMovement(database, { productId: product.id, type: 'adjustment', quantity: result.quantity, referenceId: result.id, date: result.date, note: result.reason })
  const next = { ...database, products, stockMovements, auditHistory: addAudit(database, 'stock-adjustment', result.id, `Stock ${direction > 0 ? 'increased' : 'decreased'} for ${product.name}`) }
  return { database: next, record: result }
}

export function saveDailyRecord(database, input) {
  const date = dateOf(input.date)
  const type = input.type === 'opening' ? 'opening' : 'closing'
  if (type === 'closing' && !database.dailyClosings.some((entry) => entry.date === date && entry.type === 'opening')) {
    throw new Error('Save the daily opening before recording the daily closing.')
  }
  const amount = amountOf(input.amount)
  const existing = database.dailyClosings.find((entry) => entry.date === date && entry.type === type)
  const dailyRecord = existing
    ? { ...existing, amount, counted: input.counted == null ? existing.counted : amountOf(input.counted), note: input.note || '' }
    : record('daily', { date, type, amount, counted: input.counted == null ? null : amountOf(input.counted), note: input.note || '' })
  const dailyClosings = existing ? database.dailyClosings.map((entry) => entry.id === existing.id ? dailyRecord : entry) : [dailyRecord, ...database.dailyClosings]
  const next = { ...database, dailyClosings, auditHistory: addAudit(database, `daily-${type}`, dailyRecord.id, `Daily ${type} saved for ${date}`) }
  return { database: next, record: dailyRecord }
}

export function deleteDailyRecord(database, recordId) {
  const existing = database.dailyClosings.find((entry) => entry.id === recordId)
  if (!existing) throw new Error('Daily record could not be found.')
  if (existing.type === 'opening' && database.dailyClosings.some((entry) => entry.date === existing.date && entry.type === 'closing')) {
    throw new Error('Delete the daily closing before deleting its opening.')
  }
  const next = {
    ...database,
    dailyClosings: database.dailyClosings.filter((entry) => entry.id !== recordId),
    auditHistory: addAudit(database, 'daily-record-deleted', existing.id, `Daily ${existing.type} deleted for ${existing.date}`),
  }
  return { database: next, record: existing }
}

export function saveSettings(database, settings) {
  const shopName = String(settings.shopName || '').trim()
  if (!shopName) throw new Error('Shop name is required.')
  const stockThreshold = Number(settings.stockThreshold)
  if (!Number.isInteger(stockThreshold) || stockThreshold < 0) throw new Error('Low-stock threshold must be a non-negative whole number.')
  const nextSettings = { ...database.settings, ...settings, shopName, stockThreshold: String(stockThreshold), receiptFooter: String(settings.receiptFooter || '').trim() }
  const next = { ...database, settings: nextSettings, auditHistory: addAudit(database, 'settings', 'shop', 'Shop settings updated') }
  return { database: next, record: nextSettings }
}

export function createClaim(database, input) {
  const quantity = positiveQuantity(input.quantity)
  if (!input.description?.trim() && !input.reason?.trim()) throw new Error('Enter a reason or description for the claim.')
  let alreadyDefective = 0
  if (input.productId) {
    const product = database.products.find((entry) => entry.id === input.productId)
    if (!product) throw new Error('The claimed product could not be found.')
    const pendingClaimQuantity = database.claims.filter((claim) => claim.productId === input.productId && claim.status === 'Pending').reduce((sum, claim) => sum + Number(claim.quantity || 0), 0)
    alreadyDefective = Math.min(quantity, Math.max(0, Number(product.defectiveQuantity || 0) - pendingClaimQuantity))
    const toQuarantine = quantity - alreadyDefective
    if (Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0) < toQuarantine) throw new Error('Claim quantity exceeds available and defective stock.')
  }
  if (input.supplierId && !database.suppliers.some((supplier) => supplier.id === input.supplierId)) throw new Error('The claim supplier could not be found.')
  const claimedProduct = database.products.find((entry) => entry.id === input.productId)
  const claim = record('claim', { ...input, amount: quantity * Number(claimedProduct?.averageCost || 0), description: String(input.description || input.reason).trim(), quantity, date: dateOf(input.date), status: 'Pending' })
  let products = database.products
  let stockMovements = database.stockMovements
  if (claim.productId) {
    const toQuarantine = quantity - alreadyDefective
    products = products.map((entry) => entry.id === claim.productId ? { ...entry, stockQuantity: Number(entry.stockQuantity || 0) - toQuarantine, defectiveQuantity: Number(entry.defectiveQuantity || 0) + toQuarantine } : entry)
    stockMovements = addMovement(database, { productId: claim.productId, type: 'defect-claim', quantity: -quantity, referenceId: claim.id, date: claim.date, note: claim.description })
  }
  const next = { ...database, products, stockMovements, claims: [claim, ...database.claims], auditHistory: addAudit(database, 'claim', claim.id, 'Defect or claim recorded') }
  return { database: next, record: claim }
}

export function updateClaimStatus(database, claimId, status, resolution = '') {
  if (!['Approved', 'Rejected', 'Resolved'].includes(status)) throw new Error('Choose an approved, rejected, or resolved status.')
  const claim = database.claims.find((entry) => entry.id === claimId)
  if (!claim) throw new Error('Claim could not be found.')
  if (claim.status === status) return { database, record: claim }
  if (claim.status !== 'Pending' && claim.status !== status) throw new Error('Only pending claims can change status.')
  const updated = { ...claim, status, resolution, updatedAt: now() }
  const suppliers = status === 'Approved' && claim.supplierId ? updateBalance(database.suppliers, claim.supplierId, -Number(claim.amount || 0)) : database.suppliers
  const products = status === 'Approved' && claim.productId ? database.products.map((product) => product.id === claim.productId ? { ...product, defectiveQuantity: Math.max(0, Number(product.defectiveQuantity || 0) - claim.quantity) } : product) : database.products
  const stockMovements = status === 'Approved' && claim.productId ? addMovement(database, { productId: claim.productId, type: 'approved-claim', quantity: -claim.quantity, referenceId: claim.id, date: dateOf(), note: claim.description }) : database.stockMovements
  const next = { ...database, products, stockMovements, suppliers, claims: database.claims.map((entry) => entry.id === claimId ? updated : entry), auditHistory: addAudit(database, 'claim-status', claimId, `Claim marked ${status.toLowerCase()}`) }
  return { database: next, record: updated }
}

export function runDatabaseCommand(database, command, input = {}) {
  switch (command) {
    case 'create-sale': return createSale(database, input)
    case 'receive-purchase': return receivePurchase(database, input)
    case 'customer-return': return processCustomerReturn(database, input)
    case 'supplier-return': return processSupplierReturn(database, input)
    case 'account-payment': return recordAccountPayment(database, input)
    case 'expense': return recordExpense(database, input)
    case 'cheque-status': return updateChequeStatus(database, input.chequeId, input.status)
    case 'hold-order': return recordHeldOrder(database, input)
    case 'release-held-order': return releaseHeldOrder(database, input.heldId, 'resumed')
    case 'discard-held-order': return releaseHeldOrder(database, input.heldId, 'discarded')
    case 'create-customer': return createAccount(database, 'customer', input)
    case 'create-supplier': return createAccount(database, 'supplier', input)
    case 'create-product': return createProduct(database, input)
    case 'adjust-stock': return adjustStock(database, input)
    case 'daily-record': return saveDailyRecord(database, input)
    case 'delete-daily-record': return deleteDailyRecord(database, input.recordId)
    case 'save-settings': return saveSettings(database, input)
    case 'create-claim': return createClaim(database, input)
    case 'claim-status': return updateClaimStatus(database, input.claimId, input.status, input.resolution)
    default: throw new Error(`Unknown database command: ${command}`)
  }
}

export function processCustomerReturn(database, input) {
  const sale = database.sales.find((entry) => entry.id === input.saleId)
  if (!sale) throw new Error('Choose the original sale for this return.')
  const originalItem = input.lineId ? sale.items.find((item) => item.lineId === input.lineId) : sale.items.find((item) => item.productId === input.productId || item.code === input.code || item.name.toLowerCase() === String(input.code || input.name || '').toLowerCase())
  if (!originalItem) throw new Error('That item is not on the selected sale.')
  const quantity = positiveQuantity(input.quantity)
  const returnKey = originalItem.lineId || originalItem.productId
  const alreadyReturned = database.returns.filter((entry) => entry.saleId === sale.id && (entry.lineId || entry.productId) === returnKey).reduce((sum, entry) => sum + entry.quantity, 0)
  const soldQuantity = originalItem.lineId ? originalItem.quantity : sale.items.filter((item) => item.productId === originalItem.productId).reduce((sum, item) => sum + item.quantity, 0)
  if (alreadyReturned + quantity > soldQuantity) throw new Error('Return quantity exceeds the amount sold and not yet returned.')
  const amount = quantity * originalItem.unitPrice
  const condition = input.condition || 'sellable'
  const result = record('return', { saleId: sale.id, saleNumber: sale.number, customerId: sale.customerId, productId: originalItem.productId, lineId: originalItem.lineId, code: originalItem.code, itemName: originalItem.name, quantity, unitPrice: originalItem.unitPrice, unitCostAtSale: Number(originalItem.unitCostAtSale || 0), amount, condition, refundType: input.refundType || 'khata', date: dateOf(input.date) })
  let products = database.products
  let stockMovements = database.stockMovements
  if (condition === 'sellable' || condition === 'Sellable stock') {
    products = products.map((product) => product.id === originalItem.productId ? { ...product, stockQuantity: Number(product.stockQuantity || 0) + quantity } : product)
    stockMovements = addMovement({ ...database, stockMovements }, { productId: originalItem.productId, type: 'customer-return', quantity, referenceId: result.id, date: result.date, note: sale.number })
  } else {
    products = products.map((product) => product.id === originalItem.productId ? { ...product, defectiveQuantity: Number(product.defectiveQuantity || 0) + quantity } : product)
    stockMovements = addMovement({ ...database, stockMovements }, { productId: originalItem.productId, type: 'customer-return-defective', quantity, referenceId: result.id, date: result.date, note: sale.number })
  }
  const customers = sale.customerId && result.refundType === 'khata' ? updateBalance(database.customers, sale.customerId, -amount) : database.customers
  let next = { ...database, products, customers, returns: [result, ...database.returns], stockMovements }
  if (result.refundType === 'cash') next = { ...next, payments: addPayment(next, { type: 'customer-refund', method: 'cash', amount, customerId: sale.customerId, referenceId: result.id, date: result.date }) }
  next = { ...next, auditHistory: addAudit(next, 'customer-return', result.id, `Return linked to ${sale.number || sale.id}`) }
  return { database: next, record: result }
}

export function processSupplierReturn(database, input) {
  const purchase = database.purchases.find((entry) => entry.id === input.purchaseId)
  if (!purchase) throw new Error('Choose the original purchase for this supplier return.')
  const originalItem = input.purchaseItemId ? purchase.items.find((item) => item.lineId === input.purchaseItemId) : purchase.items.find((item) => item.productId === input.productId || item.code === input.code)
  if (!originalItem) throw new Error('That item is not on the selected purchase.')
  const quantity = positiveQuantity(input.quantity)
  const returnKey = originalItem.lineId || originalItem.productId
  const alreadyReturned = database.supplierReturns.filter((entry) => entry.purchaseId === purchase.id && (entry.purchaseItemId || entry.productId) === returnKey).reduce((sum, entry) => sum + entry.quantity, 0)
  const receivedQuantity = originalItem.lineId ? originalItem.quantity : purchase.items.filter((item) => item.productId === originalItem.productId).reduce((sum, item) => sum + item.quantity, 0)
  if (alreadyReturned + quantity > receivedQuantity) throw new Error('Return quantity exceeds the amount received and not yet returned.')
  const product = database.products.find((entry) => entry.id === originalItem.productId)
  if (!product || Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0) < quantity) throw new Error('There is not enough unreserved stock to return this item.')
  const result = record('supplier-return', { purchaseId: purchase.id, purchaseItemId: originalItem.lineId, supplierId: purchase.supplierId, productId: product.id, code: originalItem.code, itemName: originalItem.productName, quantity, amount: quantity * originalItem.unitCost, date: dateOf(input.date), reason: input.reason || '' })
  const products = database.products.map((entry) => entry.id === product.id ? { ...entry, stockQuantity: Number(entry.stockQuantity) - quantity } : entry)
  const suppliers = updateBalance(database.suppliers, purchase.supplierId, -result.amount)
  result.batchNumber = receivingLabel(purchase)
  const stockMovements = addMovement(database, { productId: product.id, type: 'supplier-return', quantity: -quantity, referenceId: result.id, date: result.date, note: `${result.batchNumber}${input.reason ? ` · ${input.reason}` : ''}` })
  const next = { ...database, products, suppliers, supplierReturns: [result, ...database.supplierReturns], stockMovements, auditHistory: addAudit(database, 'supplier-return', result.id, `Return linked to receiving ${result.batchNumber}`) }
  return { database: next, record: result }
}

export function recordAccountPayment(database, input) {
  const amount = amountOf(input.amount)
  if (!amount) throw new Error('Payment amount must be greater than zero.')
  const isCustomer = input.accountType === 'customer'
  if (!isCustomer && input.accountType !== 'supplier') throw new Error('Account type must be customer or supplier.')
  const accountRows = isCustomer ? database.customers : database.suppliers
  const account = accountRows.find((entry) => entry.id === input.accountId)
  if (!account) throw new Error(`The ${input.accountType} account could not be found.`)
  const method = input.method || 'cash'
  if (!['cash', 'bank', 'cheque'].includes(method)) throw new Error('Payment method must be cash, bank, or cheque.')
  const payment = record('payment', { type: isCustomer ? 'customer-payment' : 'supplier-payment', accountType: input.accountType, method, amount, customerId: isCustomer ? account.id : undefined, supplierId: isCustomer ? undefined : account.id, referenceId: input.referenceId || '', date: dateOf(input.date), note: input.note || '' })
  const rows = method === 'cheque' ? accountRows : updateBalance(accountRows, account.id, -amount)
  let next = { ...database, [isCustomer ? 'customers' : 'suppliers']: rows, payments: method === 'cheque' ? database.payments : [payment, ...database.payments] }
  if (method === 'cheque') next = { ...next, cheques: [record('cheque', { direction: isCustomer ? 'received' : 'given', partyType: input.accountType, partyId: account.id, party: account.name, amount, number: input.cheque?.number || '', issued: dateOf(input.date), bank: input.cheque?.bank || '', referenceId: payment.id, status: 'Pending' }), ...next.cheques] }
  next = { ...next, auditHistory: addAudit(next, payment.type, payment.id, `${input.accountType} payment recorded`) }
  return { database: next, record: payment }
}

export function recordExpense(database, input) {
  const amount = amountOf(input.amount)
  if (amount <= 0) throw new Error('Expense amount must be greater than zero.')
  const method = input.method || 'cash'
  const expense = record('expense', { category: input.category || 'Other', amount, date: dateOf(input.date), description: input.description || '', paidTo: input.paidTo || '', method, account: input.account || method })
  const next = { ...database, expenses: [expense, ...database.expenses], auditHistory: addAudit(database, 'expense', expense.id, `${expense.category} expense recorded`) }
  return { database: next, record: expense }
}

export function updateChequeStatus(database, chequeId, status) {
  if (!['Cleared', 'Returned'].includes(status)) throw new Error('Cheque status must be Cleared or Returned.')
  const cheque = database.cheques.find((entry) => entry.id === chequeId)
  if (!cheque) throw new Error('Cheque could not be found.')
  if (cheque.status === status) return { database, record: cheque }
  if (cheque.status !== 'Pending' && !(cheque.status === 'Cleared' && status === 'Returned')) throw new Error(`Cannot change a ${cheque.status.toLowerCase()} cheque to ${status.toLowerCase()}.`)
  let next = { ...database, cheques: database.cheques.map((entry) => entry.id === chequeId ? { ...entry, status, clearedAt: status === 'Cleared' ? now() : null } : entry) }
  if ((status === 'Cleared' || cheque.status === 'Cleared') && cheque.partyType === 'customer' && cheque.partyId) next = { ...next, customers: updateBalance(next.customers, cheque.partyId, status === 'Cleared' ? -cheque.amount : cheque.amount) }
  if ((status === 'Cleared' || cheque.status === 'Cleared') && cheque.partyType === 'supplier' && cheque.partyId) next = { ...next, suppliers: updateBalance(next.suppliers, cheque.partyId, status === 'Cleared' ? -cheque.amount : cheque.amount) }
  if (status === 'Cleared') next = { ...next, payments: addPayment(next, { type: cheque.partyType === 'customer' ? 'customer-payment' : 'supplier-payment', method: 'cheque-cleared', amount: cheque.amount, customerId: cheque.partyType === 'customer' ? cheque.partyId : undefined, supplierId: cheque.partyType === 'supplier' ? cheque.partyId : undefined, referenceId: cheque.referenceId, date: dateOf() }) }
  if (status === 'Returned' && cheque.status === 'Cleared') next = { ...next, payments: addPayment(next, { type: 'cheque-reversal', method: 'cheque-returned', amount: cheque.amount, customerId: cheque.partyType === 'customer' ? cheque.partyId : undefined, supplierId: cheque.partyType === 'supplier' ? cheque.partyId : undefined, referenceId: cheque.referenceId, date: dateOf() }) }
  next = { ...next, auditHistory: addAudit(next, 'cheque-status', cheque.id, `Cheque marked ${status.toLowerCase()}`) }
  return { database: next, record: next.cheques.find((entry) => entry.id === chequeId) }
}

export function recordHeldOrder(database, input) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('A held order must contain at least one item.')
  const items = input.items.map((item) => {
    const quantity = positiveQuantity(item.quantity)
    if (item.isReturn || item.returnQuantity) return { ...item, quantity }
    const product = getProduct(database.products, item)
    return { ...item, productId: product.id, name: product.name, code: product.code, quantity }
  })
  const held = record('held', { ...input, items, status: 'held', date: dateOf(input.date) })
  const products = database.products.map((product) => {
    const heldQuantity = items.filter((item) => !item.isReturn && !item.returnQuantity && item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)
    if (!heldQuantity) return product
    if (Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0) < heldQuantity) throw new Error(`Not enough stock to reserve ${product.name}.`)
    return { ...product, reservedQuantity: Number(product.reservedQuantity || 0) + heldQuantity }
  })
  const next = { ...database, products, heldOrders: [held, ...database.heldOrders], auditHistory: addAudit(database, 'held-order', held.id, 'Order held and stock reserved') }
  return { database: next, record: held }
}

export function releaseHeldOrder(database, heldId, disposition = 'resumed') {
  const held = database.heldOrders.find((entry) => entry.id === heldId)
  if (!held) throw new Error('Held order could not be found.')
  const products = database.products.map((product) => {
    const quantity = held.items.filter((item) => !item.isReturn && !item.returnQuantity && (item.productId ? item.productId === product.id : legacyHeldItemMatches(database.products, item, product))).reduce((sum, item) => sum + Number(item.quantity), 0)
    return quantity ? { ...product, reservedQuantity: Math.max(0, Number(product.reservedQuantity || 0) - quantity) } : product
  })
  const next = { ...database, products, heldOrders: database.heldOrders.filter((entry) => entry.id !== heldId), auditHistory: addAudit(database, `held-order-${disposition}`, held.id, `Held order ${disposition}`) }
  return { database: next, record: held }
}

function legacyHeldItemMatches(products, item, product) {
  const code = String(item.code || '').trim().toLowerCase()
  if (code) {
    const matches = products.filter((entry) => entry.code?.trim().toLowerCase() === code)
    return matches.length === 1 && matches[0].id === product.id
  }
  const name = String(item.name || '').trim().toLowerCase()
  const matches = products.filter((entry) => entry.name?.trim().toLowerCase() === name)
  return matches.length === 1 && matches[0].id === product.id
}

export function calculateDailyClosing(database, date) {
  const sameDate = (entry) => entry.date === date
  const opening = database.dailyClosings.find((entry) => entry.type === 'opening' && sameDate(entry))?.amount || 0
  const sumPayment = (predicate) => database.payments.filter((entry) => sameDate(entry) && predicate(entry)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const cashSales = sumPayment((entry) => entry.type === 'customer-payment' && entry.method === 'cash' && database.sales.some((sale) => sale.id === entry.referenceId))
  const customerPayments = sumPayment((entry) => entry.type === 'customer-payment' && entry.method === 'cash' && !database.sales.some((sale) => sale.id === entry.referenceId))
  const supplierPayments = sumPayment((entry) => entry.type === 'supplier-payment' && entry.method === 'cash')
  const cashExpenses = database.expenses.filter((entry) => sameDate(entry) && entry.method === 'cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const cashRefunds = sumPayment((entry) => entry.type === 'customer-refund' && entry.method === 'cash')
  const cashOtherReceipts = (database.financeEntries || []).filter((entry) => sameDate(entry) && entry.type === 'capital' && entry.method === 'cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankTransactions = (database.bankTransactions || []).filter((entry) => sameDate(entry))
  const cashWithdrawals = bankTransactions.filter((entry) => entry.type === 'withdrawal' && entry.destination === 'cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const cashDeposits = bankTransactions.filter((entry) => entry.type === 'deposit' && entry.source === 'cash').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const expectedCash = Math.round((opening + cashSales + customerPayments + cashOtherReceipts + cashWithdrawals - supplierPayments - cashExpenses - cashRefunds - cashDeposits + Number.EPSILON) * 100) / 100
  return { date, opening, cashSales, customerPayments, cashOtherReceipts, supplierPayments, cashExpenses, cashRefunds, cashWithdrawals, cashDeposits, expectedCash }
}

export function calculateBankBalanceSummary(database, date) {
  const records = database.bankBalanceRecords || []
  const transactions = database.bankTransactions || []
  const accounts = (database.bankAccounts || []).map((account) => {
    const previous = records.filter((entry) => entry.accountId === account.id && entry.date < date)
      .sort((left, right) => right.date.localeCompare(left.date) || String(right.createdAt).localeCompare(String(left.createdAt)))[0]
    let expectedBalance = Number(previous?.closingBalance ?? account.openingBalance ?? 0)
    for (const transaction of transactions) {
      if (transaction.date > date || transaction.date <= (previous?.date || '')) continue
      if (transaction.accountId === account.id) {
        if (transaction.type === 'withdrawal' || transaction.type === 'transfer') expectedBalance -= Number(transaction.amount || 0)
        if (transaction.type === 'deposit') expectedBalance += Number(transaction.amount || 0)
      }
      if (['transfer', 'withdrawal'].includes(transaction.type) && transaction.destination === 'account' && transaction.destinationAccountId === account.id) expectedBalance += Number(transaction.amount || 0)
    }
    expectedBalance = Math.round((expectedBalance + Number.EPSILON) * 100) / 100
    const dayRecord = records.filter((entry) => entry.accountId === account.id && entry.date === date)
      .sort((left, right) => Number(right.revision || 0) - Number(left.revision || 0) || String(right.createdAt).localeCompare(String(left.createdAt)))[0]
    const currentBalance = Math.round((Number(dayRecord?.closingBalance ?? expectedBalance) + Number.EPSILON) * 100) / 100
    return {
      accountId: account.id,
      name: account.name,
      active: account.active !== false,
      previousBalance: Number(previous?.closingBalance ?? account.openingBalance ?? 0),
      expectedBalance,
      currentBalance,
      difference: dayRecord ? Math.round((currentBalance - Number(dayRecord.expectedBalance ?? expectedBalance) + Number.EPSILON) * 100) / 100 : 0,
      note: dayRecord?.note || '',
      lastUpdatedAt: dayRecord?.createdAt || null,
    }
  })
  const total = (key) => Math.round((accounts.filter((account) => account.active).reduce((sum, account) => sum + Number(account[key] || 0), 0) + Number.EPSILON) * 100) / 100
  return { date, accounts, previousTotal: total('previousBalance'), expectedTotal: total('expectedBalance'), currentTotal: total('currentBalance') }
}

export function calculateBusinessTotals(database) {
  const getGrossBilled = (sale) => Number(sale.subtotal ?? (sale.items || []).filter((item) => !item.isReturn).reduce((sum, item) => sum + Number(item.lineTotal ?? Number(item.quantity || 0) * Number(item.unitPrice ?? item.price ?? 0)), 0))
  const getDiscount = (sale) => Number(sale.discount || 0)
  const getBillReturns = (sale) => Number(sale.returnTotal || 0)
  const getNetBill = (sale) => Number(sale.total ?? sale.totalAmount ?? (getGrossBilled(sale) - getDiscount(sale) - getBillReturns(sale)))
  const grossBilled = database.sales.reduce((sum, sale) => sum + getGrossBilled(sale), 0)
  const discounts = database.sales.reduce((sum, sale) => sum + getDiscount(sale), 0)
  const billReturnAdjustments = database.sales.reduce((sum, sale) => sum + getBillReturns(sale), 0)
  const returnsProcessedSeparately = database.returns.filter((entry) => entry.refundType !== 'sale-adjustment')
  const separateReturnAmount = returnsProcessedSeparately.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const netSales = database.sales.reduce((sum, sale) => sum + getNetBill(sale), 0) - separateReturnAmount
  const billCost = database.sales.reduce((sum, sale) => sum + (sale.items || []).reduce((subtotal, item) => {
    const direction = item.isReturn && item.returnCondition === 'sellable' ? -1 : 1
    return subtotal + direction * Number(item.quantity || 0) * Number(item.unitCostAtSale || 0)
  }, 0), 0)
  const separateSellableReturnCost = returnsProcessedSeparately.filter((entry) => entry.condition === 'sellable' || entry.condition === 'Sellable stock').reduce((sum, entry) => sum + Number(entry.quantity || 0) * Number(entry.unitCostAtSale || 0), 0)
  const costOfGoods = billCost - separateSellableReturnCost
  const expenses = database.expenses.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  return {
    grossBilled,
    discounts,
    billReturnAdjustments,
    separateReturnAmount,
    netSales,
    costOfGoods,
    estimatedGrossProfit: netSales - costOfGoods,
    expenses,
    estimatedNetResult: netSales - costOfGoods - expenses,
  }
}

export function calculateAccountLedger(database, accountType, accountId) {
  const isCustomer = accountType === 'customer'
  if (!isCustomer && accountType !== 'supplier') throw new Error('Account type must be customer or supplier.')
  const collection = isCustomer ? 'customers' : 'suppliers'
  const account = database[collection].find((entry) => entry.id === accountId)
  if (!account) throw new Error(`The ${accountType} account could not be found.`)
  const entries = [
    ...(Number(account.openingBalance || 0) ? [{ id: `opening-${account.id}`, date: account.createdAt?.slice(0, 10) || '', title: 'Opening balance', amount: Math.abs(Number(account.openingBalance)), direction: Number(account.openingBalance) < 0 ? 'credit' : 'debit' }] : []),
    ...(isCustomer
      ? database.sales.filter((sale) => sale.customerId === account.id).map((sale) => ({ id: sale.id, date: sale.date, title: `Sale ${sale.number || ''}`.trim(), amount: Number(sale.total || 0), direction: 'debit' }))
      : database.purchases.filter((purchase) => purchase.supplierId === account.id).map((purchase) => ({ id: purchase.id, date: purchase.date, title: `Stock purchase · ${receivingLabel(purchase)}`, batchNumber: receivingLabel(purchase), amount: Number(purchase.total || 0), direction: 'debit' }))),
    ...database.payments.filter((payment) => payment[isCustomer ? 'customerId' : 'supplierId'] === account.id).map((payment) => ({ id: payment.id, date: payment.date, title: `${payment.method} ${payment.type === 'cheque-reversal' ? 'returned' : 'payment'}`, amount: Number(payment.amount || 0), direction: payment.type === 'cheque-reversal' ? 'debit' : 'credit' })),
    ...(isCustomer
      ? database.returns.filter((entry) => entry.customerId === account.id && entry.refundType !== 'sale-adjustment').map((entry) => ({ id: entry.id, date: entry.date, title: entry.refundType === 'cash' ? `Cash refund · ${entry.itemName}` : `Khata return · ${entry.itemName}`, amount: Number(entry.amount || 0), direction: entry.refundType === 'cash' ? 'memo' : 'credit' }))
      : database.supplierReturns.filter((entry) => entry.supplierId === account.id).map((entry) => ({ id: entry.id, date: entry.date, title: `Return · ${entry.itemName}`, amount: Number(entry.amount || 0), direction: 'credit' }))),
    ...(!isCustomer ? database.claims.filter((claim) => claim.supplierId === account.id && claim.status === 'Approved').map((claim) => ({ id: claim.id, date: claim.date, title: 'Approved defect claim', amount: Number(claim.amount || 0), direction: 'credit' })) : []),
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  const calculatedBalance = entries.reduce((balance, entry) => balance + (entry.direction === 'debit' ? entry.amount : entry.direction === 'credit' ? -entry.amount : 0), 0)
  return { entries, calculatedBalance, storedBalance: Number(account.balance || 0) }
}

export function validateBackup(data) {
  const currentFormat = data?.version === APP_DB_VERSION
  if (data && data.version == null && Array.isArray(data.customers) && Array.isArray(data.savedBills) && Array.isArray(data.heldBills)) {
    const legacy = createEmptyDatabase()
    legacy.customers = data.customers.map((customer, index) => ({ ...customer, id: String(customer.id || `legacy-customer-${index + 1}`), openingBalance: Number(customer.openingBalance || 0), balance: Number(customer.balance ?? customer.openingBalance ?? 0) }))
    legacy.sales = data.savedBills.map((bill, index) => ({ ...bill, id: String(bill.id || `legacy-sale-${index + 1}`), items: (bill.items || []).map((item, lineIndex) => ({ ...item, lineId: String(item.lineId || item.id || `legacy-line-${index + 1}-${lineIndex + 1}`), price: Number(item.price ?? item.unitPrice ?? 0), unitPrice: Number(item.unitPrice ?? item.price ?? 0) })) }))
    legacy.heldOrders = data.heldBills.map((bill, index) => ({ ...bill, id: String(bill.id || `legacy-held-${index + 1}`), status: 'held', items: (bill.items || []).map((item, lineIndex) => ({ ...item, lineId: String(item.lineId || item.id || `legacy-held-line-${index + 1}-${lineIndex + 1}`) })) }))
    data = legacy
  }
  if (data?.version === 1) {
    data = {
      ...data,
      version: APP_DB_VERSION,
      sales: (data.sales || []).map((sale) => ({ ...sale, items: (sale.items || []).map((item, index) => ({ ...item, lineId: item.lineId || item.id || `migrated-${sale.id}-${index}`, unitPrice: Number(item.unitPrice ?? item.price ?? 0), price: Number(item.price ?? item.unitPrice ?? 0), unitCostAtSale: Number(item.unitCostAtSale || 0) })) })),
      purchases: (data.purchases || []).map((purchase) => ({ ...purchase, items: (purchase.items || []).map((item, index) => ({ ...item, lineId: item.lineId || `migrated-${purchase.id}-${index}` })) })),
    }
  }
  if (!data || typeof data !== 'object' || data.version !== APP_DB_VERSION) throw new Error('Unsupported or invalid application backup.')
  const database = createEmptyDatabase()
  const additiveCollections = new Set(['bankAccounts', 'bankTransactions', 'bankBalanceRecords'])
  for (const key of Object.keys(database)) {
    if (Array.isArray(database[key])) {
      if (!Array.isArray(data[key]) && !additiveCollections.has(key)) throw new Error(`Backup is missing a valid ${key} collection.`)
      const rows = data[key] || []
      const ids = new Set()
      for (const item of rows) {
        if (!item || typeof item !== 'object' || !item.id || ids.has(item.id)) throw new Error(`The ${key} collection contains an invalid or duplicate ID.`)
        ids.add(item.id)
      }
      database[key] = rows
    } else if (key === 'version') {
      database.version = APP_DB_VERSION
    } else if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      database[key] = data[key]
    }
  }
  if (currentFormat) validateRelationships(database)
  return database
}

function validateRelationships(database) {
  const assertReference = (collection, id, description) => {
    if (id && !database[collection].some((entry) => entry.id === id)) throw new Error(`Backup contains a ${description} linked to a missing record.`)
  }
  for (const sale of database.sales) {
    assertReference('customers', sale.customerId, 'sale/customer relationship')
    for (const item of sale.items || []) assertReference('products', item.productId, 'sale item/product relationship')
  }
  for (const purchase of database.purchases) {
    assertReference('suppliers', purchase.supplierId, 'purchase/supplier relationship')
    for (const item of purchase.items || []) assertReference('products', item.productId, 'purchase item/product relationship')
  }
  for (const entry of database.returns) {
    assertReference('sales', entry.saleId, 'customer return/sale relationship')
    assertReference('sales', entry.adjustmentSaleId, 'customer return/adjustment relationship')
    assertReference('products', entry.productId, 'customer return/product relationship')
  }
  for (const entry of database.supplierReturns) {
    assertReference('purchases', entry.purchaseId, 'supplier return/purchase relationship')
    assertReference('suppliers', entry.supplierId, 'supplier return/supplier relationship')
    assertReference('products', entry.productId, 'supplier return/product relationship')
  }
  for (const entry of database.payments) {
    assertReference('customers', entry.customerId, 'payment/customer relationship')
    assertReference('suppliers', entry.supplierId, 'payment/supplier relationship')
  }
  for (const entry of database.cheques) {
    assertReference(entry.partyType === 'supplier' ? 'suppliers' : 'customers', entry.partyId, 'cheque/account relationship')
  }
  for (const entry of database.stockMovements) assertReference('products', entry.productId, 'stock movement/product relationship')
  for (const entry of database.heldOrders) {
    for (const item of entry.items || []) assertReference('products', item.productId, 'held item/product relationship')
  }
  for (const entry of database.claims) {
    assertReference('products', entry.productId, 'claim/product relationship')
    assertReference('suppliers', entry.supplierId, 'claim/supplier relationship')
  }
}
