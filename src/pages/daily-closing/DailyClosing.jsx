import { BANK_OPTIONS } from '../../components/Payment/Payment.jsx'
import { dailyBankReceipts } from '../../data/dailyBankReceipts.js'
import { useEffect, useState } from 'react'
import { CheckCircle2, Wallet, Landmark, TrendingUp, TrendingDown, Banknote, CalendarDays, ArrowRightLeft, ReceiptText, History, ShieldCheck } from 'lucide-react'
import { calculateBankBalanceSummary, calculateDailyProfit } from '../../data/businessLogic.js'
import DailyClosingForm from '../../components/DailyClosingForm/DailyClosingForm.jsx'
import SavedDailyRecords from '../../components/SavedDailyRecords/SavedDailyRecords.jsx'
import FinanceClosingDashboard from './FinanceClosingDashboard.jsx'
import { calculateDailyClosing, localDateString } from '../../data/businessLogic.js'
import { hasModulePermission } from '../../permissions.js'
import { canEditDailyOpening, resolveDailyClosingTab } from '../../data/dailyClosingAccess.js'

export default function DailyClosing({ database, onSave, onDelete, onReviewStock, user, branchId = 'default', initialTab = 'overview', onAddBank, onUpdateBank, onSaveBankBalances, onRecordBankTransaction, onCreateCheque, onUpdateChequeStatus, onUpdateChequeDetails }) {
  const [date, setDate] = useState(localDateString())
  const [activeTab, setActiveTab] = useState(initialTab)
  const [editingOpening, setEditingOpening] = useState(false)
  const [opening, setOpening] = useState('')
  const [note, setNote] = useState('')
  const movement = calculateDailyClosing(database, date)
  const bankSummary = calculateBankBalanceSummary(database, date)
  const profit = calculateDailyProfit(database, date)
  const bankReceipts = dailyBankReceipts(database, date, BANK_OPTIONS.map(bank => bank.name))
  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`
  const matchesBranch = (entry) => String(entry.branchId || 'default') === String(branchId || 'default')
  const openingRecord = database.dailyClosings.find((entry) => entry.date === date && entry.type === 'opening' && matchesBranch(entry))
  const closingRecord = database.dailyClosings.find((entry) => entry.date === date && entry.type === 'closing' && matchesBranch(entry))
  const canDaily = (action) => user?.role === 'admin' || hasModulePermission(user?.permissions, 'dailyClosing', action)
  const canEditOpening = canEditDailyOpening(user)
  const canViewCash = ['cashManagement', 'dailyOpeningCreate', 'dailyOpeningEdit', 'dailyClosingCreate', 'dailyClosingEdit', 'dailyHistory'].some((action) => canDaily(action))
  const [year, month, day] = date.split('-').map(Number)
  const monthEndDate = Number.isInteger(day) && day === new Date(year, month, 0).getDate()
  const monthlyAudit = [...(database.stockAudits || [])].reverse().find((audit) => audit.period === 'monthly' && audit.periodKey === date.slice(0, 7) && audit.date === date)
  const auditedCounts = new Map((monthlyAudit?.items || []).map((item) => [item.productId, Number(item.countedAvailable)]))
  const stockAuditDone = Boolean(monthlyAudit)
    && auditedCounts.size === database.products.length
    && database.products.every((product) => auditedCounts.get(product.id) === Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0))
  const canSaveClosing = !monthEndDate || stockAuditDone
  const selectedTab = resolveDailyClosingTab(activeTab, openingRecord)
  useEffect(() => {
    setActiveTab(initialTab === 'closing' && !openingRecord ? 'opening' : initialTab)
    setEditingOpening(false)
    setOpening(openingRecord?.amount == null ? '' : String(openingRecord.amount))
    setNote(openingRecord?.note || '')
  }, [date, openingRecord?.id, openingRecord?.updatedAt, initialTab])
  useEffect(() => {
    if (activeTab === 'closing' && !openingRecord) setActiveTab('opening')
  }, [activeTab, openingRecord?.id])
  const onDate = (entry) => String(entry.date || '').slice(0, 10) === date
  const bankLedgerIn = database.payments.filter((entry) => onDate(entry) && entry.type === 'customer-payment' && ['bank', 'cheque-cleared'].includes(entry.method)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankIn = Number(movement.bankSales || 0) + database.payments.filter((entry) => onDate(entry) && entry.type === 'customer-payment' && ['bank', 'cheque-cleared'].includes(entry.method) && !(database.sales || []).some((sale) => sale.id === entry.referenceId)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankOut = database.payments.filter((entry) => onDate(entry) && entry.type === 'supplier-payment' && ['bank', 'cheque-cleared'].includes(entry.method)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankTransfers = database.financeEntries.filter((entry) => onDate(entry) && entry.type === 'transfer').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankCapital = database.financeEntries.filter((entry) => onDate(entry) && entry.type === 'capital').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankNet = bankIn + bankCapital - bankOut - bankTransfers - Number(movement.bankExpenses || 0)
  const closingRecords = database.dailyClosings.filter(matchesBranch).map((entry) => ({
    id: entry.id,
    date: entry.date,
    type: entry.type,
    expected: Number(entry.amount || 0),
    actual: Number(entry.counted ?? entry.amount ?? 0),
    difference: Number(entry.counted ?? entry.amount ?? 0) - Number(entry.amount || 0),
    note: entry.note || '',
    finalized: Boolean(entry.finalized),
  }))
  const openingRecords = closingRecords.filter((entry) => entry.type === 'opening')
  const savedClosingRecords = closingRecords.filter((entry) => entry.type === 'closing')
  const saveOpening = () => {
    if (openingRecord && !canEditOpening) return
    if (!Number.isFinite(Number(opening)) || Number(opening) < 0 || opening === '') return
    return onSave({ type: 'opening', date, branchId, amount: Number(opening), note })
  }
  const movements = [
    ['Cash sales', movement.cashSales],
    ['Customer cash received', movement.customerPayments],
    ['Other cash received', movement.cashOtherReceipts],
    ['Supplier cash paid', -movement.supplierPayments],
    ['Cash refunds', -movement.cashRefunds],
    ['Cash expenses / withdrawals', -movement.cashExpenses],
  ]
  const saleBreakdown = [
    ['Cash sales', movement.cashSales],
    ['Bank sales', movement.bankSales],
    ['Cheque sales', movement.chequeSales],
    ['Credit / khata sales', movement.creditSales],
  ]
  const expenseBreakdown = [
    ['Total expenses', movement.expenseTotal],
    ['Cash expenses', movement.cashExpenses],
    ['Bank expenses', movement.bankExpenses],
    ['Cheque expenses', movement.chequeExpenses],
  ]

  const navTabs = [
    ['overview', 'Overview', Wallet],
    ['opening', 'Daily Opening', Banknote],
    ['closing', 'Daily Closing', CalendarDays],
    ...(canDaily('bankBalances') || canDaily('cashManagement') ? [['summary', 'Banks & Wallets', Landmark]] : []),
    ...(canDaily('chequeRecords') ? [['cheques', 'Cheques', ReceiptText]] : []),
    ...(canDaily('withdrawals') ? [['withdrawals', 'Withdrawals & Transfers', ArrowRightLeft]] : []),
    ...(canDaily('dailyHistory') ? [['history', 'Financial History', History]] : []),
  ]
  const financeTabs = ['summary', 'cheques', 'withdrawals', 'history']
  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 min-h-screen bg-[#f7f9f8] text-[#193c34]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            KATASYS / FINANCIAL MANAGEMENT
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Daily Opening &amp; Closing
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Manage your daily cash, banks, cheques and financial closing in one place.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#173b32]">
          Business date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
          />
        </label>
      </div>

      <nav className="flex items-center gap-1.5 overflow-x-auto border-b border-[#e0e9e3] mb-7 pb-px" aria-label="Financial management pages">
        {navTabs.map(([value, label, Icon]) => {
          const blockedClosing = value === 'closing' && !openingRecord
          return <button key={value} type="button" disabled={blockedClosing} title={blockedClosing ? 'Complete Daily Opening first' : undefined} onClick={() => setActiveTab(value)} aria-current={selectedTab === value ? 'page' : undefined}
            className={`inline-flex shrink-0 items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-[3px] transition-colors ${selectedTab === value ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg' : blockedClosing ? 'border-transparent text-[#a7b1aa] cursor-not-allowed' : 'border-transparent text-[#718078] hover:text-emerald-800'}`}>
            <Icon size={16} />{label}</button>
        })}
      </nav>
      {!openingRecord && <p role="status" className="-mt-5 mb-6 text-sm text-amber-800">Complete Daily Opening for {date} before Daily Closing becomes available.</p>}
      {selectedTab === 'overview' && <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Financial Overview</h2><p className="text-sm text-[#75857b] mt-1">Live figures from saved financial records · {date}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${openingRecord ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{openingRecord ? '● Opening completed' : '● Opening pending'}</span></div>
        <section className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4" aria-label="Daily finance overview">
          {[
            ['Opening Cash', openingRecord ? formatMoney(openingRecord.amount) : 'Not opened', openingRecord ? 'Opening saved' : 'Start your day', 'bg-[#eaf6ed]', Wallet],
            ['Current Cash Balance', formatMoney(movement.expectedCash), 'Calculated from ledger', 'bg-[#eaf3ff]', Banknote],
            ['Total Bank Balance', canDaily('bankBalances') ? formatMoney(bankSummary.currentTotal) : 'Restricted', 'Saved bank accounts', 'bg-[#f1efff]', Landmark],
            ['Total Profit', formatMoney(profit.netProfit), `Gross ${formatMoney(profit.grossProfit)}`, 'bg-[#e8f7ef]', TrendingUp],
            ['Total Expenses', formatMoney(movement.expenseTotal), 'Today’s expenses', 'bg-[#fff0ed]', TrendingDown],
          ].map(([label, value, detail, tone, Icon]) => <article key={label} className={`rounded-2xl border border-[#e3eae5] p-4 sm:p-5 ${tone}`}>
            <div className="flex items-center justify-between gap-2"><p className="text-xs text-[#60746a] font-semibold">{label}</p><Icon size={18} className="text-[#476a5a] shrink-0" /></div>
            <strong className="block text-lg sm:text-2xl text-[#183f35] mt-4 break-words">{value}</strong><span className="block text-xs text-[#6e8175] mt-1">{detail}</span>
          </article>)}
        </section>
        {canDaily('bankBalances') && <section className="rounded-2xl border border-[#e3eae5] bg-white p-5 sm:p-6 shadow-sm" aria-label="Saved bank balances">
          <div className="mb-5"><h2 className="text-lg font-bold">Banks &amp; Wallets</h2><p className="text-xs text-[#75857b] mt-1">Money received on {date}</p></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {bankReceipts.accounts.map((row) => <article key={row.name} className="rounded-xl border border-[#e4eae5] bg-[#fbfdfb] p-4">
              <div className="flex items-center gap-2"><Landmark size={18} className="text-emerald-800" /><p className="text-sm font-semibold text-[#31473c]">{row.name}</p></div>
              <strong className="block mt-4 text-lg text-emerald-800">{formatMoney(row.amount)}</strong><p className="text-[11px] text-[#85938b] mt-1">Received today</p>
            </article>)}
          </div>
          {bankReceipts.unassigned > 0 && <p className="mt-3 text-xs text-[#718078]">Bank not specified: {formatMoney(bankReceipts.unassigned)}</p>}
          <div className="mt-5 pt-4 border-t border-[#e5ece7] flex justify-between items-center"><span className="text-sm font-semibold text-[#5c7266]">Total received in banks today</span><strong className="text-xl text-emerald-800">{formatMoney(bankReceipts.total)}</strong></div>
        </section>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-2xl bg-white border border-[#e3eae5] p-5 sm:p-6 shadow-sm"><h3 className="text-lg font-bold mb-4">Cash Position</h3><div className="space-y-3">{[['Opening Cash', openingRecord?.amount || 0], ['Cash Sales', movement.cashSales], ['Customer Recoveries', movement.customerPayments], ['Cash Refunds', -movement.cashRefunds], ['Cash Expenses', -movement.cashExpenses], ['Supplier Payments', -movement.supplierPayments]].map(([label, amount]) => <div key={label} className="flex justify-between gap-3 text-sm"><span className="text-[#718078]">{label}</span><strong className={amount < 0 ? 'text-rose-700' : 'text-[#244c3f]'}>{formatMoney(amount)}</strong></div>)}</div><div className="border-t mt-4 pt-4 flex justify-between gap-3"><strong>Expected Cash</strong><strong className="text-emerald-800">{formatMoney(movement.expectedCash)}</strong></div></section>
          <section className="rounded-2xl bg-white border border-[#e3eae5] p-5 sm:p-6 shadow-sm"><h3 className="text-lg font-bold mb-4">Today’s Financial Summary</h3><div className="space-y-3">{[['Cash Sales', movement.cashSales], ['Bank Sales', movement.bankSales], ['Cheque Sales', movement.chequeSales], ['Credit Sales', movement.creditSales], ['Gross Profit', profit.grossProfit], ['Total Expenses', movement.expenseTotal]].map(([label, amount]) => <div key={label} className="flex justify-between gap-3 text-sm"><span className="text-[#718078]">{label}</span><strong>{formatMoney(amount)}</strong></div>)}</div><div className="border-t mt-4 pt-4 flex justify-between gap-3"><strong>Net Profit</strong><strong className="text-emerald-800">{formatMoney(profit.netProfit)}</strong></div></section>
        </div>
        {!openingRecord && <button type="button" onClick={() => setActiveTab('opening')} className="px-5 py-3 bg-[#17694f] text-white rounded-xl text-sm font-bold">Open Today’s Cash →</button>}
      </div>}
      {selectedTab === 'opening' ? (

        <>
        <section id="daily-opening-panel" role="tabpanel" aria-labelledby="daily-opening-tab" className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#edf0eb]">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">Daily opening</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${openingRecord ? 'bg-[#e8f2e3] text-[#557250]' : 'bg-[#f6f8f1] text-[#718078]'}`}>
              {openingRecord ? 'Saved' : 'Not saved'}
            </span>
          </div>
          {openingRecord ? <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={18} /> Today's opening has been completed</p>
            <p className="mt-2 text-sm text-[#173b32]">Opening cash: <strong>{formatMoney(openingRecord.amount)}</strong></p>
            <p className="mt-1 text-xs text-[#617469]">{openingRecord.note || 'Opening recorded successfully.'}</p>
          </div> : <p className="text-xs sm:text-sm text-[#718078]">Enter the cash physically available before sales start.</p>}
          {openingRecord && !canEditOpening && <p className="text-xs text-[#718078]">Only an administrator can edit a saved daily opening.</p>}
          {openingRecord && canEditOpening && !editingOpening && <button type="button" onClick={() => setEditingOpening(true)} className="text-xs font-bold text-emerald-800 underline">Edit opening</button>}
          {(!openingRecord || (editingOpening && canEditOpening)) && <>
          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Opening cash in drawer
            <input
              type="number"
              min="0"
              placeholder="0"
              value={opening}
              disabled={Boolean(openingRecord) && !canEditOpening}
              onChange={(event) => setOpening(event.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Opening note (optional)
            <textarea
              value={note}
              disabled={Boolean(openingRecord) && !canEditOpening}
              onChange={(event) => setNote(event.target.value)}
              rows="2"
              className="w-full p-3 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          {canDaily('dailyOpeningCreate') || canEditOpening ? <button
            type="button"
            className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            disabled={opening === '' || (openingRecord ? !canEditOpening : !canDaily('dailyOpeningCreate'))}
            onClick={saveOpening}
          >
            {openingRecord ? 'Update daily opening' : 'Save daily opening'}
        </button> : <p className="text-xs text-[#718078]">You have view-only access to the daily opening.</p>}
          </>}
        </section>

        </>
      ) : selectedTab === 'closing' ? (
        <div id="daily-closing-panel" role="tabpanel" aria-labelledby="daily-closing-tab">
          {monthEndDate && <div className={`mb-5 p-4 rounded-xl border ${stockAuditDone ? 'border-[#cfe2c9] bg-[#f4f8f1]' : 'border-amber-300 bg-amber-50'}`}>
            <p className="text-sm font-semibold text-[#173b32]">{stockAuditDone ? 'Monthly stock review complete.' : 'Review and update every stock item before saving this month-end closing. Stock changes after review require a new audit.'}</p>
            {!stockAuditDone && <button type="button" onClick={onReviewStock} className="mt-3 h-10 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold">Review and update stock</button>}
          </div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {canViewCash && <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
              <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
                Today’s movement
              </h2>
              <div className="space-y-3">
                {movements.map(([label, amount]) => (
                  <div key={label} className="flex justify-between items-center text-xs sm:text-sm text-[#29443b]">
                    <span>{label}</span>
                    <strong className={amount < 0 ? 'text-red-700' : 'text-[#155b4b]'}>
                      Rs. {amount.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-[#e2e6df] flex justify-between items-center text-sm sm:text-base">
                <strong className="text-[#173b32]">Expected drawer cash</strong>
                <strong className="text-lg sm:text-xl text-[#155b4b] font-bold">
                  Rs. {movement.expectedCash.toLocaleString()}
                </strong>
              </div>
            </section>}

            {canViewCash && <DailyClosingForm
              expectedCash={movement.expectedCash}
              canSave={canSaveClosing && (closingRecord ? canDaily('dailyClosingEdit') : canDaily('dailyClosingCreate'))}
              canEdit={closingRecord ? canDaily('dailyClosingEdit') : canDaily('dailyClosingCreate')}
              existingRecord={closingRecord}
              onSave={({ expected, actual, note: closingNote, correctionReason }) =>
                onSave({ type: 'closing', date, branchId, amount: expected, counted: actual, note: closingNote, correctionReason })
              }
            />}
          </div>

          {canViewCash && <section className="mb-6 p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">Today’s sales by payment type</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs sm:text-sm">
              {saleBreakdown.map(([label, amount]) => <div key={label} className="p-3 rounded-lg bg-[#fafbf8] border border-[#edf0eb]"><span className="block text-[#718078]">{label}</span><strong className="text-[#155b4b]">Rs. {Number(amount || 0).toLocaleString()}</strong></div>)}
            </div>
          </section>}

          {canViewCash && <section className="mb-6 p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">Today’s expenses</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs sm:text-sm">
              {expenseBreakdown.map(([label, amount]) => <div key={label} className="p-3 rounded-lg bg-[#fffaf8] border border-[#f0e3df]"><span className="block text-[#718078]">{label}</span><strong className="text-red-700">Rs. {Number(amount || 0).toLocaleString()}</strong></div>)}
            </div>
          </section>}

          {canDaily('bankBalances') && <section className="mt-6 p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">Bank movement · {date}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-xs sm:text-sm">
              {[['Money in', bankIn], ['Capital', bankCapital], ['Supplier payments', -bankOut], ['Transfers', -bankTransfers], ['Net bank movement', bankNet]].map(([label, amount]) => <div key={label} className="p-3 rounded-lg bg-[#fafbf8] border border-[#edf0eb]"><span className="block text-[#718078]">{label}</span><strong className="text-[#173b32]">Rs. {Number(amount).toLocaleString()}</strong></div>)}
            </div>
          </section>}



        </div>
      ) : financeTabs.includes(selectedTab) ? (
        <FinanceClosingDashboard
          database={database} date={date} movement={movement} user={user} permissions={user?.permissions || {}}
          externalTab={selectedTab} onAddBank={onAddBank} onUpdateBank={onUpdateBank}
          onSaveBankBalances={onSaveBankBalances} onRecordBankTransaction={onRecordBankTransaction}
          onUpdateChequeStatus={onUpdateChequeStatus} onUpdateChequeDetails={onUpdateChequeDetails}
          onCreateCheque={onCreateCheque}
        />
      ) : null}
    </main>
  )
}
