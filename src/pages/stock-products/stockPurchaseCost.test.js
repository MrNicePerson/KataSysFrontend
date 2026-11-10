import test from 'node:test'
import assert from 'node:assert/strict'

const stockPurchaseCost = (products) => products.reduce(
  (sum, product) => sum + Number(product.stockQuantity || 0) * Number(product.averageCost || 0),
  0,
)

test('stock purchase cost uses average purchase cost and current stock, not selling price', () => {
  const products = [
    { id: 'suits', productType: 'suit', stockQuantity: 10, averageCost: 6200, salePrice: 7000 },
    { id: 'tans', productType: 'tan', stockQuantity: 2, averageCost: 12000, salePrice: 15000 },
  ]

  assert.equal(stockPurchaseCost(products), 86000)
})

test('stock purchase cost is calculated from all products regardless of table filtering', () => {
  const products = [
    { id: 'visible', stockQuantity: 10, averageCost: 6200 },
    { id: 'hidden-by-search', stockQuantity: 3, averageCost: 1000 },
  ]
  const filtered = products.filter((product) => product.id === 'visible')

  assert.equal(stockPurchaseCost(products), 65000)
  assert.equal(stockPurchaseCost(filtered), 62000)
})
