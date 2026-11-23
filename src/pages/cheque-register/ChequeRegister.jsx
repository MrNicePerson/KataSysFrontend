import { useState } from 'react'
import DateDmyInput from '../../components/DateDmyInput.jsx'
import { formatDmyDate } from '../../data/dateDmy.js'

export default function ChequeRegister({ cheques = [], customers = [], suppliers = [], banks = [], onStatusChange, onCreate, onUpdateDetails, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [direction, setDirection] = useState('received')
  const [partyId, setPartyId] = useState('')
  const [message, setMessage] = useState('')
  const [issued, setIssued] = useState('')
  const [expectedClearanceDate, setExpectedClearanceDate] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10))
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingCheque, setEditingCheque] = useState(null)
  const [settlementDraft, setSettlementDraft] = useState(null)
  const [settlementError, setSettlementError] = useState('')
  const parties = direction === 'received' ? customers : suppliers
  const dayKey = (value) => String(value || '').slice(0, 10)
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthCells = Array.from({ length: 42 }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - monthStart.getDay() + index))
  const dateCheques = new Map()
  for (const cheque of cheques) {
    const key = dayKey(cheque.expectedClearanceDate || cheque.dueDate)
    if (key) dateCheques.set(key, [...(dateCheques.get(key) || []), cheque])
  }
  const selectedDayCheques = dateCheques.get(calendarDate) || []
  const selectedBankTotals = new Map()
  for (const cheque of selectedDayCheques) {
    const bank = String(cheque.bank || 'Unknown bank').trim() || 'Unknown bank'
    const key = `${cheque.direction}:${bank}`
    const row = selectedBankTotals.get(key) || { bank, direction: cheque.direction, count: 0, amount: 0, cheques: [] }
    row.count += 1
    row.amount += Number(cheque.amount || 0)
    row.cheques.push(cheque)
    selectedBankTotals.set(key, row)
  }

  const submitCheque = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const saved = await onCreate({
        direction: direction === 'received' ? 'received' : 'given',
        partyType: direction === 'received' ? 'customer' : 'supplier',
        partyId,
        amount: Number(form.get('amount')),
        number: form.get('number'),
        bank: form.get('bank'),
        issued,
        expectedClearanceDate,
      })
      if (!saved) return
      setAdding(false)
      setPartyId('')
      setIssued('')
      setExpectedClearanceDate('')
      setMessage('Cheque recorded.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const settleOutsideCheque = async (event) => {
    event.preventDefault()
    const bank = banks.find((entry) => entry.id === settlementDraft.bankId)
    const bankName = bank?.name || settlementDraft.bankName.trim()
    if (settlementDraft.method === 'bank' && !bankName) { setSettlementError('Choose a bank account or enter the bank name.'); return }
    setSettlementError('')
    try {
      const saved = await onStatusChange?.(settlementDraft.cheque.id, 'Paid by other method', {
        paymentMethod: settlementDraft.method,
        paymentDate: settlementDraft.date,
        remarks: settlementDraft.remarks.trim(),
        ...(settlementDraft.method === 'bank' ? { bankDetails: { bankName, accountNumber: bank?.accountNumber || settlementDraft.accountNumber.trim(), ...(bank ? { bankAccountId: bank.id } : {}) } } : {}),
      })
      if (!saved) throw new Error('Payment could not be recorded. Please check the error and retry.')
      setMessage(`Cheque ${settlementDraft.cheque.number || ''} settled by ${settlementDraft.method} and applied to the ${settlementDraft.cheque.partyType || (settlementDraft.cheque.direction === 'given' ? 'supplier' : 'customer')} khata.`)
      setSettlementDraft(null)
    } catch (error) { setSettlementError(error.message || 'Payment could not be recorded.') }
  }

  const groups = activeTab === 'supplier' ? [['Supplier cheques', 'given']] : activeTab === 'customer' ? [['Customer cheques', 'received']] : []
  const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Cheque register
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Track pending, cleared and returned cheques against their accounts.
      </p>
      <nav className="mb-5 flex flex-wrap gap-2 border-b border-[#dfe4dc] pb-3" aria-label="Cheque register screens">
        {[['overview', 'Overview'], ['supplier', 'Supplier cheques'], ['customer', 'Customer cheques']].map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => { setActiveTab(tab); setAdding(false); if (tab !== 'overview') setDirection(tab === 'customer' ? 'received' : 'given') }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab ? tab === 'supplier' ? 'bg-violet-700 text-white' : tab === 'customer' ? 'bg-sky-700 text-white' : 'bg-[#155b4b] text-white' : 'bg-white text-[#52645c] hover:bg-[#e8f2e3]'}`}>{label}<span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">{tab === 'supplier' ? cheques.filter((row) => row.direction === 'given').length : tab === 'customer' ? cheques.filter((row) => row.direction === 'received').length : cheques.length}</span></button>)}
      </nav>
      {activeTab === 'overview' && <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]" aria-label="Cheque overview">
        <div className="rounded-2xl border border-[#e2e6df] bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-[#173b32]">Cheque overview by date</h2><div className="flex gap-2"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded border px-3 py-1">‹</button><strong className="min-w-36 text-center">{calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded border px-3 py-1">›</button></div></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#718078]">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="py-1 font-semibold">{day}</div>)}
            {monthCells.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`; const dayRows = dateCheques.get(key) || []; const supplierCount = dayRows.filter((row) => row.direction === 'given').length; const customerCount = dayRows.length - supplierCount; return <button key={key} type="button" onClick={() => setCalendarDate(key)} aria-label={`${day.getDate()}, ${dayRows.length} cheques due`} className={`min-h-12 rounded-lg border p-1 ${day.getMonth() !== calendarMonth.getMonth() ? 'text-gray-300' : 'text-[#173b32]'} ${calendarDate === key ? 'border-[#155b4b] bg-[#e8f2e3] ring-2 ring-[#155b4b]/15' : 'border-transparent hover:border-[#dfe4dc]'}`}><span>{day.getDate()}</span>{dayRows.length > 0 && <small className="mt-0.5 flex justify-center gap-1"><span className="rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-800">{customerCount} C</span><span className="rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-800">{supplierCount} S</span></small>}</button> })}
          </div>
          <p className="mt-2 text-xs text-[#718078]">Calendar shows cheque counts by expected clearance date. Select a date to see its bank totals.</p>
        </div>
        <div className="rounded-2xl border border-[#e2e6df] bg-white p-4 shadow-panel"><h2 className="mb-1 font-bold text-[#173b32]">{formatDmyDate(calendarDate)} · {selectedDayCheques.length} cheques due</h2><p className="mb-3 text-xs text-[#718078]">Amounts grouped by bank, with each supplier or customer listed.</p><div className="max-h-64 space-y-2 overflow-auto">{[...selectedBankTotals.values()].map(({ bank, direction: rowDirection, count, amount, cheques: bankCheques }) => <div key={`${rowDirection}:${bank}`} className={`rounded-xl border p-3 text-sm ${rowDirection === 'given' ? 'border-violet-100 bg-violet-50' : 'border-sky-100 bg-sky-50'}`}><div className="flex items-center justify-between gap-3"><div><strong className="block">{bank}</strong><small>{rowDirection === 'given' ? 'Supplier' : 'Customer'} · {count} cheque{count === 1 ? '' : 's'}</small></div><strong>{money(amount)}</strong></div><div className="mt-2 space-y-1 border-t border-black/5 pt-2">{bankCheques.map((cheque) => { const accounts = cheque.direction === 'given' ? suppliers : customers; const party = accounts.find((entry) => entry.id === cheque.partyId)?.name || cheque.party || (cheque.direction === 'given' ? 'Supplier not recorded' : 'Customer not recorded'); return <div key={cheque.id} className="flex flex-wrap justify-between gap-x-3 text-xs text-[#52645c]"><span>{party}{cheque.number ? ` · Cheque ${cheque.number}` : ''}</span><strong>{money(cheque.amount)}</strong></div> })}</div></div>)}{!selectedBankTotals.size && <p className="text-sm text-[#718078]">No cheques expected on this date.</p>}</div></div>
      </section>}
        {activeTab !== 'overview' && <button type="button" className="mb-6 h-11 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold" onClick={() => { setDirection(activeTab === 'customer' ? 'received' : 'given'); setAdding((value) => !value) }}>
          {adding ? 'Close cheque form' : `Add ${activeTab === 'supplier' ? 'supplier' : 'customer'} cheque`}
        </button>}
        {message && <p className="mb-4 text-sm text-[#155b4b]" role="status">{message}</p>}
        {adding && (
          <form onSubmit={submitCheque} className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-white border border-[#e2e6df]">
            <label className="text-xs font-semibold text-[#173b32]">Direction
              <select value={direction} onChange={(event) => { setDirection(event.target.value); setPartyId('') }} className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]">
                <option value="received">Incoming from customer</option>
                <option value="given">Outgoing to supplier</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#173b32]">Account
              <select value={partyId} onChange={(event) => setPartyId(event.target.value)} required className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]">
                <option value="">Choose account</option>
                {parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#173b32]">Cheque number<input name="number" className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]" /></label>
            <label className="text-xs font-semibold text-[#173b32]">Bank<input name="bank" className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]" /></label>
            <label className="text-xs font-semibold text-[#173b32]">Amount<input name="amount" type="number" min="0.01" step="0.01" required className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]" /></label>
            <label className="text-xs font-semibold text-[#173b32]">Issued<DateDmyInput name="issued" required value={issued || calendarDate} onChange={(event) => setIssued(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]" /></label>
            <label className="text-xs font-semibold text-[#173b32]">Expected clearance<DateDmyInput name="expectedClearanceDate" value={expectedClearanceDate} onChange={(event) => setExpectedClearanceDate(event.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-[#dfe4dc]" /></label>
            <button className="self-end h-10 rounded-lg bg-[#155b4b] text-white text-sm font-semibold" type="submit">Save cheque</button>
          </form>
        )}

      <div className="space-y-8">
        {groups.map(([title, direction]) => {
          const rows = cheques.filter((cheque) => cheque.direction === direction && (statusFilter === 'all' || cheque.status === statusFilter))
          return (
            <section key={direction}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[#173b32] text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs sm:text-sm font-normal text-[#718078]">
                  · {money(rows.reduce((sum, row) => sum + row.amount, 0))}
                </span>
              </h2><label className="text-sm font-semibold">Status <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ml-2 rounded-lg border px-3 py-2"><option value="all">All</option>{['Pending','Cleared','Paid by other method','Returned','Bounced','Cancelled','Rescheduled','Deposited / Presented','Under Clearing'].map((status) => <option key={status}>{status}</option>)}</select></label></div>

              <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
                <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
                  <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">Cheque / bank</th>
                      <th className="px-4 sm:px-6 py-3.5">Party</th>
                      <th className="px-4 sm:px-6 py-3.5">Amount</th>
                      <th className="px-4 sm:px-6 py-3.5">Issued / expected</th>
                      <th className="px-4 sm:px-6 py-3.5">Status</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
                    {rows.length ? (
                      rows.map((cheque) => (
                        <tr key={cheque.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7]">
                          <td className="px-4 sm:px-6 py-4">
                            <strong className="block text-[#173b32]">{cheque.number || '—'}</strong>
                            <small className="text-[#718078]">{cheque.bank}</small>
                          </td>
                          <td className="px-4 sm:px-6 py-4 font-medium">{cheque.party || '—'}</td>
                          <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">{money(cheque.amount)}</td>
                          <td className="px-4 sm:px-6 py-4 text-[#718078]">{formatDmyDate(cheque.issued)}<small className="block">Expected: {formatDmyDate(cheque.expectedClearanceDate) || '—'}</small></td>
                          <td className="px-4 sm:px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                ['Cleared', 'Paid by other method'].includes(cheque.status)
                                  ? 'bg-[#e8f2e3] text-[#557250]'
                                  : ['Returned', 'Bounced'].includes(cheque.status)
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-50 text-amber-800'
                              }`}
                            >
                              {cheque.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <button type="button" onClick={() => setEditingCheque(cheque)} className="mr-2 rounded border px-2.5 py-1 text-xs font-semibold">Edit</button>
                            {cheque.status === 'Pending' && <button type="button" onClick={() => { if (window.confirm(`Delete cheque ${cheque.number || ''}?`)) onDelete?.(cheque.id) }} className="mr-2 rounded border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700">Delete</button>}
                            {['Pending', 'Deposited / Presented', 'Under Clearing', 'Rescheduled'].includes(cheque.status) ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs font-semibold cursor-pointer"
                                  onClick={() => onStatusChange(cheque.id, 'Cleared')}
                                >
                                  Mark cleared
                                </button>
                                <button
                                  type="button"
                                  className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                                  onClick={() => onStatusChange(cheque.id, 'Returned')}
                                >
                                  Mark returned
                                </button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-xs font-semibold cursor-pointer" onClick={() => onStatusChange(cheque.id, 'Bounced')}>Mark bounced</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-[#dfe4dc] text-[#52645c] text-xs font-semibold" onClick={() => onStatusChange(cheque.id, 'Cancelled')}>Cancel</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-[#155b4b] text-[#155b4b] text-xs font-semibold" onClick={() => { setSettlementError(''); setSettlementDraft({ cheque, date: new Date().toISOString().slice(0, 10), method: 'cash', bankId: '', bankName: '', accountNumber: '', remarks: '' }) }}>Paid another way</button>
                              </div>
                            ) : cheque.status === 'Cleared' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer" onClick={() => onStatusChange(cheque.id, 'Returned')}>Mark returned</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-xs font-semibold cursor-pointer" onClick={() => onStatusChange(cheque.id, 'Bounced')}>Mark bounced</button>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                          Nothing here yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
      {editingCheque && <EditChequeDialog cheque={editingCheque} onClose={() => setEditingCheque(null)} onSave={async (details) => { await onUpdateDetails?.(editingCheque.id, details); setEditingCheque(null) }} />}
      {settlementDraft && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="settle-cheque-title" onSubmit={settleOutsideCheque} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"><div><h2 id="settle-cheque-title" className="text-xl font-bold text-[#173b32]">Record payment without cheque</h2><p className="mt-1 text-sm text-[#718078]">{settlementDraft.cheque.party || (settlementDraft.cheque.direction === 'given' ? 'Supplier' : 'Customer')} · {settlementDraft.cheque.number || 'Cheque'} · {money(settlementDraft.cheque.amount)} will be settled in its khata and this cheque reminder will stop.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Payment date<DateDmyInput required value={settlementDraft.date} onChange={(event) => setSettlementDraft((current) => ({ ...current, date: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label><label className="grid gap-1 text-sm font-semibold">Paid by<select value={settlementDraft.method} onChange={(event) => setSettlementDraft((current) => ({ ...current, method: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal"><option value="cash">Cash</option><option value="bank">Bank / transfer</option></select></label>{settlementDraft.method === 'bank' && <><label className="grid gap-1 text-sm font-semibold sm:col-span-2">Bank account<select value={settlementDraft.bankId} onChange={(event) => setSettlementDraft((current) => ({ ...current, bankId: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal"><option value="">{banks.length ? 'Choose account or enter bank name' : 'Enter bank name below'}</option>{banks.filter((entry) => entry.active !== false).map((bank) => <option value={bank.id} key={bank.id}>{bank.name}</option>)}</select></label>{!settlementDraft.bankId && <label className="grid gap-1 text-sm font-semibold">Bank name<input required value={settlementDraft.bankName} onChange={(event) => setSettlementDraft((current) => ({ ...current, bankName: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label>}{!settlementDraft.bankId && <label className="grid gap-1 text-sm font-semibold">Account / reference<input value={settlementDraft.accountNumber} onChange={(event) => setSettlementDraft((current) => ({ ...current, accountNumber: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label>}</>}<label className="grid gap-1 text-sm font-semibold sm:col-span-2">Note (optional)<input value={settlementDraft.remarks} onChange={(event) => setSettlementDraft((current) => ({ ...current, remarks: event.target.value }))} className="h-10 rounded-lg border px-3 font-normal" /></label></div>{settlementError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{settlementError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setSettlementDraft(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-[#155b4b] px-4 py-2 text-sm font-semibold text-white">Save payment & settle</button></div></form></div>}
    </main>
  )
}

function EditChequeDialog({ cheque, onClose, onSave }) {
  const [dueDate, setDueDate] = useState(cheque.expectedClearanceDate || cheque.dueDate || '')
  const [notes, setNotes] = useState(cheque.notes || '')
  const [reason, setReason] = useState('')
  return <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="edit-cheque-title" onSubmit={(event) => { event.preventDefault(); onSave({ expectedClearanceDate: dueDate, notes, remarks: reason }) }} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl"><div className="flex justify-between"><h2 id="edit-cheque-title" className="text-lg font-bold">Edit cheque details</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div><label className="block text-sm font-semibold">Expected clearance<DateDmyInput required value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" /></label><label className="block text-sm font-semibold">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" /></label>{dueDate !== (cheque.expectedClearanceDate || cheque.dueDate || '') && <label className="block text-sm font-semibold">Reason for rescheduling<input required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-lg border px-3" /></label>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button type="submit" className="rounded-lg bg-[#155b4b] px-4 py-2 font-semibold text-white">Save</button></div></form></div>
}
