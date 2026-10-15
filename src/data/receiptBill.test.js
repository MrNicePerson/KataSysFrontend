import test from 'node:test'
import assert from 'node:assert/strict'
import { receiptBill } from './receiptBill.js'

test('reopened legacy invoice includes separately saved cheque details', () => {
  const bill = { id: 'sale-67', payments: { cheque: 19.8 } }
  const cheque = { id: 'ch-1', referenceId: bill.id, number: '12345', bank: 'Bank', amount: 19.8, status: 'Pending' }
  const result = receiptBill(bill, [cheque, { id: 'other', referenceId: 'sale-66' }])
  assert.deepEqual(result.cheques, [cheque])
  assert.equal(bill.cheques, undefined)
  assert.deepEqual(result.payments, bill.payments)
})

test('current register details replace stale embedded details without duplicates', () => {
  const bill = { id: 'sale', cheques: [{ id: 'ch', amount: 10 }] }
  const current = { id: 'ch', referenceId: 'sale', amount: 20, status: 'Pending' }
  assert.deepEqual(receiptBill(bill, [current]).cheques, [current])
})

test('cancelled cheques are excluded and embedded fallback remains available', () => {
  const bill = { id: 'sale', cheques: [{ id: 'ch', amount: 10 }] }
  assert.deepEqual(receiptBill(bill).cheques, bill.cheques)
  assert.deepEqual(receiptBill(bill, [{ id: 'ch', referenceId: 'sale', status: 'Cancelled' }]).cheques, [])
})
