import { useMemo, useState } from 'react'
import { paymentPromiseStates } from '../../data/paymentPromises.js'

const today = () => new Date().toISOString().slice(0, 10)
const key = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`

export default function PaymentPromises({ embedded = false, customers = [], sales = [], payments = [], banks = [], businessDate, canEdit = false, onSavePromises, onPayment }) {
  const [filter, setFilter] = useState('pending')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [receiving, setReceiving] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const rows = useMemo(() => paymentPromiseStates({ customers, sales }), [customers, sales])
  const visible = rows.filter((row) => {
    const pending = row.status === 'scheduled' && Number(row.remaining) > 0
    const matchFilter = filter === 'all' || (filter === 'pending' ? pending : !pending)
    const matchQuery = `${row.customer} ${row.saleNumber} ${row.dueDate}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchFilter && matchQuery
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const stateForSale = (sale) => rows.filter((row) => row.saleId === sale.id)
  const saveSalePromises = async (sale, overrides = [], omittedId = '', stateRows = rows) => {
    const states = stateRows.filter((row) => row.saleId === sale.id)
    const overridesById = new Map(overrides.filter((row) => row.id).map((row) => [row.id, row]))
    const list = (sale.paymentPromises || []).filter((row) => row.id !== omittedId).map((row) => {
      const state = states.find((entry) => entry.id === row.id)
      const override = overridesById.get(row.id)
      return { id: row.id, dueDate: override?.dueDate ?? state?.dueDate ?? row.dueDate, amount: override?.amount ?? state?.remaining ?? row.amount }
    })
    list.push(...overrides.filter((row) => !row.id))
    return onSavePromises?.(sale.id, list)
  }

  const submitPromise = async (event) => {
    event.preventDefault()
    if (!editing || !Number.isFinite(Number(editing.amount)) || Number(editing.amount) < 0) { setError('Enter a valid remaining amount.'); return }
    if (!editing.dueDate) { setError('Choose a due date.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const sale = sales.find((entry) => entry.id === editing.saleId)
      const result = await saveSalePromises(sale, [{ id: editing.id, dueDate: editing.dueDate, amount: Number(editing.amount) }])
      if (!result) throw new Error('Promise could not be saved.')
      setMessage('Payment promise saved.')
      setEditing(null)
    } catch (failure) { setError(failure.message || 'Promise could not be saved.') }
    finally { setSaving(false) }
  }

  const deletePromise = async (row) => {
    if (!window.confirm(`Delete the ${money(row.remaining)} promise for ${row.customer}?`)) return
    const sale = sales.find((entry) => entry.id === row.saleId)
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await saveSalePromises(sale, [], row.id)
      if (!result) throw new Error('Promise could not be deleted.')
      setMessage('Payment promise deleted.')
    } catch (failure) { setError(failure.message || 'Promise could not be deleted.') }
    finally { setSaving(false) }
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!receiving) return
    const amount = Number(receiving.amount)
    if (!Number.isFinite(amount) || amount <= 0) { setError('Enter an amount greater than zero.'); return }
    if (Boolean(receiving.nextDueDate) !== Boolean(receiving.nextAmount)) { setError('Enter both the next promise date and amount, or leave both blank.'); return }
    if (receiving.nextAmount && (!Number.isFinite(Number(receiving.nextAmount)) || Number(receiving.nextAmount) <= 0)) { setError('Enter a valid next promise amount.'); return }
    const bank = banks.find((entry) => entry.id === receiving.bankId)
    if (receiving.method === 'bank' && !bank) { setError('Select a bank account for this payment.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const savedPayment = await onPayment?.({ accountId: receiving.customerId, amount, date: receiving.date, method: receiving.method, ...(bank ? { bankDetails: { bankName: bank.name, accountNumber: bank.accountNumber || '', bankAccountId: bank.id } } : {}), note: `Payment promise recovery for ${receiving.saleNumber}`, idempotencyKey: receiving.idempotencyKey })
      if (!savedPayment) throw new Error('Payment could not be recorded.')
      if (receiving.nextDueDate && receiving.nextAmount) {
        const sale = sales.find((entry) => entry.id === receiving.saleId)
        try {
          const paidCustomers = customers.map((entry) => entry.id === receiving.customerId ? { ...entry, balance: Number(entry.balance || 0) - amount } : entry)
          const postPaymentStates = paymentPromiseStates({ customers: paidCustomers, sales })
          const scheduled = await saveSalePromises(sale, [{ dueDate: receiving.nextDueDate, amount: Number(receiving.nextAmount) }], '', postPaymentStates)
          if (!scheduled) throw new Error('Next promise could not be saved.')
          setMessage(`Payment of ${money(amount)} recorded and the next promise added.`)
        } catch (failure) {
          setMessage(`Payment of ${money(amount)} was recorded, but the next promise was not added: ${failure.message}`)
        }
      } else setMessage(`Payment of ${money(amount)} recorded for ${receiving.customer}.`)
      setReceiving(null)
    } catch (failure) { setError(failure.message || 'Payment could not be recorded.') }
    finally { setSaving(false) }
  }

  const filters = [['all', 'All'], ['pending', 'Pending'], ['resolved', 'Resolved']]
  return <section className={embedded ? 'w-full' : 'mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 sm:py-8 lg:px-12'}>
    {embedded ? <div className="mb-4"><h2 className="text-xl font-bold text-[#173b32] sm:text-2xl">Payment promises</h2><p className="mt-1 text-sm text-[#718078]">Track expected payments, record recoveries, and schedule the next promise.</p></div> : <><p className="text-xs font-bold uppercase tracking-[3px] text-[#70847b]">YOUR WHOLESALE WORKSPACE</p><div className="mt-1"><h1 className="text-2xl font-bold tracking-tight text-[#173b32] sm:text-3xl">Payment promises</h1><p className="mt-1 text-sm text-[#718078]">Track expected customer payments, record recoveries, and schedule the next promise.</p></div></>}
    {message && <p role="status" className="mt-4 rounded-lg bg-[#eaf3e7] p-3 text-sm text-[#155b4b]">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="my-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input type="search" placeholder="Search customer or invoice..." value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe4dc] bg-white px-4 text-sm sm:max-w-md" />
      <div className="flex gap-2" role="group" aria-label="Filter payment promises">{filters.map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${filter === value ? 'border-[#155b4b] bg-[#155b4b] text-white' : 'border-[#dfe4dc] bg-white text-[#315046]'}`}>{label}</button>)}</div>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
      <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f7faf5] text-xs uppercase text-[#718078]"><tr>{['Customer / sale','Due date','Promised remaining','Status','Actions'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#edf0eb]">{visible.map((row) => {
          const pending = row.status === 'scheduled' && Number(row.remaining) > 0
          const sale = sales.find((entry) => entry.id === row.saleId)
          const customer = customers.find((entry) => entry.id === row.customerId)
          return <tr key={row.id}><td className="p-3"><strong className="block text-[#173b32]">{row.customer}</strong><small className="text-[#718078]">{row.saleNumber}</small></td><td className="p-3">{row.dueDate}</td><td className="p-3 font-semibold">{money(row.remaining)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pending ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{pending ? 'Pending' : 'Resolved'}</span>{pending && row.dueDate < today() && <small className="ml-2 text-red-700">Overdue</small>}</td><td className="p-3"><div className="flex flex-wrap gap-2">{pending && customer && <button type="button" onClick={() => { setError(''); setReceiving({ saleId: row.saleId, saleNumber: row.saleNumber, customerId: customer.id, customer: customer.name, amount: '', date: businessDate || today(), method: 'cash', bankId: '', nextDueDate: '', nextAmount: '', idempotencyKey: key() }) }} className="rounded-lg bg-[#155b4b] px-3 py-2 text-xs font-semibold text-white">Receive payment</button>}{canEdit && <button type="button" onClick={() => { setError(''); setEditing({ saleId: row.saleId, id: row.id, dueDate: row.dueDate, amount: String(row.remaining) }) }} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit</button>}{canEdit && <button type="button" disabled={saving} onClick={() => deletePromise(row)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>}</div></td></tr>
        })}{!visible.length && <tr><td colSpan="5" className="p-10 text-center text-sm text-[#718078]">No {filter === 'all' ? '' : `${filter} `}payment promises match this view.</td></tr>}</tbody>
      </table>
    </div>
    {(editing || receiving) && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={editing ? submitPromise : submitPayment} role="dialog" aria-modal="true" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
      <div><h2 className="text-xl font-bold text-[#173b32]">{editing ? 'Edit payment promise' : `Receive payment · ${receiving.customer}`}</h2>{receiving && <p className="mt-1 text-sm text-[#718078]">Sale {receiving.saleNumber}</p>}</div>
      {editing ? <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Due date<input type="date" required value={editing.dueDate} onChange={(event) => setEditing((current) => ({ ...current, dueDate: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Remaining promise (Rs.)<input type="number" min="0" step="0.01" required value={editing.amount} onChange={(event) => setEditing((current) => ({ ...current, amount: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label></div> : <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Amount received (Rs.)<input type="number" min="0.01" step="0.01" required autoFocus value={receiving.amount} onChange={(event) => setReceiving((current) => ({ ...current, amount: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label>
        <label className="grid gap-1 text-sm font-semibold">Payment date<input type="date" required value={receiving.date} onChange={(event) => setReceiving((current) => ({ ...current, date: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label>
        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Method<select value={receiving.method} onChange={(event) => setReceiving((current) => ({ ...current, method: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal"><option value="cash">Cash</option><option value="bank">Bank</option></select></label>
        {receiving.method === 'bank' && <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Bank account<select required value={receiving.bankId} onChange={(event) => setReceiving((current) => ({ ...current, bankId: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal"><option value="">Select bank account</option>{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label>}
        <div className="sm:col-span-2 border-t pt-3"><p className="text-sm font-semibold text-[#173b32]">Add the next promise (optional)</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Next due date<input type="date" value={receiving.nextDueDate} onChange={(event) => setReceiving((current) => ({ ...current, nextDueDate: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Next promised amount (Rs.)<input type="number" min="0.01" step="0.01" value={receiving.nextAmount} onChange={(event) => setReceiving((current) => ({ ...current, nextAmount: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label></div></div>
      </div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => { setEditing(null); setReceiving(null); setError('') }} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#155b4b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save promise' : 'Record payment'}</button></div>
    </form></div>}
    {payments.length > 0 && <p className="mt-4 text-xs text-[#718078]">Promise schedules are expectations only; payments are posted separately to Customer Khata.</p>}
  </section>
}
