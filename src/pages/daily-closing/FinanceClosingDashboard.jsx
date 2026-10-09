import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarClock, ChevronDown, CircleAlert, Download, Landmark, Plus, Printer, RefreshCw, Search, Wallet } from 'lucide-react'
import { calculateBankBalanceSummary } from '../../data/businessLogic.js'
import { hasModulePermission } from '../../permissions.js'

const suggestedBanks = ['ABL', 'Faysal Bank', 'Meezan Bank', 'UBL', 'Easypaisa', 'JazzCash']
const chequeStatuses = ['Pending', 'Deposited / Presented', 'Under Clearing', 'Cleared', 'Bounced / Dishonoured', 'Returned', 'Rescheduled', 'Replaced', 'Cancelled']
const activeChequeStatuses = new Set(['Pending', 'Deposited / Presented', 'Under Clearing', 'Rescheduled'])
const money = (value) => `Rs. ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const validDate = (value) => String(value || '').slice(0, 10)

function dueIndicator(cheque, date) {
  if (!activeChequeStatuses.has(cheque.status)) return null
  const due = validDate(cheque.expectedClearanceDate || cheque.dueDate)
  if (!due) return null
  if (due < date) {
    const days = Math.max(1, Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86400000))
    return { label: `Overdue · ${days}d`, className: 'bg-rose-100 text-rose-800', overdueDays: days }
  }
  if (due === date) return { label: 'Due today', className: 'bg-amber-100 text-amber-800', overdueDays: 0 }
  const tomorrow = new Date(`${date}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (due === tomorrow.toISOString().slice(0, 10)) return { label: 'Due tomorrow', className: 'bg-orange-100 text-orange-800', overdueDays: 0 }
  return null
}

function Metric({ label, value, tone = 'green', icon: Icon }) {
  const tones = { green: 'text-emerald-800 bg-emerald-50', blue: 'text-sky-800 bg-sky-50', orange: 'text-orange-800 bg-orange-50', red: 'text-rose-800 bg-rose-50', neutral: 'text-stone-700 bg-stone-100' }
  return <article className="min-w-0 border border-[#e2e8e2] bg-white p-3.5 sm:p-4 rounded-lg">
    <div className="flex items-center justify-between gap-2"><span className="text-[11px] leading-4 text-[#718078]">{label}</span><span className={`grid place-items-center w-7 h-7 shrink-0 rounded-md ${tones[tone]}`}><Icon size={15} /></span></div>
    <strong className="block mt-2 text-base sm:text-lg leading-6 text-[#173b32]">{value}</strong>
  </article>
}

function Field({ label, ...props }) {
  return <label className="block text-xs font-semibold text-[#42584c]">{label}<input {...props} className={`mt-1 block w-full h-10 px-3 rounded-md border border-[#dfe6df] bg-white text-sm font-normal text-[#21372e] focus:outline-none focus:border-[#47846b] ${props.className || ''}`} /></label>
}

function TabButton({ current, value, onClick, children }) {
  return <button type="button" role="tab" aria-selected={current === value} onClick={() => onClick(value)} className={`shrink-0 px-3.5 py-2.5 border-b-2 text-xs font-bold ${current === value ? 'border-[#176148] text-[#176148]' : 'border-transparent text-[#748078] hover:text-[#36564a]'}`}>{children}</button>
}

export default function FinanceClosingDashboard({ database, date, movement, user, permissions = {}, onAddBank, onUpdateBank, onSaveBankBalances, onRecordBankTransaction, onUpdateChequeStatus, onUpdateChequeDetails, onCreateCheque }) {
  const [tab, setTab] = useState('summary')
  const [accountName, setAccountName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [balanceInputs, setBalanceInputs] = useState({})
  const [balanceNotes, setBalanceNotes] = useState({})
  const [transaction, setTransaction] = useState({ type: 'withdrawal', accountId: '', destinationAccountId: '', destination: 'cash', amount: '', date, reference: '', note: '' })
  const [newCheque, setNewCheque] = useState({ direction: 'received', partyId: '', number: '', bank: '', amount: '', issued: date, dueDate: '', expectedClearanceDate: '', notes: '' })
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [bankFilter, setBankFilter] = useState('all')
  const [chequeDrafts, setChequeDrafts] = useState({})
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const canDaily = (action) => user?.role === 'admin' || hasModulePermission(permissions, 'dailyClosing', action)
  const canBanks = canDaily('bankBalances')
  const canCash = canDaily('cashManagement')
  const canChequeRecords = canDaily('chequeRecords')
  const canChequeUpdates = canDaily('chequeUpdates')
  const canWithdrawals = canDaily('withdrawals')
  const canHistory = canDaily('dailyHistory')
  const canExport = canDaily('financialExport')
  const cheques = database.cheques || []
  const tabs = [
    ...(canBanks || canCash ? [{ value: 'summary', label: 'Balances & Cash' }] : []),
    ...(canChequeRecords ? [{ value: 'cheques', label: `Cheque tracking (${cheques.length})` }] : []),
    ...(canWithdrawals ? [{ value: 'withdrawals', label: 'Withdrawals & Transfers' }] : []),
    ...(canHistory ? [{ value: 'history', label: 'Financial history' }] : []),
  ]
  useEffect(() => {
    if (!tabs.some((entry) => entry.value === tab)) setTab(tabs[0]?.value || '')
  }, [tab, canBanks, canCash, canChequeRecords, canChequeUpdates, canWithdrawals, canHistory])

  const banks = database.bankAccounts || []
  const accounts = banks.filter((account) => account.active !== false)
  const bankSummary = calculateBankBalanceSummary(database, date)
  const records = database.dailyClosings || []
  const closingRecord = records.find((entry) => entry.date === date && entry.type === 'closing')
  const actualCash = Number(closingRecord?.counted ?? movement.expectedCash)
  const cashDifference = closingRecord ? Number(closingRecord.counted ?? closingRecord.amount) - Number(closingRecord.amount || 0) : null
  const availableFunds = bankSummary.currentTotal + actualCash
  const visibleCheques = useMemo(() => cheques.filter((cheque) => {
    const term = search.trim().toLowerCase()
    const searchable = [cheque.number, cheque.party, cheque.bank, cheque.notes, cheque.followUpNote].some((value) => String(value || '').toLowerCase().includes(term))
    const dateValue = validDate(cheque.expectedClearanceDate || cheque.dueDate || cheque.issued)
    return searchable && (direction === 'all' || cheque.direction === direction) && (statusFilter === 'all' || cheque.status === statusFilter) && (bankFilter === 'all' || cheque.bank === bankFilter) && (!dateFrom || dateValue >= dateFrom) && (!dateTo || dateValue <= dateTo)
  }).sort((left, right) => validDate(left.expectedClearanceDate || left.dueDate).localeCompare(validDate(right.expectedClearanceDate || right.dueDate))), [cheques, search, direction, statusFilter, bankFilter, dateFrom, dateTo])
  const pendingCheques = cheques.filter((cheque) => activeChequeStatuses.has(cheque.status))
  const dueCheques = pendingCheques.map((cheque) => ({ cheque, due: dueIndicator(cheque, date) }))
  const dueTodayCount = dueCheques.filter(({ due }) => due?.label === 'Due today').length
  const overdueCount = dueCheques.filter(({ due }) => due?.overdueDays > 0).length
  const bouncedCount = cheques.filter((cheque) => ['Bounced', 'Bounced / Dishonoured', 'Returned'].includes(cheque.status)).length
  const incomingPending = pendingCheques.filter((cheque) => cheque.direction === 'received').reduce((sum, cheque) => sum + Number(cheque.amount || 0), 0)
  const outgoingPending = pendingCheques.filter((cheque) => cheque.direction === 'given').reduce((sum, cheque) => sum + Number(cheque.amount || 0), 0)
  const receipts = (database.payments || []).filter((entry) => entry.date === date && entry.type === 'customer-payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const payments = (database.payments || []).filter((entry) => entry.date === date && entry.type === 'supplier-payment').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    + (database.expenses || []).filter((entry) => entry.date === date).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const transactionsForHistory = (database.bankTransactions || []).filter((entry) => (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)).slice(0, 100)

  const addBank = async () => {
    const name = accountName.trim()
    if (!name) return
    const saved = await onAddBank({ name, openingBalance: Number(openingBalance || 0) })
    if (saved) {
      setAccountName('')
      setOpeningBalance('0')
    }
  }

  const saveBalances = async () => {
    const balances = accounts.map((account) => ({
      accountId: account.id,
      closingBalance: balanceInputs[account.id] === undefined ? bankSummary.accounts.find((entry) => entry.accountId === account.id)?.currentBalance || 0 : Number(balanceInputs[account.id]),
      note: balanceNotes[account.id] || '',
    }))
    await onSaveBankBalances({ date, balances })
  }

  const submitTransaction = async (event) => {
    event.preventDefault()
    if (!transaction.accountId || Number(transaction.amount) <= 0) return
    const saved = await onRecordBankTransaction(transaction.accountId, { ...transaction, amount: Number(transaction.amount) })
    if (saved) setTransaction((current) => ({ ...current, amount: '', reference: '', note: '' }))
  }

  const submitCheque = async (event) => {
    event.preventDefault()
    const partyType = newCheque.direction === 'given' ? 'supplier' : 'customer'
    if (!newCheque.partyId || Number(newCheque.amount) <= 0) return
    const saved = await onCreateCheque({ ...newCheque, partyType, amount: Number(newCheque.amount) })
    if (saved) setNewCheque((current) => ({ ...current, partyId: '', number: '', bank: '', amount: '', notes: '' }))
  }

  const updateCheque = async (cheque, status) => {
    if (['Cleared', 'Cancelled', 'Bounced / Dishonoured'].includes(status) && !window.confirm(`Confirm marking cheque ${cheque.number || cheque.id} as ${status}?`)) return
    const draft = chequeDrafts[cheque.id] || {}
    await onUpdateChequeStatus(cheque.id, status, {
      remarks: draft.remarks || '',
      bounceDate: draft.bounceDate || date,
      bounceReason: draft.bounceReason || draft.remarks || '',
      bankCharges: Number(draft.bankCharges || 0),
    })
  }

  const updateChequeDetails = async (cheque) => {
    const draft = chequeDrafts[cheque.id] || {}
    await onUpdateChequeDetails(cheque.id, {
      expectedClearanceDate: draft.dueDate ?? cheque.expectedClearanceDate ?? '',
      remarks: draft.rescheduleReason || '',
      followUpNote: draft.followUpNote ?? cheque.followUpNote ?? '',
    })
  }

  const exportHistory = () => {
    const lines = [
      ['Date', 'Record', 'Reference', 'Amount', 'Status / Note'],
      ...transactionsForHistory.map((entry) => [entry.date, entry.type, entry.reference, entry.amount, entry.note]),
      ...(database.bankBalanceRecords || []).filter((entry) => (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)).map((entry) => [entry.date, 'Bank closing balance', entry.accountName, entry.closingBalance, entry.note]),
      ...cheques.filter((entry) => (!dateFrom || validDate(entry.issued) >= dateFrom) && (!dateTo || validDate(entry.issued) <= dateTo)).map((entry) => [entry.issued, `${entry.direction === 'given' ? 'Outgoing' : 'Incoming'} cheque`, entry.number, entry.amount, entry.status]),
    ]
    const csv = lines.map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = `financial-history-${date}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <section className="mt-7" aria-label="Financial closing dashboard">
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div><p className="text-[10px] uppercase font-bold tracking-[2px] text-[#718078]">Finance control</p><h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#173b32]">Daily financial summary</h2><p className="mt-1 text-xs text-[#718078]">{date} · {user?.name || 'Authorized user'}</p></div>
      <div className="flex items-center gap-2">{canHistory && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#dfe6df] bg-white text-xs font-semibold text-[#52645c] hover:bg-[#f7faf7]"><Printer size={15} />Print</button>}{canExport && <button type="button" onClick={exportHistory} className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-[#dfe6df] bg-white text-xs font-semibold text-[#52645c] hover:bg-[#f7faf7]"><Download size={15} />Export CSV</button>}</div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 mb-5">
      {canBanks && <Metric label="Total bank balance" value={money(bankSummary.currentTotal)} icon={Landmark} />}
      {canCash && <Metric label={closingRecord ? 'Cash in hand' : 'Expected cash · not counted'} value={money(actualCash)} icon={Banknote} tone="blue" />}
      {canBanks && canCash && <Metric label="Available funds" value={money(availableFunds)} icon={Wallet} tone="green" />}
      {canChequeRecords && <Metric label="Incoming pending" value={money(incomingPending)} icon={ArrowDownLeft} tone="orange" />}
      {canChequeRecords && <Metric label="Outgoing pending" value={money(outgoingPending)} icon={ArrowUpRight} tone="orange" />}
      {canChequeRecords && <Metric label="Cheques due today" value={dueTodayCount} icon={CalendarClock} tone="orange" />}
      {canChequeRecords && <Metric label="Overdue cheques" value={overdueCount} icon={CircleAlert} tone={overdueCount ? 'red' : 'neutral'} />}
      {canChequeRecords && <Metric label="Bounced cheques" value={bouncedCount} icon={RefreshCw} tone={bouncedCount ? 'red' : 'neutral'} />}
      {canCash && <Metric label="Today's receipts" value={money(receipts)} icon={ArrowDownLeft} tone="green" />}
      {canCash && <Metric label="Today's payments" value={money(payments)} icon={ArrowUpRight} tone="blue" />}
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-[#dfe6df] mb-4" role="tablist" aria-label="Daily finance sections">
      {tabs.map((entry) => <TabButton key={entry.value} current={tab} value={entry.value} onClick={setTab}>{entry.label}</TabButton>)}
    </div>
    {!tabs.length && <p className="py-8 text-center text-sm text-[#748078]">No additional finance sections are enabled for your account.</p>}

    {(tab === 'summary' && (canBanks || canCash)) && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {canBanks && <section className="border border-[#e2e8e2] rounded-lg bg-white overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#edf0eb]"><div><h3 className="text-sm font-bold text-[#20382d]">Bank balance summary</h3><p className="text-[11px] mt-0.5 text-[#748078]">Closing date: {date} · changes are retained as revisions</p></div><strong className="text-sm text-[#176148]">{money(bankSummary.currentTotal)}</strong></header>
        {accounts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#f8faf7] text-[#748078]"><tr><th className="px-3 py-2 font-semibold">Bank / wallet</th><th className="px-3 py-2 font-semibold">Previous close</th><th className="px-3 py-2 font-semibold">Expected</th><th className="px-3 py-2 font-semibold">Actual close</th><th className="px-3 py-2 font-semibold">Difference</th><th className="px-3 py-2" /></tr></thead><tbody>{accounts.map((account) => {
          const row = bankSummary.accounts.find((entry) => entry.accountId === account.id)
          const actual = balanceInputs[account.id] === undefined ? row?.currentBalance ?? 0 : Number(balanceInputs[account.id] || 0)
          const difference = Math.round((actual - Number(row?.expectedBalance || 0) + Number.EPSILON) * 100) / 100
          return <tr key={account.id} className="border-t border-[#edf0eb]"><td className="px-3 py-2.5 font-semibold text-[#31473c]">{account.name}<button type="button" aria-label={`Rename ${account.name}`} title="Rename bank" onClick={() => { const name = window.prompt('Bank or wallet name', account.name); if (name?.trim()) void onUpdateBank(account.id, { name: name.trim() }) }} className="ml-2 text-[10px] font-medium text-[#176148] hover:underline">Rename</button></td><td className="px-3 py-2.5 text-[#65736b]">{money(row?.previousBalance)}</td><td className="px-3 py-2.5 text-[#65736b]">{money(row?.expectedBalance)}</td><td className="px-3 py-2"><input aria-label={`${account.name} actual closing balance`} type="number" min="0" step="0.01" value={balanceInputs[account.id] ?? row?.currentBalance ?? 0} onChange={(event) => setBalanceInputs((current) => ({ ...current, [account.id]: event.target.value }))} className="w-28 h-8 px-2 rounded border border-[#dfe6df] text-xs" /></td><td className={`px-3 py-2.5 font-bold ${difference ? 'text-rose-700' : 'text-emerald-700'}`}>{difference ? money(difference) : '—'}</td><td className="px-3 py-2"><button type="button" onClick={() => { if (window.confirm(`Deactivate ${account.name}? Historical balances will be preserved.`)) void onUpdateBank(account.id, { active: false }) }} className="text-[10px] font-semibold text-[#8b5650] hover:underline">Deactivate</button></td></tr>
        })}</tbody></table><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 py-3 border-t border-[#edf0eb]">{accounts.map((account) => <input key={account.id} aria-label={`${account.name} balance note`} value={balanceNotes[account.id] || ''} onChange={(event) => setBalanceNotes((current) => ({ ...current, [account.id]: event.target.value }))} placeholder={`${account.name}: difference explanation`} className="h-9 px-2.5 rounded border border-[#dfe6df] text-xs" />)}</div><div className="flex justify-between items-center px-3 py-3 border-t border-[#edf0eb]"><span className="text-xs text-[#748078]">Previous total {money(bankSummary.previousTotal)} · Expected {money(bankSummary.expectedTotal)}</span><button type="button" onClick={saveBalances} className="h-9 px-3 rounded-md bg-[#155b4b] text-white text-xs font-bold hover:bg-[#104b3e]">Save balances</button></div></div> : <div className="p-5"><p className="text-xs text-[#748078]">No bank accounts yet. Add the accounts used by this business.</p><div className="flex flex-wrap gap-2 mt-3">{suggestedBanks.filter((name) => !banks.some((account) => account.name.toLowerCase() === name.toLowerCase())).map((name) => <button key={name} type="button" onClick={() => onAddBank({ name, openingBalance: 0 })} className="h-8 px-3 rounded-md border border-[#dfe6df] text-xs font-semibold text-[#36564a] hover:bg-[#f1f5f0]">+ {name}</button>)}</div></div>}
        <form onSubmit={(event) => { event.preventDefault(); void addBank() }} className="flex flex-wrap gap-2 p-3 border-t border-[#edf0eb] bg-[#fbfcfa]"><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Custom bank or wallet" aria-label="Custom bank or wallet name" className="flex-1 min-w-[150px] h-9 px-3 rounded-md border border-[#dfe6df] text-xs" /><input type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} aria-label="Opening balance" className="w-32 h-9 px-2.5 rounded-md border border-[#dfe6df] text-xs" /><button type="submit" className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-[#edf5ee] text-[#176148] text-xs font-bold"><Plus size={14} />Add bank</button></form>
        {banks.some((account) => account.active === false) && <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-[#edf0eb]"><span className="text-[10px] text-[#748078]">Inactive:</span>{banks.filter((account) => account.active === false).map((account) => <button key={account.id} type="button" onClick={() => void onUpdateBank(account.id, { active: true })} className="text-[10px] font-semibold text-[#176148] hover:underline">Reactivate {account.name}</button>)}</div>}
        {suggestedBanks.filter((name) => !banks.some((account) => account.name.toLowerCase() === name.toLowerCase())).length > 0 && <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-[#edf0eb]"><span className="text-[10px] text-[#748078]">Quick add:</span>{suggestedBanks.filter((name) => !banks.some((account) => account.name.toLowerCase() === name.toLowerCase())).map((name) => <button key={name} type="button" onClick={() => void onAddBank({ name, openingBalance: 0 })} className="text-[10px] font-semibold text-[#176148] hover:underline">{name}</button>)}</div>}
      </section>}

      {canCash && <section className="border border-[#e2e8e2] rounded-lg bg-white overflow-hidden">
        <header className="px-4 py-3 border-b border-[#edf0eb]"><h3 className="text-sm font-bold text-[#20382d]">Cash in hand summary</h3><p className="text-[11px] mt-0.5 text-[#748078]">Expected cash counts only completed cash movements</p></header>
        <div className="divide-y divide-[#edf0eb]">{[
          ['Opening cash', movement.opening], ['Cash sales', movement.cashSales], ['Customer cash payments', movement.customerPayments], ['Cash received from other sources', movement.cashOtherReceipts], ['Cash withdrawn from banks', movement.cashWithdrawals], ['Supplier cash payments', -movement.supplierPayments], ['Cash expenses', -movement.cashExpenses], ['Cash refunds', -movement.cashRefunds], ['Cash deposited to banks', -movement.cashDeposits], ['Expected closing cash', movement.expectedCash], [closingRecord ? 'Actual physical cash' : 'Actual cash · not yet counted', actualCash],
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 px-4 py-2.5 text-xs"><span className={label.includes('closing') || label.includes('physical') ? 'font-bold text-[#31473c]' : 'text-[#65736b]'}>{label}</span><strong className="text-[#31473c]">{money(value)}</strong></div>)}</div>
        {cashDifference !== null && cashDifference !== 0 && <p className="m-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">Cash shortage / excess: {money(cashDifference)}. {closingRecord.note || 'Add a reason when recording the closing.'}</p>}
      </section>}
      </div>
    )}

    {tab === 'cheques' && <section className="border border-[#e2e8e2] rounded-lg bg-white overflow-hidden">
      <header className="p-4 border-b border-[#edf0eb]"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-[#20382d]">Cheque records & tracking</h3><p className="text-[11px] mt-0.5 text-[#748078]">Incoming pending {money(incomingPending)} · outgoing pending {money(outgoingPending)}</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#87928a]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cheque, party, bank" className="h-9 w-44 pl-8 pr-2 rounded-md border border-[#dfe6df] text-xs" /></label><select aria-label="Cheque direction" value={direction} onChange={(event) => setDirection(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] text-xs"><option value="all">All directions</option><option value="received">Incoming</option><option value="given">Outgoing</option></select><select aria-label="Cheque bank" value={bankFilter} onChange={(event) => setBankFilter(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] text-xs"><option value="all">All banks</option>{[...new Set(cheques.map((cheque) => cheque.bank).filter(Boolean))].map((bank) => <option key={bank}>{bank}</option>)}</select><select aria-label="Cheque status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 px-2 rounded-md border border-[#dfe6df] text-xs"><option value="all">All statuses</option>{chequeStatuses.map((status) => <option key={status}>{status}</option>)}</select></div></div><div className="flex flex-wrap gap-2 mt-3"><input type="date" aria-label="Filter from due date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><input type="date" aria-label="Filter through due date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter('all'); setDirection('all'); setBankFilter('all') }} className="h-8 px-2.5 rounded text-xs text-[#52645c] hover:bg-[#f1f5f0]">Clear filters</button></div></header>
      {canChequeRecords && <form onSubmit={submitCheque} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 p-3 border-b border-[#edf0eb] bg-[#fbfcfa]">
        <label className="text-[10px] font-semibold text-[#748078]">Cheque type<select value={newCheque.direction} onChange={(event) => setNewCheque((current) => ({ ...current, direction: event.target.value, partyId: '' }))} className="mt-1 w-full h-9 px-2 rounded border border-[#dfe6df] bg-white text-xs"><option value="received">Incoming · customer</option><option value="given">Outgoing · supplier</option></select></label>
        <label className="text-[10px] font-semibold text-[#748078]">{newCheque.direction === 'given' ? 'Supplier' : 'Customer'}<select required value={newCheque.partyId} onChange={(event) => setNewCheque((current) => ({ ...current, partyId: event.target.value }))} className="mt-1 w-full h-9 px-2 rounded border border-[#dfe6df] bg-white text-xs"><option value="">Select party</option>{(newCheque.direction === 'given' ? database.suppliers || [] : database.customers || []).map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select></label>
        <Field label="Cheque number" value={newCheque.number} onChange={(event) => setNewCheque((current) => ({ ...current, number: event.target.value }))} />
        <Field label="Bank name" value={newCheque.bank} onChange={(event) => setNewCheque((current) => ({ ...current, bank: event.target.value }))} />
        <Field label="Amount (Rs.)" type="number" min="0.01" step="0.01" required value={newCheque.amount} onChange={(event) => setNewCheque((current) => ({ ...current, amount: event.target.value }))} />
        <Field label={newCheque.direction === 'given' ? 'Issue date' : 'Received date'} type="date" required value={newCheque.issued} onChange={(event) => setNewCheque((current) => ({ ...current, issued: event.target.value }))} />
        <Field label="Due date" type="date" value={newCheque.dueDate} onChange={(event) => setNewCheque((current) => ({ ...current, dueDate: event.target.value }))} />
        <Field label="Expected clearance" type="date" value={newCheque.expectedClearanceDate} onChange={(event) => setNewCheque((current) => ({ ...current, expectedClearanceDate: event.target.value }))} />
        <Field label="Remarks" value={newCheque.notes} onChange={(event) => setNewCheque((current) => ({ ...current, notes: event.target.value }))} />
        <button type="submit" disabled={!newCheque.partyId || Number(newCheque.amount) <= 0} className="self-end h-9 px-3 rounded-md bg-[#155b4b] text-white text-xs font-bold disabled:opacity-50">Record cheque</button>
      </form>}
      {visibleCheques.length ? <div className="divide-y divide-[#edf0eb]">{visibleCheques.map((cheque) => {
        const due = dueIndicator(cheque, date)
        const draft = chequeDrafts[cheque.id] || {}
        return <article key={cheque.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[#243b30]">{cheque.number || 'Cheque'}</strong><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cheque.direction === 'given' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{cheque.direction === 'given' ? 'Outgoing' : 'Incoming'}</span>{due && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${due.className}`}>{due.label}</span>}<span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold">{cheque.status || 'Pending'}</span></div><p className="mt-1 text-xs text-[#65736b]">{cheque.party || 'Unassigned party'} · {cheque.bank || 'Bank not specified'} · {validDate(cheque.issued)} · Due {validDate(cheque.expectedClearanceDate || cheque.dueDate) || 'not set'}{cheque.actualClearanceDate ? ` · Cleared ${validDate(cheque.actualClearanceDate)}` : ''}</p><strong className="block mt-1 text-sm text-[#20382d]">{money(cheque.amount)}</strong>{cheque.notes && <p className="mt-1 text-xs text-[#748078]">{cheque.notes}</p>}{cheque.bounceReason && <p className="mt-1 text-xs text-rose-700">Bounce reason: {cheque.bounceReason}{Number(cheque.bankCharges) ? ` · bank charges ${money(cheque.bankCharges)}` : ''}</p>}{cheque.followUpNote && <p className="mt-1 text-xs text-amber-800">Follow-up: {cheque.followUpNote}</p>}</div>
            <div className="flex items-center gap-2">{canChequeUpdates && <select aria-label={`Status for ${cheque.number || cheque.id}`} value={cheque.status || 'Pending'} onChange={(event) => void updateCheque(cheque, event.target.value)} className="h-9 max-w-[190px] px-2 rounded-md border border-[#dfe6df] bg-white text-xs">{chequeStatuses.map((status) => <option key={status}>{status}</option>)}</select>}{canChequeRecords && <details className="relative"><summary title="Cheque history" className="grid place-items-center w-9 h-9 rounded-md border border-[#dfe6df] text-[#64736b] cursor-pointer"><ChevronDown size={16} /></summary><div className="absolute right-0 z-20 mt-2 w-[min(88vw,380px)] max-h-64 overflow-auto rounded-lg border border-[#dfe6df] bg-white p-3 shadow-xl"><h4 className="text-xs font-bold text-[#31473c]">Status history</h4>{(cheque.statusHistory || []).length ? [...cheque.statusHistory].reverse().map((entry, index) => <p key={`${entry.date}-${index}`} className="border-t border-[#edf0eb] py-2 text-[11px] text-[#65736b]">{entry.previousStatus} → {entry.status} · {new Date(entry.date).toLocaleString()} · {entry.userName || 'System'}{entry.remarks ? ` · ${entry.remarks}` : ''}</p>) : <p className="mt-2 text-[11px] text-[#748078]">No status changes recorded.</p>}{(cheque.rescheduleHistory || []).map((entry, index) => <p key={`reschedule-${index}`} className="border-t border-[#edf0eb] py-2 text-[11px] text-[#65736b]">Due date {entry.previousDate || '—'} → {entry.updatedDate} · {entry.reason} · {entry.userName}</p>)}</div></details>}</div></div>
          {canChequeUpdates && <><div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mt-3"><label className="text-[10px] font-semibold text-[#748078]">Expected clearance / due date<input type="date" value={draft.dueDate ?? validDate(cheque.expectedClearanceDate || cheque.dueDate)} onChange={(event) => setChequeDrafts((current) => ({ ...current, [cheque.id]: { ...current[cheque.id], dueDate: event.target.value } }))} className="mt-1 block w-full h-9 px-2 rounded border border-[#dfe6df] text-xs text-[#31473c]" /></label><label className="text-[10px] font-semibold text-[#748078]">Reschedule reason / follow-up note<input value={draft.rescheduleReason ?? cheque.followUpNote ?? ''} onChange={(event) => setChequeDrafts((current) => ({ ...current, [cheque.id]: { ...current[cheque.id], rescheduleReason: event.target.value, followUpNote: event.target.value } }))} placeholder="Required when changing due date" className="mt-1 block w-full h-9 px-2 rounded border border-[#dfe6df] text-xs text-[#31473c]" /></label><button type="button" onClick={() => void updateChequeDetails(cheque)} className="self-end h-9 px-3 rounded-md bg-[#edf5ee] text-[#176148] text-xs font-bold">Save details</button></div>
          {(cheque.status === 'Pending' || cheque.status === 'Deposited / Presented') && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2"><input aria-label={`Status remarks for ${cheque.number}`} value={draft.remarks || ''} onChange={(event) => setChequeDrafts((current) => ({ ...current, [cheque.id]: { ...current[cheque.id], remarks: event.target.value } }))} placeholder="Status remarks" className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><input aria-label={`Bounce reason for ${cheque.number}`} value={draft.bounceReason || ''} onChange={(event) => setChequeDrafts((current) => ({ ...current, [cheque.id]: { ...current[cheque.id], bounceReason: event.target.value } }))} placeholder="Bounce reason" className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><input aria-label={`Bank charges for ${cheque.number}`} type="number" min="0" step="0.01" value={draft.bankCharges || ''} onChange={(event) => setChequeDrafts((current) => ({ ...current, [cheque.id]: { ...current[cheque.id], bankCharges: event.target.value } }))} placeholder="Bounce bank charges" className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /></div>}</>}
        </article>
      })}</div> : <div className="py-12 text-center text-xs text-[#748078]">No cheques match these filters.</div>}
    </section>}

    {tab === 'withdrawals' && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-4">
      <form onSubmit={submitTransaction} className="space-y-3 p-4 border border-[#e2e8e2] rounded-lg bg-white"><div><h3 className="text-sm font-bold text-[#20382d]">Withdrawals & transfers</h3><p className="mt-1 text-[11px] text-[#748078]">Transfers change balances only; they are not income or expenses.</p></div>
        <label className="block text-xs font-semibold text-[#42584c]">Transaction<input type="text" value={{ withdrawal: 'Withdrawal', deposit: 'Cash deposit to bank', transfer: 'Bank-to-bank transfer' }[transaction.type]} readOnly className="mt-1 w-full h-9 px-2.5 rounded-md border border-[#dfe6df] bg-[#f8faf7] text-xs" /><select aria-label="Transaction type" value={transaction.type} onChange={(event) => setTransaction((current) => ({ ...current, type: event.target.value }))} className="mt-1 w-full h-9 px-2.5 rounded-md border border-[#dfe6df] text-xs"><option value="withdrawal">Withdrawal from bank</option><option value="deposit">Cash deposited to bank</option><option value="transfer">Bank-to-bank transfer</option></select></label>
        <label className="block text-xs font-semibold text-[#42584c]">{transaction.type === 'deposit' ? 'Deposit to bank' : 'Source bank'}<select required value={transaction.accountId} onChange={(event) => setTransaction((current) => ({ ...current, accountId: event.target.value }))} className="mt-1 w-full h-10 px-2.5 rounded-md border border-[#dfe6df] bg-white text-xs"><option value="">Select bank account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        {transaction.type === 'withdrawal' && <label className="block text-xs font-semibold text-[#42584c]">Destination<select value={transaction.destination} onChange={(event) => setTransaction((current) => ({ ...current, destination: event.target.value }))} className="mt-1 w-full h-10 px-2.5 rounded-md border border-[#dfe6df] text-xs"><option value="cash">Cash in hand</option><option value="account">Another bank account</option></select></label>}
        {(transaction.type === 'transfer' || transaction.type === 'withdrawal' && transaction.destination === 'account') && <label className="block text-xs font-semibold text-[#42584c]">Destination bank<select required value={transaction.destinationAccountId} onChange={(event) => setTransaction((current) => ({ ...current, destinationAccountId: event.target.value }))} className="mt-1 w-full h-10 px-2.5 rounded-md border border-[#dfe6df] text-xs"><option value="">Select destination</option>{accounts.filter((account) => account.id !== transaction.accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
        <div className="grid grid-cols-2 gap-2"><Field label="Amount (Rs.)" type="number" min="0.01" step="0.01" required value={transaction.amount} onChange={(event) => setTransaction((current) => ({ ...current, amount: event.target.value }))} /><Field label="Date" type="date" required value={transaction.date} onChange={(event) => setTransaction((current) => ({ ...current, date: event.target.value }))} /></div><Field label="Reference number" value={transaction.reference} onChange={(event) => setTransaction((current) => ({ ...current, reference: event.target.value }))} /><Field label="Note" value={transaction.note} onChange={(event) => setTransaction((current) => ({ ...current, note: event.target.value }))} /><button type="submit" disabled={!accounts.length || !transaction.accountId || Number(transaction.amount) <= 0} className="w-full h-10 rounded-md bg-[#155b4b] text-white text-xs font-bold disabled:opacity-50">Record transaction</button>
      </form>
      {canHistory && <section className="border border-[#e2e8e2] rounded-lg bg-white overflow-hidden"><header className="px-4 py-3 border-b border-[#edf0eb]"><h3 className="text-sm font-bold text-[#20382d]">Recent bank transactions</h3></header>{(database.bankTransactions || []).slice(0, 30).length ? <div className="divide-y divide-[#edf0eb]">{database.bankTransactions.slice(0, 30).map((entry) => <div key={entry.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-xs"><span><strong className="text-[#31473c] capitalize">{entry.type}</strong><span className="text-[#748078]"> · {banks.find((account) => account.id === entry.accountId)?.name || 'Bank'}{entry.destinationAccountId ? ` → ${banks.find((account) => account.id === entry.destinationAccountId)?.name || 'Destination'}` : entry.destination === 'cash' ? ' → Cash' : ''}</span><span className="block mt-1 text-[10px] text-[#89938d]">{entry.date} {entry.reference ? `· ${entry.reference}` : ''} {entry.note ? `· ${entry.note}` : ''}</span></span><strong className="text-[#31473c]">{money(entry.amount)}</strong></div>)}</div> : <div className="py-12 text-center text-xs text-[#748078]">No bank transactions recorded.</div>}</section>}
    </div>}

    {tab === 'history' && <section className="border border-[#e2e8e2] rounded-lg bg-white overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[#edf0eb]"><div><h3 className="text-sm font-bold text-[#20382d]">Daily & bank history</h3><p className="mt-1 text-[11px] text-[#748078]">Balance corrections are stored as separate revisions.</p></div><div className="flex flex-wrap items-center gap-2"><input type="date" aria-label="History start date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><input type="date" aria-label="History end date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-8 px-2 rounded border border-[#dfe6df] text-xs" /><button type="button" onClick={exportHistory} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#edf5ee] text-[#176148] text-xs font-bold"><Download size={14} />Export</button></div></header><div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4"><div><h4 className="mb-2 text-xs font-bold text-[#42584c]">Daily cash closings</h4><div className="max-h-80 overflow-auto rounded border border-[#edf0eb]">{records.filter((entry) => entry.type === 'closing' && (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)).sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <div key={entry.id} className="flex justify-between gap-2 px-3 py-2 border-b border-[#edf0eb] text-xs"><span>{entry.date}<small className="block text-[#859088]">{entry.closedByName || entry.updatedByName || ''}{entry.note ? ` · ${entry.note}` : ''}</small></span><strong>{money(entry.counted ?? entry.amount)}</strong></div>)}</div></div><div><h4 className="mb-2 text-xs font-bold text-[#42584c]">Bank closing snapshots</h4><div className="max-h-80 overflow-auto rounded border border-[#edf0eb]">{(database.bankBalanceRecords || []).filter((entry) => (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map((entry) => <div key={entry.id} className="flex justify-between gap-2 px-3 py-2 border-b border-[#edf0eb] text-xs"><span>{entry.date} · {entry.accountName}<small className="block text-[#859088]">Revision {entry.revision} · {entry.responsibleUserName || 'Authorized user'}{entry.note ? ` · ${entry.note}` : ''}</small></span><strong>{money(entry.closingBalance)}{Number(entry.difference) ? <small className="block font-normal text-rose-700">Diff {money(entry.difference)}</small> : null}</strong></div>)}</div></div></div></section>}
  </section>
}
