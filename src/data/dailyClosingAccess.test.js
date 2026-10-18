import assert from 'node:assert/strict'
import test from 'node:test'
import { canEditDailyOpening, canOpenDailyClosing, resolveDailyClosingTab } from './dailyClosingAccess.js'

test('Daily Closing stays inaccessible until the selected date has an opening', () => {
  assert.equal(canOpenDailyClosing(null), false)
  assert.equal(resolveDailyClosingTab('closing', null), 'opening')
  assert.equal(canOpenDailyClosing({ id: 'opening-today' }), true)
  assert.equal(resolveDailyClosingTab('closing', { id: 'opening-today' }), 'closing')
  assert.equal(resolveDailyClosingTab('overview', null), 'overview')
})

test('only administrators can edit a saved daily opening', () => {
  assert.equal(canEditDailyOpening({ role: 'admin' }), true)
  assert.equal(canEditDailyOpening({ role: 'staff', permissions: { dailyOpeningEdit: true } }), false)
  assert.equal(canEditDailyOpening({ role: 'staff', permissions: { admin: true } }), true)
})
