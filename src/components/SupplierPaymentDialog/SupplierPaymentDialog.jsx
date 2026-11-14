import { useRef, useState } from 'react'
import DateDmyInput from '../DateDmyInput.jsx'
import DefaultZeroInput from '../DefaultZeroInput.jsx'
import { localDateString } from '../../data/businessLogic.js'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

const newCheque = (issued) => ({ id: `supplier-cheque-${Date.now()}-${Math.random()}`, number: '', bank: '', amount: '', issued, expectedClearanceDate: '' })
const inputClass = 'h-10 w-full rounded-lg border border-[#dfe4dc] bg-white px-3 text-sm font-normal text-[#173b32] focus:outline-none focus:border-[#155b4b]'
const methods = [['cash', 'Cash'], ['bank', 'Bank'], ['cheque', 'Cheque'], ['split', 'Split Payment']]
const amountOf = (value) => Number(String(value ?? '').trim() || 0)

export default function SupplierPaymentDialog({ supplier, onClose, onSave }) {
  const [method, setMethod] = useState('cash')
  const [amount, setAmount] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [bankAmount, setBankAmount] = useState('')
  const [chequeAmount, setChequeAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [cheques, setCheques] = useState(() => [newCheque(localDateString())])
  const [date, setDate] = useState(localDateString())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)
  const keyboard = useKeyboardScope({ onEscape: () => { if (!saving) onClose() }, trapFocus: true })

  const updateCheque = (id, field, value) => setCheques((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row))
  const selectedAmount = method === 'split'
    ? amountOf(cashAmount) + amountOf(bankAmount) + amountOf(chequeAmount)
    : amountOf(amount)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    setError('')
    try {
      const cash = method === 'split' ? amountOf(cashAmount) : method === 'cash' ? amountOf(amount) : 0
      const bank = method === 'split' ? amountOf(bankAmount) : method === 'bank' ? amountOf(amount) : 0
      const cheque = method === 'split' ? amountOf(chequeAmount) : method === 'cheque' ? amountOf(amount) : 0
      if (selectedAmount <= 0) throw new Error('Enter a payment amount greater than zero.')
      if (bank > 0 && !bankName.trim()) throw new Error('Enter the bank name for this payment.')
      let chequeRows = []
      if (cheque > 0) {
        chequeRows = cheques.filter((row) => row.number || row.bank || row.amount || row.issued || row.expectedClearanceDate).map(({ number, bank: chequeBank, amount: chequeValue, issued, expectedClearanceDate }) => ({ number: number.trim(), bank: chequeBank.trim(), amount: amountOf(chequeValue), issued, expectedClearanceDate }))
        if (!chequeRows.length || chequeRows.some((row) => !row.number || !row.bank || row.amount <= 0 || !row.issued)) throw new Error('Each cheque needs a number, bank, positive amount, and issue date.')
        if (Math.abs(chequeRows.reduce((sum, row) => sum + row.amount, 0) - cheque) > 0.005) throw new Error('Cheque amounts must match the cheque part of the payment.')
      }

      const payload = {
        accountId: supplier.id,
        method,
        amount: selectedAmount,
        date,
        note: note.trim(),
        ...(bank > 0 ? { bankDetails: { bankName: bankName.trim(), accountNumber: accountNumber.trim() } } : {}),
        ...(cheque > 0 ? { cheques: chequeRows } : {}),
        ...(method === 'split' ? { payments: { cash, bank, cheque } } : {}),
      }
      const saved = await onSave?.(payload)
      if (!saved) throw new Error('Could not record this supplier payment.')
      onClose()
    } catch (issue) {
      setError(issue.message || 'Could not record this supplier payment.')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const chequesEditor = (chequeTotal) => chequeTotal > 0 && (
    <fieldset className="space-y-3 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-3">
      <div className="flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold text-[#173b32]">Cheque details</legend>
        <button type="button" onClick={() => setCheques((rows) => [...rows, newCheque(date)])} className="h-8 rounded-lg border border-[#155b4b] px-3 text-xs font-semibold text-[#155b4b]">+ Add cheque</button>
      </div>
      {cheques.map((chequeRow, index) => <div key={chequeRow.id} className="grid grid-cols-1 gap-3 rounded-lg border border-[#e6ece5] bg-white p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Cheque number<input value={chequeRow.number} onChange={(event) => updateCheque(chequeRow.id, 'number', event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Cheque bank<input value={chequeRow.bank} onChange={(event) => updateCheque(chequeRow.id, 'bank', event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Cheque amount (Rs.)<DefaultZeroInput min="0.01" step="0.01" value={chequeRow.amount} onChange={(event) => updateCheque(chequeRow.id, 'amount', event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Cheque date<DateDmyInput value={chequeRow.issued} onChange={(event) => updateCheque(chequeRow.id, 'issued', event.target.value)} className={inputClass} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32] sm:col-span-2">Due / clearing date (optional)<DateDmyInput value={chequeRow.expectedClearanceDate} onChange={(event) => updateCheque(chequeRow.id, 'expectedClearanceDate', event.target.value)} className={inputClass} /></label>
        <div className="flex items-center justify-between sm:col-span-2"><span className="text-xs text-[#718078]">Cheque {index + 1}</span>{cheques.length > 1 && <button type="button" onClick={() => setCheques((rows) => rows.filter((row) => row.id !== chequeRow.id))} className="text-xs font-semibold text-red-700">Remove</button>}</div>
      </div>)}
    </fieldset>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#203832]/50 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
      <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-labelledby="supplier-payment-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e2e6df] bg-[#fbfcf9] shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#edf0eb] bg-white px-5 py-4 sm:px-6">
          <div><h2 id="supplier-payment-title" className="text-lg font-bold text-[#173b32] sm:text-xl">Record payment to {supplier.name}</h2><p className="mt-1 text-sm text-[#718078]">Current balance: Rs. {Math.abs(Number(supplier.balance || 0)).toLocaleString()}</p></div>
          <button type="button" aria-label="Close payment form" disabled={saving} onClick={onClose} className="h-9 w-9 rounded-lg text-2xl text-[#718078] hover:bg-[#f2f5ef]">×</button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          <fieldset className="grid grid-cols-2 gap-2" aria-label="Payment method">
            {methods.map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${method === value ? 'border-[#155b4b] bg-[#e8f2e3] text-[#155b4b]' : 'border-[#dfe4dc] bg-white text-[#173b32]'}`}>
              <input type="radio" name="supplier-payment-method" value={value} checked={method === value} onChange={() => setMethod(value)} />{label}
            </label>)}
          </fieldset>

          {method !== 'split' && <label className="flex flex-col gap-1 text-sm font-semibold text-[#173b32]">Amount paid (Rs.)<DefaultZeroInput min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></label>}
          {method === 'split' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#173b32]">Cash (Rs.)<DefaultZeroInput min="0" step="0.01" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className={inputClass} /></label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#173b32]">Bank (Rs.)<DefaultZeroInput min="0" step="0.01" value={bankAmount} onChange={(event) => setBankAmount(event.target.value)} className={inputClass} /></label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-[#173b32]">Cheques (Rs.)<DefaultZeroInput min="0" step="0.01" value={chequeAmount} onChange={(event) => setChequeAmount(event.target.value)} className={inputClass} /></label>
          </div>}

          {(method === 'bank' || method === 'split' && amountOf(bankAmount) > 0) && <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#edf0eb] bg-white p-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Bank name<input value={bankName} onChange={(event) => setBankName(event.target.value)} className={inputClass} required /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Account (optional)<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className={inputClass} /></label>
          </div>}

          {chequesEditor(method === 'cheque' ? amountOf(amount) : amountOf(chequeAmount))}

          {method === 'split' && <p className="rounded-lg bg-[#eaf3e7] px-3 py-2 text-sm font-semibold text-[#155b4b]">Total payment: Rs. {selectedAmount.toLocaleString()}</p>}
          {(method === 'cheque' || method === 'split' && amountOf(chequeAmount) > 0) && <p className="text-xs text-[#718078]">Cheque amount stays payable until the cheque is cleared.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Payment date<DateDmyInput value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} required /></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">Reason (optional)<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why are you making this payment?" className={inputClass} /></label>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#edf0eb] pt-4">
            <button type="button" disabled={saving} onClick={onClose} className="h-10 rounded-lg border border-[#dfe4dc] bg-white px-4 text-sm font-semibold text-[#52645c] disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={saving} className="h-10 rounded-lg bg-[#155b4b] px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save payment'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
