import test from 'node:test'
import assert from 'node:assert/strict'
import { createTripleRightShortcut, handleSidebarKeyDown, navigationReturnTarget } from './sidebarNavigation.js'

function event(key, target = {}, extra = {}) {
  return { key, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true }, ...extra }
}

test('three quick Right arrows open navigation once, but not while editing text', () => {
  let time = 1000
  let opened = 0
  const shortcut = createTripleRightShortcut(() => opened++, { now: () => time, interval: 750 })
  const input = { closest: (selector) => selector.includes('input') ? input : null }
  for (let i = 0; i < 3; i++) { time += 100; shortcut(event('ArrowRight', input)) }
  assert.equal(opened, 0)
  for (let i = 0; i < 2; i++) { time += 100; shortcut(event('ArrowRight')) }
  const third = event('ArrowRight')
  assert.equal(shortcut(third), true)
  assert.equal(third.defaultPrevented, true)
  assert.equal(opened, 1)
  time += 1000
  shortcut(event('ArrowRight'))
  shortcut(event('ArrowRight', {}, { repeat: true }))
  shortcut(event('ArrowRight'))
  assert.equal(opened, 1)
})

test('shortcut resets on other keys, modifiers, handled events and open overlays', () => {
  let time = 1000
  let opened = 0
  let allowed = true
  const shortcut = createTripleRightShortcut(() => opened++, { now: () => ++time, canOpen: () => allowed })
  shortcut(event('ArrowRight'))
  shortcut(event('ArrowLeft'))
  shortcut(event('ArrowRight'))
  shortcut(event('ArrowRight', {}, { defaultPrevented: true }))
  shortcut(event('ArrowRight'))
  allowed = false
  shortcut(event('ArrowRight'))
  allowed = true
  shortcut(event('ArrowRight', {}, { ctrlKey: true }))
  assert.equal(opened, 0)
})

test('sidebar arrows move through permitted items and Enter keeps button activation', () => {
  const items = [0, 1, 2].map((id) => ({ id, focus() { this.focused = true } }))
  const closeButton = { focus() { this.focused = true } }
  const nav = { contains: (target) => items.includes(target) }
  let closed = 0
  const options = { items, closeButton, nav, onClose: () => closed++ }
  assert.equal(handleSidebarKeyDown(event('ArrowDown', items[0]), options), true)
  assert.equal(items[1].focused, true)
  assert.equal(handleSidebarKeyDown(event('ArrowUp', items[0]), options), true)
  assert.equal(items[2].focused, true)
  assert.equal(handleSidebarKeyDown(event('Home', items[2]), options), true)
  assert.equal(items[0].focused, true)
  assert.equal(handleSidebarKeyDown(event('End', items[0]), options), true)
  assert.equal(items[2].focused, true)
  assert.equal(handleSidebarKeyDown(event('PageDown', items[0]), options), true)
  assert.equal(items[2].focused, true)
  assert.equal(handleSidebarKeyDown(event('PageUp', items[2]), options), true)
  assert.equal(items[0].focused, true)
  assert.equal(handleSidebarKeyDown(event('Enter', items[2]), options), false)
  assert.equal(handleSidebarKeyDown(event('ArrowRight', items[2]), options), false)
  assert.equal(handleSidebarKeyDown(event('ArrowLeft', items[2]), options), true)
  assert.equal(handleSidebarKeyDown(event('Escape', items[2]), options), true)
  assert.equal(closed, 2)
})

test('Tab stays in the drawer and closing returns to the proper control', () => {
  const items = [{ focus() { this.focused = true } }, { focus() { this.focused = true } }]
  const closeButton = { focus() { this.focused = true } }
  const options = { items, closeButton, nav: { contains: () => true }, onClose() {} }
  assert.equal(handleSidebarKeyDown(event('Tab', items[1]), options), true)
  assert.equal(closeButton.focused, true)
  assert.equal(handleSidebarKeyDown(event('Tab', closeButton, { shiftKey: true }), options), true)
  assert.equal(items[1].focused, true)
  const opener = { isConnected: true }
  const menuButton = {}
  const doc = { body: {} }
  assert.equal(navigationReturnTarget(opener, menuButton, { doc }), opener)
  assert.equal(navigationReturnTarget(opener, menuButton, { doc, changedPage: true }), menuButton)
  assert.equal(navigationReturnTarget({ isConnected: false }, menuButton, { doc }), menuButton)
  assert.equal(navigationReturnTarget(doc.body, menuButton, { doc }), menuButton)
})
