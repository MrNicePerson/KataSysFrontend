import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAccountLedger, calculateBusinessTotals, calculateDailyClosing, createAccount, createClaim, createEmptyDatabase, createSale, localDateString, processCustomerReturn, processSupplierReturn, receivePurchase, recordAccountPayment, recordExpense, recordHeldOrder, runDatabaseCommand, saveSettings, updateChequeStatus, updateClaimStatus, validateBackup } from './businessLogic.js'

const seed = () => {
  let db = createEmptyDatabase()
  const customer = createAccount(db, 'customer', { name: 'Ayesha' }); db = customer.database
  const supplier = createAccount(db, 'supplier', { name: 'Textile Co', supplierCode: 'TC' }); db = supplier.database
  db = { ...db, products: [{ id: 'p1', name: 'Lawn', code: 'L-1', stockQuantity: 5, reservedQuantity: 0, salePrice: 100, averageCost: 50 }] }
  return { db, customer: customer.record, supplier: supplier.record }
}

test('sale updates stock, customer due and cash ledger as one transaction', () => {
  const { db, customer } = seed()
  const { database: next, record: sale } = createSale(db, { items: [{ productId: 'p1', quantity: 2, price: 100 }], customerId: customer.id, payments: { cash: 50 } })
  assert.equal(sale.customer, 'Ayesha')
  assert.equal(next.products[0].stockQuantity, 3)
  assert.equal(next.customers[0].balance, 150)
  assert.equal(sale.due, 150)
  assert.equal(next.payments[0].amount, 50)
})

test('sale rejects aggregate overdraw and leaves the source unchanged', () => {
  const { db } = seed()
  assert.throws(() => createSale(db, { items: [{ productId: 'p1', quantity: 3 }, { productId: 'p1', quantity: 3 }] }), /Not enough available stock/)
  assert.equal(db.products[0].stockQuantity, 5)
})

test('purchase adds stock and supplier due; supplier payment clears the due', () => {
  const { db, supplier } = seed()
  const purchase = receivePurchase(db, { supplierId: supplier.id, items: [{ productId: 'p1', quantity: 4, unitCost: 40 }], payments: { cash: 20 } })
  assert.equal(purchase.database.products[0].stockQuantity, 5)
  assert.equal(purchase.database.products.find((product) => product.purchaseId === purchase.record.id).stockQuantity, 4)
  assert.equal(purchase.database.suppliers[0].balance, 140)
  const payment = recordAccountPayment(purchase.database, { accountType: 'supplier', accountId: supplier.id, amount: 60, method: 'cash' })
  assert.equal(payment.database.suppliers[0].balance, 80)
})

test('separate deliveries with the same article code retain distinct batch stock and supplier links', () => {
  const { db: seeded, supplier } = seed()
  const db = { ...seeded, products: [] }
  const first = receivePurchase(db, { supplierId: supplier.id, items: [{ productName: 'Lawn', code: 'L-1', batchNumber: 'B-1', size: 'M', quantity: 3, unitCost: 40, salePrice: 100 }] })
  const secondSupplier = createAccount(first.database, 'supplier', { name: 'Second Textile Co', supplierCode: 'STC' })
  const second = receivePurchase(secondSupplier.database, { supplierId: secondSupplier.record.id, items: [{ productName: 'Lawn', code: 'L-1', batchNumber: 'B-2', size: 'M', quantity: 4, unitCost: 45, salePrice: 110 }] })
  const batches = second.database.products.filter((product) => product.code === 'L-1')
  assert.equal(batches.length, 2)
  assert.deepEqual(batches.map((product) => [product.batchNumber, product.stockQuantity, product.supplierId]), [[first.record.batchNumber, 3, supplier.id], [second.record.batchNumber, 4, secondSupplier.record.id]])
  const sold = createSale(second.database, { items: [{ productId: batches[1].id, quantity: 2, price: 110 }], payments: { cash: 220 } })
  assert.deepEqual(sold.database.products.filter((product) => product.code === 'L-1').map((product) => product.stockQuantity), [3, 2])
})

test('held orders reserve and release only the selected product batch', () => {
  const { db: seeded } = seed()
  const db = { ...seeded, products: [
    { id: 'batch-a', name: 'Lawn', code: 'L-1', batchNumber: 'A', stockQuantity: 3, reservedQuantity: 0 },
    { id: 'batch-b', name: 'Lawn', code: 'L-1', batchNumber: 'B', stockQuantity: 4, reservedQuantity: 0 },
  ] }
  const held = recordHeldOrder(db, { items: [{ productId: 'batch-b', quantity: 2 }] })
  assert.deepEqual(held.database.products.map((product) => product.reservedQuantity), [0, 2])
  const released = runDatabaseCommand(held.database, 'discard-held-order', { heldId: held.record.id })
  assert.deepEqual(released.database.products.map((product) => product.reservedQuantity), [0, 0])
})

test('customer returns are limited to the unreturned sold quantity', () => {
  const { db, customer } = seed()
  const saleResult = createSale(db, { items: [{ productId: 'p1', quantity: 2, price: 100 }], customerId: customer.id })
  const returned = processCustomerReturn(saleResult.database, { saleId: saleResult.record.id, productId: 'p1', quantity: 1 })
  assert.equal(returned.database.products[0].stockQuantity, 4)
  assert.equal(returned.database.customers[0].balance, 100)
  const damaged = processCustomerReturn(returned.database, { saleId: saleResult.record.id, productId: 'p1', quantity: 1, condition: 'damaged', refundType: 'cash' })
  assert.equal(damaged.database.products[0].stockQuantity, 4)
  assert.equal(damaged.database.products[0].defectiveQuantity, 1)
  assert.ok(damaged.database.stockMovements.some((movement) => movement.type === 'customer-return-defective'))
})

test('return on a later bill is linked to its original sale and moves stock once', () => {
  const { db, customer } = seed()
  const original = createSale(db, { items: [{ productId: 'p1', quantity: 2, price: 100 }], customerId: customer.id })
  const withOriginalSale = { ...original.database, sales: [original.record] }
  const adjusted = createSale(withOriginalSale, { customerId: customer.id, items: [
    { productId: 'p1', name: 'Lawn', quantity: 2, price: 100 },
    { isReturn: true, returnQuantity: 1, returnCode: 'L-1', returnCondition: 'sellable', originalSaleId: original.record.id, originalSaleLineId: original.record.items[0].lineId, productId: 'p1', quantity: 1, price: -100 },
  ], payments: { cash: 100 } })
  assert.equal(adjusted.record.total, 100)
  assert.equal(adjusted.record.items.find((item) => item.isReturn).price, -100)
  assert.equal(adjusted.database.products[0].stockQuantity, 2)
  assert.equal(adjusted.database.returns[0].refundType, 'sale-adjustment')
  assert.throws(() => createSale(adjusted.database, { customerId: customer.id, items: [
    { productId: 'p1', quantity: 1, price: 100 },
    { isReturn: true, returnQuantity: 2, returnCode: 'L-1', originalSaleId: original.record.id, originalSaleLineId: original.record.items[0].lineId, productId: 'p1', quantity: 2, price: -100 },
  ] }), /Return quantity exceeds/)
})

test('pending cheques do not pay down khata until cleared; returned cleared cheques reverse it', () => {
  const { db, customer } = seed()
  const pending = recordAccountPayment(db, { accountType: 'customer', accountId: customer.id, amount: 60, method: 'cheque' })
  assert.equal(pending.database.customers[0].balance, 0)
  const chequeId = pending.database.cheques[0].id
  const cleared = updateChequeStatus(pending.database, chequeId, 'Cleared')
  assert.equal(cleared.database.customers[0].balance, -60)
  const returned = updateChequeStatus(cleared.database, chequeId, 'Returned')
  assert.equal(returned.database.customers[0].balance, 0)
})

test('cash closing reflects receipts and expenses; backup validates all collections', () => {
  const { db, customer } = seed()
  let next = recordAccountPayment(db, { accountType: 'customer', accountId: customer.id, amount: 90, method: 'cash', date: '2026-09-28' }).database
  next = recordExpense(next, { amount: 20, method: 'cash', date: '2026-09-28' }).database
  assert.equal(calculateDailyClosing(next, '2026-09-28').expectedCash, 70)
  assert.equal(validateBackup(next).version, 2)
})

test('daily closing requires an opening saved for the same date', () => {
  const { db } = seed()
  const date = '2026-10-07'
  assert.throws(
    () => runDatabaseCommand(db, 'daily-record', { type: 'closing', date, amount: 20, counted: 18 }),
    /Save the daily opening/,
  )
  const opened = runDatabaseCommand(db, 'daily-record', { type: 'opening', date, amount: 10 })
  const closed = runDatabaseCommand(opened.database, 'daily-record', { type: 'closing', date, amount: 20, counted: 18 })
  assert.equal(closed.record.type, 'closing')
})

test('daily records can be deleted without leaving a closing without its opening', () => {
  const { db } = seed()
  const date = '2026-10-07'
  const opened = runDatabaseCommand(db, 'daily-record', { type: 'opening', date, amount: 10 })
  const closed = runDatabaseCommand(opened.database, 'daily-record', { type: 'closing', date, amount: 20, counted: 18 })
  assert.throws(
    () => runDatabaseCommand(closed.database, 'delete-daily-record', { recordId: opened.record.id }),
    /Delete the daily closing/,
  )
  const deletedClosing = runDatabaseCommand(closed.database, 'delete-daily-record', { recordId: closed.record.id })
  const deletedOpening = runDatabaseCommand(deletedClosing.database, 'delete-daily-record', { recordId: opened.record.id })
  assert.equal(deletedOpening.database.dailyClosings.length, 0)
  assert.throws(() => runDatabaseCommand(db, 'delete-daily-record', { recordId: 'missing' }), /could not be found/)
})

test('held orders reserve stock until released', () => {
  const { db } = seed()
  const held = recordHeldOrder(db, { items: [{ productId: 'p1', name: 'Lawn', quantity: 4 }] })
  assert.equal(held.database.products[0].reservedQuantity, 4)
  assert.throws(() => createSale(held.database, { items: [{ productId: 'p1', quantity: 2 }] }), /Not enough available stock/)
  const discarded = runDatabaseCommand(held.database, 'discard-held-order', { heldId: held.record.id })
  assert.equal(discarded.database.products[0].reservedQuantity, 0)
  assert.ok(discarded.database.auditHistory.some((entry) => entry.type === 'held-order-discarded'))
})

test('supplier returns decrease stock and supplier balance', () => {
  const { db, supplier } = seed()
  const purchase = receivePurchase(db, { supplierId: supplier.id, items: [{ productId: 'p1', productName: 'Lawn', quantity: 4, unitCost: 50 }] })
  const result = processSupplierReturn(purchase.database, { purchaseId: purchase.record.id, productId: purchase.record.items[0].productId, quantity: 1 })
  assert.equal(result.database.products[0].stockQuantity, 5)
  assert.equal(result.database.products.find((product) => product.purchaseId === purchase.record.id).stockQuantity, 3)
  assert.equal(result.database.suppliers[0].balance, 150)
})

test('defect claims quarantine units and apply an approved supplier credit only once', () => {
  const { db, supplier } = seed()
  const claim = createClaim(db, { productId: 'p1', supplierId: supplier.id, quantity: 2, description: 'Fabric damage' })
  assert.equal(claim.database.products[0].stockQuantity, 3)
  assert.equal(claim.database.products[0].defectiveQuantity, 2)
  const approved = updateClaimStatus(claim.database, claim.record.id, 'Approved')
  assert.equal(approved.database.suppliers[0].balance, -100)
  const repeated = updateClaimStatus(approved.database, claim.record.id, 'Approved')
  assert.equal(repeated.database.suppliers[0].balance, -100)
})

test('settings are included in the application backup and legacy backups migrate', () => {
  const db = createEmptyDatabase()
  const saved = saveSettings(db, { shopName: 'Khata House', stockThreshold: '8', receiptFooter: 'Thanks' })
  assert.equal(validateBackup(saved.database).settings.shopName, 'Khata House')
  const restored = validateBackup({ customers: [{ id: 'old-c1', name: 'Legacy customer', openingBalance: 25 }], savedBills: [{ id: 'old-b1', items: [{ name: 'Legacy suit', quantity: 1, price: 50 }] }], heldBills: [] })
  assert.equal(restored.version, 2)
  assert.equal(restored.customers[0].balance, 25)
  assert.equal(restored.sales[0].items[0].unitPrice, 50)
})

test('business date uses the local calendar day instead of the UTC day', () => {
  assert.equal(localDateString(new Date(2026, 8, 28, 0, 30)), '2026-09-28')
})

test('current-format backups require sales, customers and products to remain linked', () => {
  const { db, customer } = seed()
  const saved = createSale(db, { customerId: customer.id, items: [{ productId: 'p1', quantity: 1, price: 100 }], payments: { cash: 100 } }).database
  assert.doesNotThrow(() => validateBackup(saved))
  const broken = { ...saved, sales: saved.sales.map((sale) => ({ ...sale, customerId: 'missing-customer' })) }
  assert.throws(() => validateBackup(broken), /sale\/customer relationship/)
})

test('report totals deduct separate returns and bill-linked returns exactly once', () => {
  const database = {
    ...createEmptyDatabase(),
    sales: [
      { id: 's1', subtotal: 200, discount: 10, total: 190, items: [{ quantity: 2, unitCostAtSale: 50 }] },
      { id: 's2', subtotal: 50, discount: 0, returnTotal: 20, total: 30, items: [{ quantity: 1, unitCostAtSale: 50 }, { isReturn: true, returnCondition: 'sellable', quantity: 1, unitCostAtSale: 50 }] },
    ],
    returns: [
      { id: 'r1', amount: 20, refundType: 'sale-adjustment' },
      { id: 'r2', amount: 30, refundType: 'cash', condition: 'sellable', quantity: 1, unitCostAtSale: 50 },
    ],
    expenses: [{ id: 'e1', amount: 15 }],
  }
  assert.deepEqual(calculateBusinessTotals(database), {
    grossBilled: 250,
    discounts: 10,
    billReturnAdjustments: 20,
    separateReturnAmount: 30,
    netSales: 190,
    costOfGoods: 50,
    estimatedGrossProfit: 140,
    expenses: 15,
    estimatedNetResult: 125,
  })
})

test('customer and supplier ledgers reconcile to stored balances after returns and cheque reversals', () => {
  let db = createEmptyDatabase()
  const customerResult = createAccount(db, 'customer', { name: 'Customer', openingBalance: 20 }); db = customerResult.database
  const supplierResult = createAccount(db, 'supplier', { name: 'Supplier', supplierCode: 'SP', openingBalance: 10 }); db = supplierResult.database
  db = { ...db, products: [{ id: 'ledger-product', name: 'Lawn', code: 'L-1', stockQuantity: 5, reservedQuantity: 0, defectiveQuantity: 0, salePrice: 100, averageCost: 50 }] }

  const sale = createSale(db, { customerId: customerResult.record.id, items: [{ productId: 'ledger-product', quantity: 2, price: 100 }], payments: { cash: 50, cheque: 20 } })
  let customerDb = recordAccountPayment(sale.database, { accountType: 'customer', accountId: customerResult.record.id, amount: 30, method: 'cash' }).database
  customerDb = processCustomerReturn(customerDb, { saleId: sale.record.id, lineId: sale.record.items[0].lineId, quantity: 1, refundType: 'khata' }).database
  const receivedCheque = customerDb.cheques.find((entry) => entry.partyId === customerResult.record.id)
  customerDb = updateChequeStatus(customerDb, receivedCheque.id, 'Cleared').database
  customerDb = updateChequeStatus(customerDb, receivedCheque.id, 'Returned').database
  const customerLedger = calculateAccountLedger(customerDb, 'customer', customerResult.record.id)
  assert.equal(customerLedger.calculatedBalance, customerDb.customers[0].balance)

  const purchase = receivePurchase(db, { supplierId: supplierResult.record.id, items: [{ productId: 'ledger-product', quantity: 2, unitCost: 50 }], payments: { cash: 50, cheque: 20 } })
  let supplierDb = recordAccountPayment(purchase.database, { accountType: 'supplier', accountId: supplierResult.record.id, amount: 30, method: 'cash' }).database
  supplierDb = processSupplierReturn(supplierDb, { purchaseId: purchase.record.id, purchaseItemId: purchase.record.items[0].lineId, quantity: 1 }).database
  const claim = createClaim(supplierDb, { productId: 'ledger-product', supplierId: supplierResult.record.id, quantity: 1, description: 'Defective piece' })
  supplierDb = updateClaimStatus(claim.database, claim.record.id, 'Approved').database
  const givenCheque = supplierDb.cheques.find((entry) => entry.partyId === supplierResult.record.id)
  supplierDb = updateChequeStatus(supplierDb, givenCheque.id, 'Cleared').database
  supplierDb = updateChequeStatus(supplierDb, givenCheque.id, 'Returned').database
  const supplierLedger = calculateAccountLedger(supplierDb, 'supplier', supplierResult.record.id)
  assert.equal(supplierLedger.calculatedBalance, supplierDb.suppliers[0].balance)
})
