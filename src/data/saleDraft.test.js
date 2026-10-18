import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareSaleDraft } from './saleDraft.js'

test('sale edit drafts keep persisted line ids and give legacy lines editable row ids', () => {
  const draft = prepareSaleDraft({ items: [
    { lineId: 'line-1', quantity: 2 },
    { id: 'existing-row', lineId: 'line-2', quantity: 1 },
    { quantity: 3 },
  ] })

  assert.deepEqual(draft.items.map((item) => item.id), ['line-1', 'existing-row', 'draft-item-3'])
  assert.deepEqual(draft.items.map((item) => item.lineId), ['line-1', 'line-2', undefined])
})

test('sale draft normalization preserves other bill fields and handles empty drafts', () => {
  assert.deepEqual(prepareSaleDraft({ number: 'INV-1', items: [] }), { number: 'INV-1', items: [] })
  assert.deepEqual(prepareSaleDraft(null), { items: [] })
})
