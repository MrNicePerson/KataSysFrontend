import test from 'node:test'
import assert from 'node:assert/strict'
import { stockValuation } from './stockValuation.js'

test('stock valuation excludes reserved units from both value totals', () => {
  const result = stockValuation([
    { id: 'suit', stockQuantity: 10, reservedQuantity: 3, averageCost: 100, salePrice: 180 },
    { id: 'tan', productType: 'tan', stockQuantity: 4, reservedQuantity: 1, averageCost: 2000, salePricePerMeter: 100, metersPerTan: 20 },
  ])
  assert.equal(result.purchaseCost, 7 * 100 + 3 * 2000)
  assert.equal(result.sellingValue, 7 * 180 + 3 * 20 * 100)
  assert.deepEqual(result.reservationIssues, [])
})

test('stock valuation flags reservations above on-hand and skips inactive products', () => {
  const result = stockValuation([
    { id: 'bad', name: 'Bad reserve', stockQuantity: 2, reservedQuantity: 3, averageCost: 100, salePrice: 200 },
    { id: 'inactive', active: false, stockQuantity: 8, reservedQuantity: 0, averageCost: 50, salePrice: 100 },
  ])
  assert.equal(result.purchaseCost, 0)
  assert.equal(result.sellingValue, 0)
  assert.equal(result.reservationIssues.length, 1)
  assert.equal(result.reservationIssues[0].id, 'bad')
})
