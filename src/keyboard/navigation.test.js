import test from 'node:test'
import assert from 'node:assert/strict'
import { handleKeyboardScopeKeyDown, installGlobalKeyboardNavigation, nextEnterControl } from './navigation.js'

function control(kind, options = {}) {
  const element = {
    kind, type: options.type || 'text', name: options.name || '', dataset: options.dataset || {}, disabled: Boolean(options.disabled), readOnly: Boolean(options.readOnly),
    tabIndex: options.tabIndex ?? 0, ownerDocument: { defaultView: { getComputedStyle: () => ({ display: options.hidden ? 'none' : 'block', visibility: 'visible' }) } },
    getAttribute: (name) => name === 'aria-expanded' ? options.expanded : name === 'aria-autocomplete' ? options.autocomplete : null,
    closest: (selector) => selector === 'form' || selector === 'form, [data-keyboard-scope], main' ? options.form || null : selector === '[data-keyboard-horizontal]' ? options.group || null : null,
    matches: (selector) => selector.split(',').some((part) => {
      const choice = part.trim()
      return choice === kind || (choice === 'select:not([multiple])' && kind === 'select') || choice === `input[type="${options.type}"]` || choice === `button[type="${options.type}"]` || (choice === 'button:not([type])' && kind === 'button' && !options.type)
    }),
    focus() { element.focused = true },
    click() { element.clicked = true },
  }
  return element
}

function fixture(controls) {
  return { contains: (element) => controls.includes(element), querySelectorAll: () => controls }
}

function key(target, name = 'Enter', extras = {}) {
  return { target, key: name, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, ...extras }
}

test('Enter advances through enabled single-line fields to the submit action', () => {
  const name = control('input')
  const disabled = control('input', { disabled: true })
  const hidden = control('input', { hidden: true })
  const quantity = control('input', { type: 'number' })
  const save = control('button', { type: 'submit' })
  const scope = fixture([name, disabled, hidden, quantity, save])
  const first = key(name)
  assert.equal(handleKeyboardScopeKeyDown(first, { scope }), true)
  assert.equal(first.defaultPrevented, true)
  assert.equal(quantity.focused, true)
  assert.equal(nextEnterControl(scope, quantity), save)
  const second = key(quantity)
  assert.equal(handleKeyboardScopeKeyDown(second, { scope }), true)
  assert.equal(save.focused, true)
})

test('native keys, typing and custom autocomplete behavior remain available', () => {
  const search = control('input', { expanded: 'true', autocomplete: 'list' })
  const note = control('textarea')
  const dropdown = control('select')
  const next = control('input')
  const scope = fixture([search, note, dropdown, next])
  for (const event of [key(search), key(note), key(dropdown, 'ArrowDown'), key(next, 'Tab'), key(next, 'Enter', { shiftKey: true }), key(search, 'Enter', { defaultPrevented: true }), key(search, 'Enter', { isComposing: true }), key(next, 'ArrowLeft'), key(next, 'ArrowRight')]) {
    const initiallyPrevented = event.defaultPrevented
    assert.equal(handleKeyboardScopeKeyDown(event, { scope }), false)
    assert.equal(event.defaultPrevented, initiallyPrevented)
  }
  const dropdownScope = fixture([dropdown, next])
  assert.equal(handleKeyboardScopeKeyDown(key(dropdown), { scope: dropdownScope }), true)
  assert.equal(next.focused, true)
})

test('Up and Down move between logical text fields while number steppers remain native', () => {
  const name = control('input')
  const readonly = control('input', { readOnly: true })
  const quantity = control('input', { type: 'number' })
  const cost = control('input', { type: 'number' })
  const scope = fixture([name, readonly, quantity, cost])
  assert.equal(handleKeyboardScopeKeyDown(key(name, 'ArrowDown'), { scope }), true)
  assert.equal(quantity.focused, true)
  assert.equal(handleKeyboardScopeKeyDown(key(quantity, 'ArrowUp'), { scope }), false)
  const finalEnter = key(cost, 'Enter')
  assert.equal(handleKeyboardScopeKeyDown(finalEnter, { scope }), true)
  assert.equal(finalEnter.defaultPrevented, true)
})

test('Enter on the final field cannot implicitly submit a record', () => {
  const finalField = control('input')
  const scope = fixture([finalField])
  const event = key(finalField)
  assert.equal(handleKeyboardScopeKeyDown(event, { scope }), true)
  assert.equal(event.defaultPrevented, true)
})

test('Enter confirms a radio choice and advances past its group', () => {
  const product = control('input')
  const summer = control('input', { type: 'radio', name: 'season' })
  const winter = control('input', { type: 'radio', name: 'season' })
  const quantity = control('input', { type: 'number' })
  const scope = fixture([product, summer, winter, quantity])
  assert.equal(handleKeyboardScopeKeyDown(key(product), { scope }), true)
  assert.equal(summer.focused, true)
  assert.equal(handleKeyboardScopeKeyDown(key(summer), { scope }), true)
  assert.equal(summer.clicked, true)
  assert.equal(quantity.focused, true)
})

test('Left and Right move between opted-in adjacent buttons, never text cursors', () => {
  const group = { querySelectorAll: () => [cancel, save] }
  const cancel = control('button', { type: 'button', group })
  const save = control('button', { type: 'submit', group })
  const scope = fixture([cancel, save])
  assert.equal(handleKeyboardScopeKeyDown(key(cancel, 'ArrowRight'), { scope }), true)
  assert.equal(save.focused, true)
  assert.equal(handleKeyboardScopeKeyDown(key(save, 'ArrowLeft'), { scope }), true)
  assert.equal(cancel.focused, true)
})

test('one document listener applies to forms and can be removed', () => {
  const fields = []
  const form = fixture(fields)
  const first = control('input', { form })
  const second = control('input', { form })
  fields.push(first, second)
  const listeners = new Map()
  const doc = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: (name) => listeners.delete(name) }
  const remove = installGlobalKeyboardNavigation(doc)
  listeners.get('keydown')(key(first))
  assert.equal(second.focused, true)
  second.focused = false
  form.dataset = { keyboardNative: '' }
  listeners.get('keydown')(key(first))
  assert.equal(second.focused, false)
  remove()
  assert.equal(listeners.has('keydown'), false)
})

test('the same listener advances fields on pages without a form', () => {
  const fields = []
  const page = fixture(fields)
  page.dataset = {}
  const first = control('input')
  const second = control('input')
  first.closest = (selector) => selector === 'form, [data-keyboard-scope], main' ? page : null
  second.closest = first.closest
  fields.push(first, second)
  const listeners = new Map()
  const doc = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: (name) => listeners.delete(name) }
  const remove = installGlobalKeyboardNavigation(doc)
  listeners.get('keydown')(key(first))
  assert.equal(second.focused, true)
  remove()
})

test('Escape closes only the active opted-in scope and respects child handling', () => {
  const field = control('input')
  const scope = fixture([field])
  let closed = 0
  const event = key(field, 'Escape')
  assert.equal(handleKeyboardScopeKeyDown(event, { scope, onEscape: () => closed++ }), true)
  assert.equal(closed, 1)
  assert.equal(event.defaultPrevented, true)
  assert.equal(handleKeyboardScopeKeyDown(key(field, 'Escape', { defaultPrevented: true }), { scope, onEscape: () => closed++ }), false)
  assert.equal(handleKeyboardScopeKeyDown(key(control('input'), 'Escape'), { scope, onEscape: () => closed++ }), false)
  assert.equal(closed, 1)
})

test('Tab and Shift+Tab remain native within a modal and wrap at its edges', () => {
  const first = control('input')
  const middle = control('input')
  const last = control('button', { type: 'submit' })
  const scope = fixture([first, middle, last])
  assert.equal(handleKeyboardScopeKeyDown(key(middle, 'Tab'), { scope, trapFocus: true }), false)
  assert.equal(handleKeyboardScopeKeyDown(key(last, 'Tab'), { scope, trapFocus: true }), true)
  assert.equal(first.focused, true)
  assert.equal(handleKeyboardScopeKeyDown(key(first, 'Tab', { shiftKey: true }), { scope, trapFocus: true }), true)
  assert.equal(last.focused, true)
})
