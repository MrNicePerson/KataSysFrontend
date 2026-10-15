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
    const isImageAsset = /\.(?:png|jpe?g|svg)$/i.test(new URL(target).pathname)
    const replacement = target.endsWith('.jsx')
      ? await componentUrl(target)
      : isImageAsset
        ? `data:text/javascript;base64,${Buffer.from(`export default ${JSON.stringify(target)}`).toString('base64')}`
        : target
    resolved = resolved.replace(`from "${name}"`, `from ${JSON.stringify(replacement)}`)
  }
  return `data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`
}

const { default: ReceiveStock } = await loadComponent('../pages/receive-stock/ReceiveStock.jsx')
const { default: SupplierReturns } = await loadComponent('../pages/supplier-returns/SupplierReturns.jsx')
const { default: StockMovements } = await loadComponent('../components/StockMovements/StockMovements.jsx')
const { default: Suppliers } = await loadComponent('../pages/suppliers/Suppliers.jsx')
const { default: ReceivingDetails } = await loadComponent('../components/ReceivingDetails/ReceivingDetails.jsx')
const { default: BillReceipt } = await loadComponent('../pages/bill-receipt/BillReceipt.jsx')
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
  for (const expected of ['Receive Stock history (1)', bill.batchNumber, 'Item / Article', 'Lawn', 'Rs. 400']) assert.ok(history.includes(expected), expected)
  assert.equal(receivingForProduct({ id: 'old-product', batchNumber: 'UNKNOWN' }, [purchase]), null)
})

test('supplier stock and cheque history can be recovered from receiving bills when old links are missing', () => {
  const purchase = {
    ...bill,
    cheques: [{ number: 'CH-OLD', bank: 'HBL', amount: 75, issued: '2026-10-12' }],
    items: [{ ...bill.items[0], productId: undefined, code: 'ART-OLD', quantity: 3 }],
  }
  const product = { id: 'legacy-product', name: 'Legacy article', code: 'ART-OLD', batchNumber: bill.batchNumber, stockQuantity: 3, reservedQuantity: 0 }
  const html = render(Suppliers, {
    suppliers: [{ id: 's1', name: 'Ali Imran', supplierCode: 'AA', balance: 0 }],
    products: [product],
    purchases: [purchase],
  })
  assert.ok(html.includes('Stock batches (1) · cheques (1 pending / 0 cleared)'))
  assert.ok(html.includes('Legacy article'))
  assert.ok(html.includes('Receive Stock history (1)'))
  assert.ok(html.includes('CH-OLD'))
})

test('supplier receiving details include a printable itemized bill and payment balance', () => {
  const purchase = { ...bill, total: 200, paid: 50, due: 150, payments: { cash: 50 }, items: [{ ...bill.items[0], productName: 'Brand', articleNumber: 'ART-204', season: 'Winter', quantity: 2, unitCost: 100, salePrice: 150 }] }
  const linkedCheques = [{ id: 'cheque-1', referenceId: purchase.id, number: 'CH-100', bank: 'HBL', amount: 75, issued: '2026-10-12', expectedClearanceDate: '2026-10-20', status: 'Pending' }, { id: 'cheque-2', referenceId: purchase.id, number: 'CH-101', bank: 'UBL', amount: 75, issued: '2026-10-12', status: 'Pending' }]
  const html = render(ReceivingDetails, { purchase, supplier: { id: 's1', name: 'Ali Imran', supplierCode: 'AA' }, cheques: linkedCheques })
  for (const expected of ['Print receiving bill', 'SUPPLIER STOCK RECEIVING BILL', 'ART-204', 'Brand: Brand', 'Winter', 'Total purchase amount', 'Amount paid (cash / bank)', 'Remaining supplier due', 'Cheques (2)', 'CH-100', 'CH-101', 'HBL', 'UBL', '2026-10-20', 'Supplier signature']) assert.ok(html.includes(expected), expected)
  assert.ok(!html.includes('details not saved'))
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
  assert.ok(!html.includes('Reprint'))
  assert.ok(!html.includes('Edit receipt'))
  assert.ok(!html.includes('>View<'))
})

test('receipt prints the saved article name instead of the product brand name', () => {
  const html = render(BillReceipt, { bill: { number: 'INV-001', date: '2026-10-03', customer: 'Ali', items: [{ name: 'Brand Name', articleName: 'ART-204', quantity: 1, price: 100 }], total: 100, paid: 100 } })
  assert.ok(html.includes('ART-204'))
  assert.ok(!html.includes('Brand Name'))
})

test('reopened invoice renders separately persisted cheque details after a workspace reload', async () => {
  const { receiptBill } = await import('./receiptBill.js')
  const saved = JSON.parse(JSON.stringify({ id: 'sale-67', number: 'INV-0067', total: 500, due: 470, payments: { cash: 10, bank: 20, cheque: 19.8 }, items: [{ name: 'Article', quantity: 10, price: 50 }] }))
  const register = [{ id: 'ch-67', referenceId: saved.id, number: 'CH-REGRESSION', bank: 'Test Bank', amount: 19.8, issued: '2026-10-15', status: 'Pending' }]
  const html = render(BillReceipt, { bill: receiptBill(saved, register) })
  for (const expected of ['INV-0067', 'CH-REGRESSION', 'Test Bank', '15-10-2026', '19.8', '470']) assert.ok(html.includes(expected), expected)
  assert.ok(!html.includes('Details unavailable'))
  assert.ok(!html.includes('Individual cheque information was not saved'))
})

test('receipt resolves article from stock and prints cheque details with the software credit', () => {
  const html = render(BillReceipt, {
    products: [{ id: 'product-1', name: 'Brand Name', article: 'ART-310' }],
    bill: {
      id: 'sale-1', number: 'INV-002', items: [{ productId: 'product-1', name: 'Brand Name', quantity: 1, price: 500 }],
      payments: { cash: 200, cheque: 300 }, total: 500,
      cheques: [{ id: 'ch-1', number: 'CH-22', bank: 'HBL', amount: 300, issued: '2026-10-12', expectedClearanceDate: '2026-10-20', status: 'Pending' }],
    },
  })
  for (const expected of ['ART-310', 'Cheque Details', 'CH-22', 'HBL', '20-10-2026', 'Pending', 'Software by Crown Software House', '03197794021']) assert.ok(html.includes(expected), expected)
  assert.ok(!html.includes('Brand Name'))
})
