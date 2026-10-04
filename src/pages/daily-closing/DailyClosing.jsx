import { useState } from 'react'
import DailyClosingForm from '../../components/DailyClosingForm/DailyClosingForm.jsx'
import SavedDailyRecords from '../../components/SavedDailyRecords/SavedDailyRecords.jsx'
import { calculateDailyClosing, localDateString } from '../../data/businessLogic.js'

export default function DailyClosing({ database, onSave }) {
  const [date, setDate] = useState(localDateString())
  const [opening, setOpening] = useState('')
  const [note, setNote] = useState('')
  const movement = calculateDailyClosing(database, date)
  const openingRecord = database.dailyClosings.find((entry) => entry.date === date && entry.type === 'opening')
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
  }))
  const saveOpening = () => onSave({ type: 'opening', date, amount: Number(opening), note })
  const movements = [
    ['Cash sales', movement.cashSales],
    ['Customer cash received', movement.customerPayments],
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#edf0eb]">
            <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">1. Daily opening</h2>
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
              onChange={(event) => setOpening(event.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Opening note (optional)
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows="2"
              className="w-full p-3 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>

          <button
            type="button"
            className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            disabled={opening === ''}
            onClick={saveOpening}
          >
            Save daily opening
          </button>
        </section>

        <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
          <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
            2. Today’s movement
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
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DailyClosingForm
          expectedCash={movement.expectedCash}
          onSave={({ expected, actual, note: closingNote }) =>
            onSave({ type: 'closing', date, amount: expected, counted: actual, note: closingNote })
          }
        />
      </div>

      <section className="mt-6 p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
        <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">Bank movement · {date}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4 text-xs sm:text-sm">
          {[['Money in', bankIn], ['Capital', bankCapital], ['Supplier payments', -bankOut], ['Transfers', -bankTransfers], ['Net bank movement', bankNet]].map(([label, amount]) => <div key={label} className="p-3 rounded-lg bg-[#fafbf8] border border-[#edf0eb]"><span className="block text-[#718078]">{label}</span><strong className="text-[#173b32]">Rs. {Number(amount).toLocaleString()}</strong></div>)}
        </div>
      </section>

      <SavedDailyRecords records={closingRecords} />
    </main>
  )
}
