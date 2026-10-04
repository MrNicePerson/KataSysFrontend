import { calculatePaymentSummary } from '../../data/paymentCalculations.js'

const money = (value) => `Rs. ${value.toLocaleString()}`

export default function Payment({ total, payments, chequeDetails, onChange, onChequeDetailsChange }) {
  const { cheque, cashAndBankReceived, pendingCheque, uncoveredBalance, excessPayment } = calculatePaymentSummary(total, payments)
  const updateChequeDetails = (field, value) => onChequeDetailsChange({ ...chequeDetails, [field]: value })

  return (
    <section data-keyboard-scope className="p-4 sm:p-6 lg:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel hover:border-[#155b4b]/20 hover:shadow-panel-hover transition-all">
      <h2 className="text-[#173b32] text-lg sm:text-xl lg:text-2xl font-semibold leading-tight mb-5">
        Payment · split across methods
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-[#173b32] text-sm sm:text-base font-semibold">Cash (optional)</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={payments.cash}
            onChange={(event) => onChange('cash', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[#173b32] text-sm sm:text-base font-semibold">Bank transfer (optional)</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={payments.bank}
            onChange={(event) => onChange('bank', event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[#173b32] text-sm sm:text-base font-semibold">Cheque amount (optional)</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={payments.cheque}
            onChange={(event) => onChange('cheque', event.target.value)}
          />
        </label>
      </div>

      <details className="mt-5 p-4 rounded-xl border border-[#e2e6df] bg-[#fafbf8] group" open={cheque > 0}>
        <summary className="text-[#173b32] text-sm sm:text-base font-semibold cursor-pointer select-none">
          Cheque details
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-[#edf0eb]">
          <label className="flex flex-col gap-1.5">
            <span className="text-[#173b32] text-xs sm:text-sm font-semibold">Cheque number</span>
            <input
              className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b] focus:ring-2 focus:ring-[#155b4b]/15 transition-all"
              value={chequeDetails.chequeNumber}
              onChange={(event) => updateChequeDetails('chequeNumber', event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[#173b32] text-xs sm:text-sm font-semibold">Bank name</span>
            <input
              className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b] focus:ring-2 focus:ring-[#155b4b]/15 transition-all"
              value={chequeDetails.bankName}
              onChange={(event) => updateChequeDetails('bankName', event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[#173b32] text-xs sm:text-sm font-semibold">Cheque date</span>
            <input
              type="date"
              className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b] focus:ring-2 focus:ring-[#155b4b]/15 transition-all"
              value={chequeDetails.chequeDate}
              onChange={(event) => updateChequeDetails('chequeDate', event.target.value)}
            />
          </label>
        </div>
      </details>

      <div className="grid gap-3 sm:gap-4 mt-5 p-4 rounded-xl bg-[#f7faf5] border border-[#edf0eb]">
        <div className="flex justify-between items-center text-sm sm:text-base text-[#29443b]">
          <span>Cash + bank received</span>
          <strong className="text-[#29443b] font-bold">{money(cashAndBankReceived)}</strong>
        </div>
        <div className="flex justify-between items-center text-sm sm:text-base text-[#29443b]">
          <span>Pending cheque</span>
          <strong className="text-[#29443b] font-bold">{money(pendingCheque)}</strong>
        </div>
        <div className="flex justify-between items-center text-sm sm:text-base text-[#29443b] pt-2 border-t border-[#e2e6df]">
          <span className="font-medium">Uncovered balance</span>
          <strong className="text-[#155b4b] text-base sm:text-lg font-bold">{money(uncoveredBalance)}</strong>
        </div>
      </div>

      <p className="mt-4 text-xs sm:text-sm text-[#7b857e]">
        Khata due until cheque clears: <span className="font-semibold text-[#173b32]">{money(Math.max(0, total - cashAndBankReceived))}</span>
      </p>

      {excessPayment > 0 && (
        <p className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold" role="alert">
          Payment exceeds bill total by {money(excessPayment)}
        </p>
      )}

      <label className="flex flex-col gap-2 mt-5">
        <span className="text-[#173b32] text-sm sm:text-base font-semibold">Due / cheque follow-up date</span>
        <input
          type="date"
          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
          value={chequeDetails.dueDate}
          onChange={(event) => updateChequeDetails('dueDate', event.target.value)}
        />
      </label>
    </section>
  )
}
