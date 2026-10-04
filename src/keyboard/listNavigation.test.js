import test from 'node:test'
import assert from 'node:assert/strict'
import { handleKeyboardListKeyDown } from './listNavigation.js'
import { preventRepeatedActionKey } from './actionRepeatGuard.js'

function event(key, target, extra = {}) {
  return { key, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, ...extra }
}

function fixture() {
  const rows = [0, 1, 2].map((index) => ({ index, focus() { this.focused = true }, querySelector: () => null }))
  const list = { contains: (row) => rows.includes(row), querySelectorAll: () => rows }
  for (const row of rows) row.closest = (selector) => selector === '[data-keyboard-list]' ? list : selector === '[data-keyboard-row]' ? row : null
  return { rows, list }
}

test('arrows navigate list rows and Enter opens only an explicit safe primary action', () => {
  const { rows } = fixture()
  let opened = 0
  rows[1].querySelector = () => ({ click: () => opened++ })
  assert.equal(handleKeyboardListKeyDown(event('ArrowDown', rows[0])), true)
  assert.equal(rows[1].focused, true)
  assert.equal(handleKeyboardListKeyDown(event('ArrowUp', rows[1])), true)
  assert.equal(rows[0].focused, true)
  assert.equal(handleKeyboardListKeyDown(event('Enter', rows[1])), true)
  assert.equal(opened, 1)
  assert.equal(handleKeyboardListKeyDown(event('Enter', rows[1], { repeat: true })), false)
  assert.equal(handleKeyboardListKeyDown(event('Enter', rows[0])), false)
  assert.equal(opened, 1)
})

test('row navigation leaves editable fields and native button activation alone', () => {
  const { rows } = fixture()
  const input = { closest: (selector) => selector.includes('input') ? input : selector === '[data-keyboard-row]' ? rows[0] : null }
  assert.equal(handleKeyboardListKeyDown(event('ArrowDown', input)), false)
  const button = { closest: (selector) => rows[0].closest(selector) }
  assert.equal(handleKeyboardListKeyDown(event('Enter', button)), false)
  assert.equal(handleKeyboardListKeyDown(event('ArrowDown', rows[2])), false)
})

test('holding Enter or Space cannot repeatedly activate an action button', () => {
  const button = { matches: () => true }
  const input = { matches: () => false }
  const repeated = event('Enter', button, { repeat: true })
  assert.equal(preventRepeatedActionKey(repeated), true)
  assert.equal(repeated.defaultPrevented, true)
  assert.equal(preventRepeatedActionKey(event(' ', button, { repeat: true })), true)
  assert.equal(preventRepeatedActionKey(event('Enter', button)), false)
  assert.equal(preventRepeatedActionKey(event('Enter', input, { repeat: true })), false)
})
