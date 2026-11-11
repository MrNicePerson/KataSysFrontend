import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesProductSearch, exactProductMatch } from './productSearch.js'
import { sellableProducts } from './sellableStock.js'

test('renamed article is found by its name with underscores or spaces', () => {
  const product = { id: 'same-id', name: 'Brand', article: 'Fiza_Noor', code: 'Fiza_Noor', batchNumber: 'B1', stockQuantity: 1 }
  for (const query of ['Fiza_Noor', 'fiza noor', 'Fiza-Noor']) {
    assert.equal(matchesProductSearch(product, query), true)
    assert.equal(exactProductMatch(product, query), true)
  }
  assert.equal(sellableProducts([product])[0].id, 'same-id')
  assert.deepEqual(sellableProducts([{ ...product, stockQuantity: 0 }]), [])
})
