import assert from 'node:assert/strict'
import test from 'node:test'
import { getSaleDayStatus } from './saleDayStatus.js'

test('sale day requires a branch opening and blocks after branch closing', () => {
  const date = '2026-10-15'
  const database = { dailyClosings: [] }
  assert.match(getSaleDayStatus(database, { date, branchId: 'north' }).reason, /Daily Opening is required/)
  database.dailyClosings.push({ id: 'open-south', date, type: 'opening', branchId: 'south' })
  assert.equal(getSaleDayStatus(database, { date, branchId: 'north' }).canCreateSale, false)
  database.dailyClosings.push({ id: 'open-north', date, type: 'opening', branchId: 'north' })
  assert.equal(getSaleDayStatus(database, { date, branchId: 'north' }).canCreateSale, true)
  database.dailyClosings.push({ id: 'close-north', date, type: 'closing', branchId: 'north' })
  assert.match(getSaleDayStatus(database, { date, branchId: 'north' }).reason, /Daily Closing has already been completed/)
})

test('legacy daily records belong only to the default branch', () => {
  const date = '2026-10-15'
  const database = { dailyClosings: [{ id: 'legacy', date, type: 'opening' }] }
  assert.equal(getSaleDayStatus(database, { date }).canCreateSale, true)
  assert.equal(getSaleDayStatus(database, { date, branchId: 'branch-2' }).canCreateSale, false)
})
