import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'rolldown/utils'
import { createEmptyDatabase, createAccount, receivePurchase } from '../../data/businessLogic.js'

async function componentUrl(url) {
  const path = new URL(url)
  const { code } = transformSync(path.pathname, await readFile(path, 'utf8'), { jsx: { runtime: 'automatic' } })
  let resolved = code
  for (const match of code.matchAll(/from "([^"]+)"/g)) {
    const name = match[1]
    const target = name.startsWith('.') ? new URL(name, path).href : import.meta.resolve(name)
    resolved = resolved.replace(`from "${name}"`, `from ${JSON.stringify(target.endsWith('.jsx') ? await componentUrl(target) : target)}`)
  }
  return `data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`
}
const { default: NewDeliveryModal, AddedStockCard, PaymentDetails, calculateStockPayment, prepareStockPayment, getReceivingBanks } = await import(await componentUrl(new URL('./NewDeliveryModal.jsx', import.meta.url).href))
const render = (items) => renderToStaticMarkup(createElement(AddedStockCard, { items, onRemove() {} }))
const item = { id: 'one', productName: 'Lawn Suit', articleNumber: 'L-1', batchNumber: 'BATCH-01', season: 'Summer', quantity: 3, unitCost: 1250.25, salePrice: 1700.5 }

test('added stock renders all details and the same purchase total as the backend', () => {
  const supplier = createAccount(createEmptyDatabase(), 'supplier', { name: 'Textiles', supplierCode: 'TX' })
  const purchase = receivePurchase(supplier.database, { supplierId: supplier.record.id, items: [item] })
  assert.equal(purchase.record.total, 3750.75)
  const html = render([item])
  for (const detail of ['Lawn Suit', 'BATCH-01', 'Quantity', '3 suits', 'Cost per suit', 'Rs. 1,250.25', 'Sale price per suit', 'Rs. 1,700.50', 'Total purchase cost', 'Total cost', 'Rs. 3,750.75']) {
    assert.ok(html.includes(detail), `Missing stock detail: ${detail}`)
  }
})

test('multiple batches retain independent prices, including a zero-cost single suit', () => {
  const html = render([item, { ...item, id: 'two', productName: '', articleNumber: 'A-2', batchNumber: 'BATCH-02', quantity: 1, unitCost: 0, salePrice: 500 }])
  assert.equal((html.match(/<li /g) || []).length, 2)
  for (const detail of ['2 items', 'BATCH-01', 'BATCH-02', 'A-2', '1 suit', 'Rs. 0.00', 'Rs. 500.00', 'Rs. 3,750.75']) assert.ok(html.includes(detail))
})

test('removing an entry targets its id and renders the empty state', () => {
  let items = [item]
  const tree = AddedStockCard({ items, onRemove: (id) => { items = items.filter((entry) => entry.id !== id) } })
  const findButton = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.map(findButton).find(Boolean)
    return node.type === 'button' ? node : findButton(node.props?.children)
  }
  findButton(tree).props.onClick()
  const html = render(items)
  assert.ok(html.includes('0 items'))
  assert.ok(html.includes('As you add stock, it will appear here.'))
  assert.ok(!html.includes('BATCH-01'))
})

test('product and batch text are safely escaped', () => {
  const html = render([{ ...item, productName: '<script>alert(1)</script>', batchNumber: '<b>batch</b>' }])
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;b&gt;batch&lt;/b&gt;'))
})

test('new and existing deliveries expose separate receiving workflows', () => {
  const suppliers = [{ id: 'supplier-1', name: 'Textiles', supplierCode: 'TX' }]
  const newDelivery = renderToStaticMarkup(createElement(NewDeliveryModal, { suppliers, purchases: [], onClose() {}, onSave() {} }))
  assert.ok(newDelivery.includes('+ Add Item to Delivery'))
  assert.ok(newDelivery.includes('Save Delivery &amp; Add Stock'))
  assert.ok(!newDelivery.includes('+ Add Stock to This Delivery'))
  const existingDelivery = renderToStaticMarkup(createElement(NewDeliveryModal, {
    suppliers,
    purchases: [{ id: 'purchase-1', supplierId: 'supplier-1', date: '2026-10-18', batchNumber: 'TX-18102026-001', supplierBillNumber: 1, items: [item], total: 3750.75, paid: 0, due: 3750.75, payments: { cash: 0 } }],
    initialPurchase: { id: 'purchase-1', supplierId: 'supplier-1', date: '2026-10-18', batchNumber: 'TX-18102026-001', supplierBillNumber: 1, items: [item], total: 3750.75, paid: 0, due: 3750.75, payments: { cash: 0 } },
    onClose() {},
    onSave() {},
  }))
  assert.ok(existingDelivery.includes('+ Add Stock to This Delivery'))
  assert.ok(existingDelivery.includes('Save delivery changes'))
  assert.ok(!existingDelivery.includes('Save Delivery &amp; Add Stock'))
})

test('stock payment summary recalculates for additions, removals, partial and full payments', () => {
  assert.deepEqual(calculateStockPayment([], ''), { total: 0, paid: 0, remaining: 0, error: '' })
  const items = [item, { ...item, quantity: 2, unitCost: 100 }]
  assert.deepEqual(calculateStockPayment(items, '1000.25'), { total: 3950.75, paid: 1000.25, remaining: 2950.5, error: '' })
  assert.equal(calculateStockPayment([item], '1000.25').remaining, 2750.5)
  assert.equal(calculateStockPayment([item], '3750.75').remaining, 0)
  assert.ok(calculateStockPayment([], '100').error)
})

test('invalid and excessive payments cannot be submitted', () => {
  for (const amount of ['-1', 'invalid', 'Infinity', '4000']) {
    const result = prepareStockPayment([item], amount, 'cash')
    assert.ok(result.error, `Should reject ${amount}`)
    assert.equal(result.payments, undefined)
  }
})

test('cash payment summary agrees with the saved backend purchase and stock', () => {
  const supplier = createAccount(createEmptyDatabase(), 'supplier', { name: 'Textiles', supplierCode: 'TX' })
  const payment = prepareStockPayment([item], '1000.25', 'cash')
  const { record, database } = receivePurchase(supplier.database, { supplierId: supplier.record.id, items: [item], ...payment })
  const summary = calculateStockPayment([item], '1000.25')
  assert.equal(record.total, summary.total)
  assert.equal(record.paid, summary.paid)
  assert.equal(record.due, summary.remaining)
  assert.equal(database.products[0].stockQuantity, 3)
})

test('deferred methods never create cash, bank or cheque payments from a preview', () => {
  assert.deepEqual(prepareStockPayment([item], '0', 'split', {}, [], { cash: 100, bank: 0 }).payments, { cash: 100, bank: 0, cheque: 0 })
  assert.ok(prepareStockPayment([item], '100', 'cheque').error)
  assert.ok(prepareStockPayment([item], '0', 'cheque').error)
})

test('bank receiving saves only the selected bank name and payment amount', () => {
  const supplier = createAccount(createEmptyDatabase(), 'supplier', { name: 'Textiles', supplierCode: 'TX' })
  const payment = prepareStockPayment([item], '1000.25', 'bank', { bankName: ' Sample Bank ', accountNumber: ' 00123 ' })
  assert.deepEqual(payment.payments, { cash: 0, bank: 1000.25, cheque: 0 })
  const { record, database } = receivePurchase(supplier.database, { supplierId: supplier.record.id, items: [item], ...payment })
  const expected = { bankName: 'Sample Bank', accountNumber: '', amount: 1000.25 }
  assert.deepEqual(record.bankDetails, expected)
  assert.deepEqual(database.payments[0].bankDetails, expected)
  assert.equal(database.payments[0].method, 'bank')
  assert.equal(record.paid, 1000.25)
  assert.equal(record.due, 2750.5)
  assert.equal(database.suppliers[0].balance, 2750.5)
  assert.equal(database.products[0].stockQuantity, 3)
})

test('bank validation requires a name, allows no account number and rejects overpayment', () => {
  assert.ok(prepareStockPayment([item], '100', 'bank').error)
  assert.ok(prepareStockPayment([item], '100', 'bank', { bankName: '  ' }).error)
  assert.ok(prepareStockPayment([item], '4000', 'bank', { bankName: 'Bank' }).error)
  assert.deepEqual(prepareStockPayment([item], '3750.75', 'bank', { bankName: 'Bank', accountNumber: 'ignored' }).bankDetails, { bankName: 'Bank', amount: 3750.75 })
  const cash = prepareStockPayment([item], '100', 'cash', { bankName: 'Bank', accountNumber: '123' })
  assert.equal(cash.bankDetails, undefined)
  assert.deepEqual(cash.payments, { cash: 100, bank: 0, cheque: 0 })
})

test('split payment combines cash, bank and multiple cheques without exceeding stock cost', () => {
  const cheques = [
    { number: 'C1', bank: 'Bank A', amount: '500', issued: '2026-10-03', expectedClearanceDate: '' },
    { number: 'C2', bank: 'Bank B', amount: '250', issued: '2026-10-03', expectedClearanceDate: '' },
  ]
  const payment = prepareStockPayment([item], '0', 'split', { bankName: 'Main Bank', accountNumber: 'A-1' }, cheques, { cash: '1000', bank: '1000' })
  assert.deepEqual(payment.payments, { cash: 1000, bank: 1000, cheque: 750 })
  assert.equal(payment.cheques.length, 2)
  assert.ok(prepareStockPayment([item], '0', 'split', { bankName: 'Main Bank' }, cheques, { cash: '3000', bank: '1000' }).error)
  assert.ok(prepareStockPayment([item], '0', 'split', {}, [], { cash: '100', bank: '100' }).error)
})

test('previous receiving accounts are not shown in the payment form', () => {
  const banks = getReceivingBanks([
    {}, { bankDetails: { bankName: 'Bank', accountNumber: '001' } },
    { bankDetails: { bankName: ' bank ', accountNumber: '001' } },
    { bankDetails: { bankName: 'Bank', accountNumber: '002' } },
    { bankDetails: { bankName: 'Other Bank' } },
  ])
  assert.equal(banks.length, 3)
  const html = renderToStaticMarkup(createElement(PaymentDetails, {
    items: [item], method: 'bank', amountPaid: '100', banks,
    selectedBank: banks[0].key, bankDetails: banks[0],
  }))
  for (const text of ['Bank logos', 'Bank Name', 'Payment Amount']) assert.ok(html.includes(text))
  for (const text of ['Previously used bank account', 'Enter bank / account details', 'Account (optional)', '>001<', '>002<']) assert.ok(!html.includes(text))
  assert.ok(!html.includes('available for preview'))
  const cash = renderToStaticMarkup(createElement(PaymentDetails, { items: [item], method: 'cash', amountPaid: '0' }))
  assert.ok(!cash.includes('Bank logos'))
})

test('payment UI shows the totals and all four selectable methods', () => {
  const props = { items: [item], method: 'bank', amountPaid: '1000.25', onMethodChange() {}, onAmountChange() {} }
  const html = renderToStaticMarkup(createElement(PaymentDetails, props))
  for (const text of ['Payment Details', 'Total Stock Cost', 'Amount Paid', 'Remaining Supplier Balance', 'Rs. 3,750.75', 'Rs. 1,000.25', 'Rs. 2,750.50', 'Cash', 'Bank', 'Cheque', 'Split Payment']) assert.ok(html.includes(text), text)
  assert.equal((html.match(/type="radio"/g) || []).length, 4)
  assert.equal((html.match(/checked=""/g) || []).length, 1)
  const empty = renderToStaticMarkup(createElement(PaymentDetails, { ...props, items: [], amountPaid: '0' }))
  assert.ok(empty.includes('Add stock items to enter payment details.'))
  assert.ok(empty.includes('disabled=""'))
})

test('cheque payment totals appear in the delivery-only amount paid and remaining balance', () => {
  const html = renderToStaticMarkup(createElement(PaymentDetails, {
    items: [item],
    method: 'cheque',
    amountPaid: '0',
    cheques: [{ id: 'cheque-1', number: 'CH-1', bank: 'Bank', amount: '150' }],
  }))
  assert.ok(html.includes('Rs. 150.00'))
  assert.ok(html.includes('Rs. 3,600.75'))
})

test('added stock sidebar keeps a compact payment breakdown beside the items', () => {
  const html = renderToStaticMarkup(createElement(AddedStockCard, {
    items: [item], onRemove() {}, paymentMethod: 'split', splitCash: '100', splitBank: '200',
    bankDetails: { bankName: 'Main Bank', accountNumber: '001' },
    cheques: [{ id: 'c1', number: 'CH-1', bank: 'Cheque Bank', amount: 300 }],
  }))
  for (const text of ['Article Name', 'Quantity', 'Batch number', 'Cost per suit', 'Sale price per suit', 'Total cost', 'Payment Summary', 'Stock Total', 'Cash Paid', 'Bank Paid', 'Cheque Paid', 'Total Paid', 'Remaining Supplier Balance', 'Rs. 100.00', 'Rs. 200.00', 'Rs. 300.00', 'Rs. 600.00', 'Main Bank', 'CH-1', 'Cheque Bank']) assert.ok(html.includes(text), text)
})
