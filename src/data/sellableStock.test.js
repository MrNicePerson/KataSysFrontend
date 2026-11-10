import test from 'node:test'
import assert from 'node:assert/strict'
import { sellableProducts } from './sellableStock.js'

test('last sellable unit disappears after stock refresh', () => {
  const product = { id: 'a', stockQuantity: 2, reservedQuantity: 1, defectiveQuantity: 3 }
  assert.deepEqual(sellableProducts([product]).map((item) => item.id), ['a'])
  assert.deepEqual(sellableProducts([{ ...product, stockQuantity: 1 }]), [])
})

test('availability is checked per batch and excludes reserved and inactive stock', () => {
  const batches = [
    { id: 'sold-out', code: 'ABC', batchNumber: 'A', stockQuantity: 0 },
    { id: 'available', code: 'ABC', batchNumber: 'B', stockQuantity: 1 },
    { id: 'reserved', code: 'ABC', batchNumber: 'C', stockQuantity: 1, reservedQuantity: 1 },
    { id: 'inactive', code: 'ABC', stockQuantity: 1, active: false },
  ]
  assert.deepEqual(sellableProducts(batches).map((item) => item.id), ['available'])
})
