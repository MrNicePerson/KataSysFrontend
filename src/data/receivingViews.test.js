import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformSync } from 'rolldown/utils'
import { receivingLabel, receivingBatchPreview } from './receiving.js'
import { receivingForProduct } from './receivingTrace.js'

async function loadComponent(relative) {
  return import(await componentUrl(new URL(relative, import.meta.url).href))
}

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

const { default: ReceiveStock } = await loadComponent('../pages/receive-stock/ReceiveStock.jsx')
const { default: SupplierReturns } = await loadComponent('../pages/supplier-returns/SupplierReturns.jsx')
const { default: StockMovements } = await loadComponent('../components/StockMovements/StockMovements.jsx')
const { default: Suppliers } = await loadComponent('../pages/suppliers/Suppliers.jsx')
const { default: ReceivingDetails } = await loadComponent('../components/ReceivingDetails/ReceivingDetails.jsx')
const { default: StockProducts } = await loadComponent('../pages/stock-products/StockProducts.jsx')
const { default: Sidebar } = await loadComponent('../components/Sidebar/Sidebar.jsx')
const { default: BillsReceipts } = await loadComponent('../pages/bills-receipts/BillsReceipts.jsx')
const { default: CustomerKhata } = await loadComponent('../pages/customer-khata/CustomerKhata.jsx')
const { default: RecoveryAll } = await loadComponent('../pages/customer-khata/RecoveryAll.jsx')
const bill = { id: 'bill-1', batchNumber: 'AA-03102026-001', supplierBillNumber: 1, reference: 'PUR-OLD', supplierId: 's1', supplier: 'Ali Imran', date: '2026-10-03', total: 100, paid: 0, due: 100, items: [{ lineId: 'line1', productId: 'p1', productName: 'Lawn', batchNumber: 'AA-03102026-001', quantity: 1 }] }
const render = (component, props) => renderToStaticMarkup(createElement(component, props))

test('Customer Khata keeps Recovery All and New customer, with one vertical cash screen for every customer', () => {
  const customers = [
    { id: 'ali', name: 'Ali Store', balance: 15000, openingBalance: 15000 },
    { id: 'khan', name: 'Khan Store', balance: 8000, openingBalance: 8000 },
    { id: 'advance', name: 'Advance Store', balance: -500, openingBalance: -500 },
  ]
  const page = render(CustomerKhata, { customers })
  assert.match(page, /Recovery All/)
  assert.match(page, /New customer/)
  assert.doesNotMatch(page, /Bulk recovery|New installment plan/)
  const screen = render(RecoveryAll, { customers, onClose() {}, onSave() {} })
  for (const customer of customers) assert.match(screen, new RegExp(customer.name))
  assert.match(screen, /Total Current Recoverable Balance/)
  assert.match(screen, /Total Cash Recovery Entered/)
  assert.match(screen, /Total Remaining Balance/)
  assert.match(screen, /Save All Recoveries/)
  assert.match(screen, /Advance · no recovery/)
  assert.doesNotMatch(screen, /Bank recovery|New installment plan/)
})

test('receiving list, return history and supplier purchase ledger display the bill batch', () => {
  const stock = render(ReceiveStock, { purchases: [bill] })
  const returns = render(SupplierReturns, { purchases: [bill], returns: [{ id: 'ret1', purchaseId: bill.id, itemName: 'Lawn', quantity: 1 }] })
  const suppliers = render(Suppliers, { suppliers: [{ id: 's1', name: 'Ali Imran', balance: 100 }], purchases: [bill] })
  for (const html of [stock, returns, suppliers]) {
    assert.ok(html.includes(bill.batchNumber))
    assert.ok(!html.includes('PUR-OLD'))
  }
  assert.ok(stock.includes('Batch Number'))
})

test('old receiving records without batch or item fields still render', () => {
  const legacy = { id: 'old1', reference: 'PUR-201', supplier: 'Legacy', total: 10 }
  assert.equal(receivingLabel(legacy), 'PUR-201')
  assert.ok(render(ReceiveStock, { purchases: [legacy] }).includes('PUR-201'))
  assert.ok(render(SupplierReturns, { purchases: [legacy] }).includes('PUR-201'))
})

test('reports resolve receiving movements without changing sales and adjustment references', () => {
  const html = render(StockMovements, { purchases: [bill], movements: [
    { id: 'm1', type: 'purchase', referenceId: bill.id, note: 'PUR-OLD', quantity: 1 },
    { id: 'm2', type: 'sale', referenceId: 'receipt-id', note: 'INV-004', quantity: -1 },
    { id: 'm3', type: 'adjustment', referenceId: 'ADJ-001', quantity: 1 },
  ] })
  assert.ok(html.includes(bill.batchNumber))
  assert.ok(!html.includes('PUR-OLD'))
  assert.ok(html.includes('INV-004'))
  assert.ok(html.includes('ADJ-001'))
})

test('modal preview follows the selected supplier and date for all draft items', () => {
  const supplier = { id: 's1', supplierCode: 'AA' }
  assert.equal(receivingBatchPreview(supplier, '2026-10-05', [bill]), 'AA-05102026-002')
  assert.equal(receivingBatchPreview({ id: 's2', supplierCode: 'BB' }, '2026-10-05', [bill]), 'BB-05102026-001')
  assert.equal(receivingBatchPreview(supplier, '2026-10-06', [{ ...bill, supplierBillNumber: 8 }]), 'AA-06102026-009')
  assert.equal(receivingBatchPreview({}, '2026-10-05', [bill]), '')
})

test('saved receiving bill resolves to product and renders its original quantities and costs', () => {
  const purchase = { ...bill, supplierCode: 'AA', items: [{ ...bill.items[0], quantity: 4, unitCost: 100, salePrice: 150 }], total: 400 }
  const product = { id: 'p1', name: 'Lawn', code: 'L-1', supplierId: 's1', purchaseId: bill.id, batchNumber: bill.batchNumber, stockQuantity: 2, averageCost: 120, salePrice: 170 }
  assert.equal(receivingForProduct(product, [purchase]).quantity, 4)
  const details = render(ReceivingDetails, { purchase, supplier: { id: 's1', name: 'Ali Imran', supplierCode: 'CHANGED' } })
  for (const expected of [bill.batchNumber, 'Ali Imran', 'AA', '2026-10-03', 'bill-1', 'Lawn', '4 suits', 'Rs. 100', 'Rs. 150', 'Rs. 400']) assert.ok(details.includes(expected), expected)
  const stock = render(StockProducts, { products: [product], purchases: [purchase], suppliers: [{ id: 's1', name: 'Ali Imran' }] })
  for (const expected of ['L-1', 'Brand Name: Lawn', 'Ali Imran', bill.batchNumber, 'Available', 'Cost per suit', 'Review stock', 'Export stock CSV']) assert.ok(stock.includes(expected), expected)
  assert.ok(!stock.includes('Location'))
  assert.ok(!stock.includes('Reserved'))
  assert.ok(!stock.includes('Print product labels'))
  assert.ok(!stock.includes('Export stock audit'))
  assert.ok(!stock.includes('>Details<'))
  assert.ok(!stock.includes('>Adjust<'))
  const history = render(Suppliers, { suppliers: [{ id: 's1', name: 'Ali Imran', supplierCode: 'AA', balance: 400 }], products: [product], purchases: [purchase] })
  for (const expected of ['Receive Stock history (1)', bill.batchNumber, 'Product', 'Lawn', 'Rs. 400']) assert.ok(history.includes(expected), expected)
  assert.equal(receivingForProduct({ id: 'old-product', batchNumber: 'UNKNOWN' }, [purchase]), null)
})

test('keyboard sidebar exposes every top-level page and respects permissions', () => {
  const all = render(Sidebar, { activePage: 'new-sale', role: 'admin' })
  for (const label of ['New sale', 'New customer', 'Bills &amp; receipts', 'Customer returns', 'Orders &amp; held bills', 'Stock &amp; products', 'Receive stock', 'Supplier returns', 'Defects &amp; claims', 'Suppliers', 'Customer khata', 'Cheque register', 'Shop expenses', 'Daily closing', 'Reports', 'Settings']) {
    assert.ok(all.includes(label), label)
  }
  const restricted = render(Sidebar, { activePage: 'stock', role: 'staff', permissions: { stock: true } })
  assert.ok(restricted.includes('Receive stock'))
  assert.ok(!restricted.includes('New customer'))
  assert.ok(!restricted.includes('Settings'))
})

test('saved bills expose keyboard-selectable rows with one review-and-edit action', () => {
  const sale = { id: 'sale-1', number: 'INV-001', customer: 'Ali', date: '2026-10-03', total: 100, items: [{ lineId: 'line-1', name: 'Lawn', quantity: 1, price: 100 }] }
  const html = render(BillsReceipts, { bills: [sale], onUpdateReceipt() {}, onUpdateBill() {}, onViewInvoice() {} })
  assert.ok(html.includes('data-keyboard-list'))
  assert.ok(html.includes('data-keyboard-row'))
  assert.ok(html.includes('data-keyboard-primary'))
  assert.ok(html.includes('Review and edit bill'))
  assert.ok(!html.includes('Edit receipt'))
  assert.ok(!html.includes('>View<'))
})
