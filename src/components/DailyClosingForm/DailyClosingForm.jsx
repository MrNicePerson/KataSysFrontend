import { useState } from 'react'

export default function DailyClosingForm({ expectedCash, onSave }) {
  const [cashCounted, setCashCounted] = useState('')
  const [cashRemoved, setCashRemoved] = useState('0')
  const [note, setNote] = useState('')
  const expectedAfterDeposit = Math.max(0, expectedCash - Number(cashRemoved || 0))
  const difference = cashCounted === '' ? null : Number(cashCounted) - expectedAfterDeposit

  return (
    <section data-keyboard-scope className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#edf0eb]">
        <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">3. Daily closing</h2>
        <span className="px-2.5 py-1 rounded-md bg-[#f6f8f1] text-[#718078] text-xs font-semibold">
          {cashCounted === '' ? 'Open' : 'Ready to save'}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-[#718078]">
        Expected cash is calculated automatically. Count your drawer and save the difference.
      </p>

      <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
        Cash counted in drawer
        <input
          type="number"
          min="0"
          placeholder="Enter counted amount"
          value={cashCounted}
          onChange={(event) => setCashCounted(event.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
        Cash removed / deposited (optional)
        <input
          type="number"
          value={cashRemoved}
          onChange={(event) => setCashRemoved(event.target.value)}
          min="0"
          className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
        Closing note / difference reason (optional)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows="2"
          className="w-full p-3 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
        />
      </label>

      <div className="p-4 rounded-xl bg-[#fafbf8] border border-[#edf0eb] space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span className="text-[#718078]">Expected cash:</span>
          <strong className="text-[#173b32] font-bold">Rs. {expectedAfterDeposit.toLocaleString()}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-[#718078]">Difference after count:</span>
          <strong className={difference === null ? 'text-[#718078]' : difference === 0 ? 'text-[#155b4b]' : difference > 0 ? 'text-blue-700' : 'text-red-700'}>
            {difference === null ? 'Enter actual cash to calculate' : `Rs. ${difference.toLocaleString()}`}
          </strong>
        </div>
      </div>

      <button
        data-enter-next
        type="button"
        className="w-full h-12 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-sm sm:text-base font-bold transition-all shadow-sm cursor-pointer active:scale-98"
        disabled={cashCounted === ''}
        onClick={() => onSave({ actual: Number(cashCounted), expected: expectedAfterDeposit, difference, note })}
      >
        Save daily closing
      </button>
    </section>
  )
}
