import test from 'node:test'
import assert from 'node:assert/strict'
import { runSingleFlight } from './singleFlight.js'

test('repeated save uses one in-flight mutation and allows retry afterward', async () => {
  const pending = new Set()
  let finish
  let calls = 0
  const work = () => { calls++; return new Promise((resolve) => { finish = resolve }) }
  const first = runSingleFlight(pending, 'sale:123', work)
  const second = await runSingleFlight(pending, 'sale:123', work)
  assert.equal(second, null)
  assert.equal(calls, 1)
  finish({ id: 'sale-1' })
  assert.deepEqual(await first, { id: 'sale-1' })
  assert.equal(pending.size, 0)
  const third = runSingleFlight(pending, 'sale:123', work)
  assert.equal(calls, 2)
  finish({ id: 'sale-2' })
  await third
})

test('failed save releases the key for a corrected submission', async () => {
  const pending = new Set()
  await assert.rejects(runSingleFlight(pending, 'receipt', async () => { throw new Error('Retry') }), /Retry/)
  assert.equal(pending.size, 0)
  assert.equal(await runSingleFlight(pending, 'receipt', async () => true), true)
})
