import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDeliveryPrice, deliveryPriceForSave } from './deliveryPrice.js'

test('a default zero begins empty so typed or pasted digits replace the placeholder', () => {
  let value = initialDeliveryPrice(0)
  assert.equal(value, '')
  for (const digit of '5095') value += digit
  assert.equal(value, '5095')
  assert.equal(deliveryPriceForSave(value), '5095')
})

test('explicit zero, whole and decimal prices remain strings during editing', () => {
  for (const value of ['0', '10', '0.50']) assert.equal(deliveryPriceForSave(value), value)
  assert.equal(initialDeliveryPrice(10), '10')
  assert.equal(initialDeliveryPrice('0.50'), '0.50')
  assert.equal(deliveryPriceForSave(''), 0)
})
