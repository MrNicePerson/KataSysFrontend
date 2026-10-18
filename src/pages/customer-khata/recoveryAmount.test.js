import test from 'node:test'
import assert from 'node:assert/strict'
import { focusNextRecoveryField, normalizeRecoveryAmount, recoveryLines } from './recoveryAmount.js'

test('recovery amount replaces leading zero without changing decimals', () => {
  assert.equal(normalizeRecoveryAmount('0500'), '500')
  assert.equal(normalizeRecoveryAmount('000.50'), '0.50')
  assert.equal(normalizeRecoveryAmount('0'), '0')
  assert.equal(normalizeRecoveryAmount(''), '')
})

test('Recovery All sends only customers with an entered positive amount', () => {
  const customers = [{ id: 'ali' }, { id: 'khan' }, { id: 'skip' }]
  assert.deepEqual(recoveryLines(customers, { ali: '5000', khan: '8000', skip: '0' }), [
    { accountId: 'ali', amount: 5000 }, { accountId: 'khan', amount: 8000 },
  ])
})

test('Enter moves between recovery inputs without submitting the form', () => {
  const first = { focus() { this.focused = true } }
  const second = { focus() { this.focused = true } }
  const root = { querySelectorAll: () => [first, second] }
  const event = { key: 'Enter', currentTarget: first, preventDefault() { this.prevented = true }, stopPropagation() { this.stopped = true } }
  assert.equal(focusNextRecoveryField(event, root), true)
  assert.equal(second.focused, true)
  assert.equal(event.prevented, true)
  assert.equal(event.stopped, true)
  const last = { ...event, currentTarget: second, prevented: false }
  focusNextRecoveryField(last, root)
  assert.equal(last.prevented, true)
})
