import { useEffect, useState } from 'react'
import DailyClosingForm from '../../components/DailyClosingForm/DailyClosingForm.jsx'
import SavedDailyRecords from '../../components/SavedDailyRecords/SavedDailyRecords.jsx'
import FinanceClosingDashboard from './FinanceClosingDashboard.jsx'
import { calculateDailyClosing, localDateString } from '../../data/businessLogic.js'
import { hasModulePermission } from '../../permissions.js'

export default function DailyClosing({ database, onSave, onDelete, onReviewStock, user, onAddBank, onUpdateBank, onSaveBankBalances, onRecordBankTransaction, onCreateCheque, onUpdateChequeStatus, onUpdateChequeDetails }) {
  const [date, setDate] = useState(localDateString())
  const [activeTab, setActiveTab] = useState('opening')
  const [opening, setOpening] = useState('')
  const [note, setNote] = useState('')
  const movement = calculateDailyClosing(database, date)
  const openingRecord = database.dailyClosings.find((entry) => entry.date === date && entry.type === 'opening')
  const closingRecord = database.dailyClosings.find((entry) => entry.date === date && entry.type === 'closing')
  const canDaily = (action) => user?.role === 'admin' || hasModulePermission(user?.permissions, 'dailyClosing', action)
  const canViewCash = ['cashManagement', 'dailyOpeningCreate', 'dailyOpeningEdit', 'dailyClosingCreate', 'dailyClosingEdit', 'dailyHistory'].some((action) => canDaily(action))
  const [year, month, day] = date.split('-').map(Number)
  const monthEndDate = Number.isInteger(day) && day === new Date(year, month, 0).getDate()
  const monthlyAudit = [...(database.stockAudits || [])].reverse().find((audit) => audit.period === 'monthly' && audit.periodKey === date.slice(0, 7) && audit.date === date)
  const auditedCounts = new Map((monthlyAudit?.items || []).map((item) => [item.productId, Number(item.countedAvailable)]))
  const stockAuditDone = Boolean(monthlyAudit)
    && auditedCounts.size === database.products.length
    && database.products.every((product) => auditedCounts.get(product.id) === Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0))
  const canSaveClosing = !monthEndDate || stockAuditDone
  const selectedTab = openingRecord && activeTab === 'closing' ? 'closing' : 'opening'
  useEffect(() => {
    setActiveTab('opening')
    setOpening(openingRecord?.amount == null ? '' : String(openingRecord.amount))
    setNote(openingRecord?.note || '')
  }, [date, openingRecord?.id, openingRecord?.updatedAt])
  const onDate = (entry) => entry.date === date
  const bankIn = database.payments.filter((entry) => onDate(entry) && entry.type === 'customer-payment' && ['bank', 'cheque-cleared'].includes(entry.method)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankOut = database.payments.filter((entry) => onDate(entry) && entry.type === 'supplier-payment' && ['bank', 'cheque-cleared'].includes(entry.method)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankTransfers = database.financeEntries.filter((entry) => onDate(entry) && entry.type === 'transfer').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankCapital = database.financeEntries.filter((entry) => onDate(entry) && entry.type === 'capital').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const bankNet = bankIn + bankCapital - bankOut - bankTransfers
  const closingRecords = database.dailyClosings.map((entry) => ({
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
  const saveOpening = () => onSave({ type: 'opening', date, amount: Number(opening), note })
  const movements = [
    ['Cash sales', movement.cashSales],
    ['Customer cash received', movement.customerPayments],
    ['Other cash received', movement.cashOtherReceipts],
    ['Supplier cash paid', -movement.supplierPayments],
    ['Cash refunds', -movement.cashRefunds],
    ['Cash expenses / withdrawals', -movement.cashExpenses],
  ]

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Daily open &amp; closing
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Cash movements are calculated from saved sales, payments, refunds and expenses.
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

      <div className="flex gap-2 border-b border-[#e2e6df] mb-6" role="tablist" aria-label="Daily opening and closing">
        <button
          type="button"
          role="tab"
          id="daily-opening-tab"
          aria-controls="daily-opening-panel"
          aria-selected={selectedTab === 'opening'}
          className={`px-4 py-2.5 border-b-2 text-sm font-semibold transition-colors ${selectedTab === 'opening' ? 'border-[#155b4b] text-[#155b4b]' : 'border-transparent text-[#718078] hover:text-[#173b32]'}`}
          onClick={() => setActiveTab('opening')}
        >
          Daily opening
        </button>
        <button
          type="button"
          role="tab"
          id="daily-closing-tab"
          aria-controls="daily-closing-panel"
          aria-selected={selectedTab === 'closing'}
          disabled={!openingRecord}
          className={`px-4 py-2.5 border-b-2 text-sm font-semibold transition-colors ${selectedTab === 'closing' ? 'border-[#155b4b] text-[#155b4b]' : 'border-transparent text-[#718078]'} ${openingRecord ? 'hover:text-[#173b32]' : 'cursor-not-allowed opacity-45'}`}
          onClick={() => {
            if (openingRecord) setActiveTab('closing')
          }}
        >
          Daily closing
        </button>
      </div>

      {selectedTab === 'opening' ? (
        <>
        <section id="daily-opening-panel" role="tabpanel" aria-labelledby="daily-opening-tab" className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#edf0eb]">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">Daily opening</h2>
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${openingRecord ? 'bg-[#e8f2e3] text-[#557250]' : 'bg-[#f6f8f1] text-[#718078]'}`}>
              {openingRecord ? 'Saved' : 'Not saved'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#718078]">
            Enter the cash physically available before sales start.
          </p>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Opening cash in drawer
            <input
              type="number"
              min="0"
              placeholder="0"
              value={opening}
              disabled={Boolean(openingRecord) && !canDaily('dailyOpeningEdit')}
              onChange={(event) => setOpening(event.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Opening note (optional)
            <textarea
              value={note}
              disabled={Boolean(openingRecord) && !canDaily('dailyOpeningEdit')}
              onChange={(event) => setNote(event.target.value)}
              rows="2"
              className="w-full p-3 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          {canDaily('dailyOpeningCreate') || canDaily('dailyOpeningEdit') ? <button
            type="button"
            className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            disabled={opening === '' || (openingRecord ? !canDaily('dailyOpeningEdit') : !canDaily('dailyOpeningCreate'))}
            onClick={saveOpening}
          >
            {openingRecord ? 'Update daily opening' : 'Save daily opening'}
        </button> : <p className="text-xs text-[#718078]">You have view-only access to the daily opening.</p>}
        </section>
        {canDaily('dailyHistory') && <SavedDailyRecords records={openingRecords} onDelete={canDaily('closingApprove') ? onDelete : undefined} />}
        </>
      ) : (
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
                onSave({ type: 'closing', date, amount: expected, counted: actual, note: closingNote, correctionReason })
              }
            />}
          </div>

          {canDaily('bankBalances') && <section className="mt-6 p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">Bank movement · {date}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-xs sm:text-sm">
              {[['Money in', bankIn], ['Capital', bankCapital], ['Supplier payments', -bankOut], ['Transfers', -bankTransfers], ['Net bank movement', bankNet]].map(([label, amount]) => <div key={label} className="p-3 rounded-lg bg-[#fafbf8] border border-[#edf0eb]"><span className="block text-[#718078]">{label}</span><strong className="text-[#173b32]">Rs. {Number(amount).toLocaleString()}</strong></div>)}
            </div>
          </section>}

          {canDaily('dailyHistory') && <SavedDailyRecords records={savedClosingRecords} onDelete={canDaily('closingApprove') ? onDelete : undefined} />}
          <FinanceClosingDashboard
            database={database}
            date={date}
            movement={movement}
            user={user}
            permissions={user?.permissions || {}}
            onAddBank={onAddBank}
            onUpdateBank={onUpdateBank}
            onSaveBankBalances={onSaveBankBalances}
            onRecordBankTransaction={onRecordBankTransaction}
            onUpdateChequeStatus={onUpdateChequeStatus}
            onUpdateChequeDetails={onUpdateChequeDetails}
            onCreateCheque={onCreateCheque}
          />
        </div>
      )}
    </main>
  )
}
