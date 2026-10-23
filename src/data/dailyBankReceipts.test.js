import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyBankReceipts } from './dailyBankReceipts.js'
test('daily bank receipts use linked payments once, preserve legacy invoices, and separate dates', () => {
 const db={sales:[{id:'s',date:'2026-10-23',payments:{bank:100},bankDetails:{bankName:'HBL'}},{id:'old',date:'2026-10-23',payments:{bank:50},bankDetails:{bankName:'ABL'}}],payments:[{referenceId:'s',type:'customer-payment',method:'bank',date:'2026-10-23',amount:100},{type:'customer-payment',method:'bank',date:'2026-10-22',amount:900,bankDetails:{bankName:'HBL'}},{type:'supplier-payment',method:'bank',date:'2026-10-23',amount:80,bankDetails:{bankName:'HBL'}},{type:'customer-payment',method:'bank',date:'2026-10-23',amount:20}]}
 assert.deepEqual(dailyBankReceipts(db,'2026-10-23',['HBL','Allied Bank','UBL']),{accounts:[{name:'HBL',amount:100},{name:'Allied Bank',amount:50},{name:'UBL',amount:0}],unassigned:20,total:170})
})
