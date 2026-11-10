import test from 'node:test'
import assert from 'node:assert/strict'
import { stockValuation } from './stockValuation.js'

test('suits use their selling price and purchase cost', () => {
  assert.deepEqual(stockValuation([{ stockQuantity: 10, averageCost: 6200, salePrice: 7000 }]), { sellingValue: 70000, purchaseCost: 62000, excludedProducts: [] })
})

test('tans use the per meter price and length', () => {
  assert.deepEqual(stockValuation([{ productType: 'tan', stockQuantity: 2, metersPerTan: 50, salePricePerMeter: 140, salePrice: 9000, averageCost: 6200 }]), { sellingValue: 14000, purchaseCost: 12400, excludedProducts: [] })
})

test('missing prices and lengths make the total partial without substituting cost', () => {
  const result = stockValuation([{ id: 'a', name: 'Suit', batchNumber: 'A', stockQuantity: 2, averageCost: 50 }, { id: 'b', name: 'Tan', batchNumber: 'B', productType: 'tan', stockQuantity: 1, salePricePerMeter: 10 }, { stockQuantity: 0, averageCost: 100 }])
  assert.equal(result.sellingValue, 0)
  assert.equal(result.purchaseCost, 100)
  assert.deepEqual(result.excludedProducts, [{ id: 'a', name: 'Suit', batch: 'A', reasons: ['Missing or invalid selling price'] }, { id: 'b', name: 'Tan', batch: 'B', reasons: ['Invalid meters per Tan'] }])
})

test('zero prices and fully reserved products do not produce a warning', () => {
  const result = stockValuation([{ stockQuantity: 1, salePrice: 0 }, { stockQuantity: 3, reservedQuantity: 3 }, { stockQuantity: 0 }])
  assert.equal(result.sellingValue, 0)
  assert.deepEqual(result.excludedProducts, [])
})
