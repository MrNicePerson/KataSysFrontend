import test from 'node:test'
import assert from 'node:assert/strict'
import { stockValuation } from './stockValuation.js'

test('suits use their selling price and purchase cost', () => {
  assert.deepEqual(stockValuation([{ stockQuantity: 10, averageCost: 6200, salePrice: 7000 }]), { sellingValue: 70000, purchaseCost: 62000, missingPrices: 0 })
})

test('tans use the per meter price and length', () => {
  assert.deepEqual(stockValuation([{ productType: 'tan', stockQuantity: 2, metersPerTan: 50, salePricePerMeter: 140, salePrice: 9000, averageCost: 6200 }]), { sellingValue: 14000, purchaseCost: 12400, missingPrices: 0 })
})

test('missing prices and lengths make the total partial without substituting cost', () => {
  assert.deepEqual(stockValuation([{ stockQuantity: 2, averageCost: 50 }, { productType: 'tan', stockQuantity: 1, salePricePerMeter: 10 }, { stockQuantity: 0, averageCost: 100 }]), { sellingValue: 0, purchaseCost: 100, missingPrices: 2 })
})
