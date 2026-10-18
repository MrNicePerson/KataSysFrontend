import test from 'node:test'
import assert from 'node:assert/strict'
import { planStockAdjustments } from './stockAudit.js'

test('stock audit changes available stock while preserving reservations', () => {
  const products = [
    { id: 'add', stockQuantity: 10, reservedQuantity: 2 },
    { id: 'remove', stockQuantity: 10, reservedQuantity: 2 },
    { id: 'same', stockQuantity: 10, reservedQuantity: 2 },
  ]
  assert.deepEqual(planStockAdjustments([
    { productId: 'add', countedAvailable: 12 },
    { productId: 'remove', countedAvailable: 3 },
    { productId: 'same', countedAvailable: 8 },
  ], products), [
    { productId: 'add', direction: 'add', quantity: 4 },
    { productId: 'remove', direction: 'remove', quantity: 5 },
  ])
})

test('stock audit rejects an item not present in the loaded stock list', () => {
  assert.throws(() => planStockAdjustments([{ productId: 'missing', countedAvailable: 2 }], []), /stock item could not be found/)
})
