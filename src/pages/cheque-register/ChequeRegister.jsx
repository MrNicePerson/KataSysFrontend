import { useState } from 'react'
import DateDmyInput from '../../components/DateDmyInput.jsx'
import { formatDmyDate } from '../../data/dateDmy.js'

export default function ChequeRegister({ cheques = [], customers = [], suppliers = [], onStatusChange, onCreate }) {
  const [adding, setAdding] = useState(false)
  const [direction, setDirection] = useState('received')
  const [partyId, setPartyId] = useState('')
  const [message, setMessage] = useState('')
  const [issued, setIssued] = useState('')
  const [expectedClearanceDate, setExpectedClearanceDate] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10))
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const parties = direction === 'received' ? customers : suppliers
  const dayKey = (value) => String(value || '').slice(0, 10)
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthCells = Array.from({ length: 42 }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - monthStart.getDay() + index))
  const dateAmounts = new Map()
  const bankAmounts = new Map()
  for (const cheque of cheques) {
    const key = dayKey(cheque.issued)
    if (key) dateAmounts.set(key, (dateAmounts.get(key) || 0) + Number(cheque.amount || 0))
    const bank = String(cheque.bank || 'Unknown bank').trim() || 'Unknown bank'
    bankAmounts.set(bank, (bankAmounts.get(bank) || 0) + Number(cheque.amount || 0))
  }
  const selectedDayCheques = cheques.filter((cheque) => dayKey(cheque.issued) === calendarDate)

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

  const groups = [
    ['Supplier cheques – given', 'given'],
    ['Customer cheques – received', 'received'],
  ]
  const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`
  const visibleGroups = activeTab === 'overview' ? groups : groups.filter(([, groupDirection]) => activeTab === 'supplier' ? groupDirection === 'given' : groupDirection === 'received')

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
        {[['overview', 'Overview'], ['supplier', 'Supplier cheques'], ['customer', 'Customer cheques']].map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => { setActiveTab(tab); setAdding(false); setDirection(tab === 'customer' ? 'received' : 'given') }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === tab ? 'bg-[#155b4b] text-white' : 'bg-white text-[#52645c] hover:bg-[#e8f2e3]'}`}>{label}<span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">{tab === 'supplier' ? cheques.filter((row) => row.direction === 'given').length : tab === 'customer' ? cheques.filter((row) => row.direction === 'received').length : cheques.length}</span></button>)}
      </nav>
      {activeTab === 'overview' && <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]" aria-label="Cheque overview">
        <div className="rounded-2xl border border-[#e2e6df] bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-[#173b32]">Cheque overview by date</h2><div className="flex gap-2"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded border px-3 py-1">‹</button><strong className="min-w-36 text-center">{calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded border px-3 py-1">›</button></div></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#718078]">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="py-1 font-semibold">{day}</div>)}
            {monthCells.map((day) => { const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`; const total = dateAmounts.get(key) || 0; return <button key={key} type="button" onClick={() => { setCalendarDate(key); setIssued(key); setAdding(true) }} aria-label={`${day.getDate()} ${total ? `, ${money(total)} cheques` : ''}`} className={`min-h-12 rounded-lg border p-1 ${day.getMonth() !== calendarMonth.getMonth() ? 'text-gray-300' : 'text-[#173b32]'} ${calendarDate === key ? 'border-[#155b4b] bg-[#e8f2e3]' : 'border-transparent hover:border-[#dfe4dc]'}`}><span>{day.getDate()}</span>{total > 0 && <small className="block truncate text-[9px] font-semibold text-[#155b4b]">{money(total)}</small>}</button> })}
          </div>
          <p className="mt-2 text-xs text-[#718078]">Select a date to view totals and use it for a new cheque.</p>
        </div>
        <div className="rounded-2xl border border-[#e2e6df] bg-white p-4 shadow-panel"><h2 className="mb-3 font-bold text-[#173b32]">Totals by bank</h2><div className="max-h-64 space-y-2 overflow-auto">{[...bankAmounts].sort((a,b) => b[1]-a[1]).map(([bank, total]) => <div key={bank} className="flex justify-between gap-3 border-b border-[#edf0eb] pb-2 text-sm"><span>{bank}</span><strong>{money(total)}</strong></div>)}{!bankAmounts.size && <p className="text-sm text-[#718078]">No cheque records yet.</p>}</div></div>
      </section>}
      {activeTab === 'overview' && <p className="mb-4 rounded-xl bg-[#e8f2e3] p-3 text-sm text-[#173b32]">{formatDmyDate(calendarDate)}: {selectedDayCheques.length} cheques · {money(selectedDayCheques.reduce((sum,row) => sum + Number(row.amount || 0),0))}</p>}
        {activeTab !== 'overview' && <button type="button" className="mb-6 h-11 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold" onClick={() => { setDirection(activeTab === 'customer' ? 'received' : 'given'); setAdding((value) => !value) }}>
          {adding ? 'Close cheque form' : `Add ${activeTab === 'supplier' ? 'supplier' : 'customer'} cheque`}
        </button>}
        {activeTab === 'overview' && <button type="button" className="mb-6 h-11 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold" onClick={() => setActiveTab('supplier')}>
          Add cheque
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
        {visibleGroups.map(([title, direction]) => {
          const rows = cheques.filter((cheque) => cheque.direction === direction)
          return (
            <section key={direction}>
              <h2 className="text-[#173b32] text-lg sm:text-xl font-bold mb-3 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-xs sm:text-sm font-normal text-[#718078]">
                  · {money(rows.reduce((sum, row) => sum + row.amount, 0))}
                </span>
              </h2>

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
                                cheque.status === 'Cleared'
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
                            {cheque.status === 'Pending' ? (
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
    </main>
  )
}
