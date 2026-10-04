import { useState } from 'react'
import { calculateAccountLedger } from '../../data/businessLogic.js'
import RecoveryAll from './RecoveryAll.jsx'

export default function CustomerKhata({ customers = [], payments = [], sales = [], returns = [], installments = [], onNewCustomer, onPayment, onBulkRecovery, onInstallmentPayment, onStatement }) {
  const [query, setQuery] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [message, setMessage] = useState('')
  const displayed = customers.filter((customer) => `${customer.name} ${customer.city || ''} ${customer.phone || ''}`.toLowerCase().includes(query.toLowerCase()))
  const amountToReceive = customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance || 0)), 0)
  const advanceBalance = customers.reduce((sum, customer) => sum + Math.max(0, -Number(customer.balance || 0)), 0)
  const stats = [
    ['Total customers', customers.length],
    ['Amount to receive', `Rs. ${amountToReceive.toLocaleString()}`],
    ['Advance balances', `Rs. ${advanceBalance.toLocaleString()}`],
    ['Transactions', payments.length + sales.length + returns.length],
  ]

  const receivePayment = async (customer) => {
    const amount = Number(window.prompt(`Cash received from ${customer.name} (Rs.)`, ''))
    if (Number.isFinite(amount) && amount > Number(customer.balance || 0)) {
      setMessage(`Cash recovery for ${customer.name} cannot exceed the outstanding balance.`)
      return
    }
    if (Number.isFinite(amount) && amount > 0) await onPayment?.({ accountId: customer.id, amount, method: 'cash', note: 'Khata payment' })
  }

  const ledgerFor = (customer) => calculateAccountLedger({ customers, payments, sales, returns }, 'customer', customer.id).entries

  const receiveInstallment = async (plan) => {
    const amount = Number(window.prompt(`Installment amount for ${plan.customer} (Rs.)`, ''))
    if (!Number.isFinite(amount) || amount <= 0) return
    const result = await onInstallmentPayment?.(plan.id, { amount, method: 'cash' })
    if (result) setMessage(`Installment payment recorded for ${plan.customer}.`)
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Customer khata
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            A clear account for every customer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          className="h-11 px-4 rounded-xl bg-[#155b4b] text-white text-xs sm:text-sm font-semibold"
          type="button"
          onClick={() => setRecoveryOpen(true)}
        >
          Recovery All
        </button>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={onNewCustomer}
        >
          + New customer
        </button>
        </div>
      </div>

      {message && <p className="mb-4 p-3 rounded-lg bg-[#eaf3e7] text-[#155b4b] text-sm" role="status">{message}</p>}
      {recoveryOpen && <RecoveryAll customers={customers} onClose={() => setRecoveryOpen(false)} onSave={async (input) => {
        const saved = await onBulkRecovery?.(input)
        if (saved) setMessage(`Recorded ${input.items.length} cash recovery payment${input.items.length === 1 ? '' : 's'}.`)
        return saved
      }} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
        {stats.map(([label, value]) => (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-1" key={label}>
            <span className="text-xs sm:text-sm font-medium text-[#718078]">{label}</span>
            <strong className="text-lg sm:text-xl lg:text-2xl font-bold text-[#173b32]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name..."
          className="w-full sm:max-w-md h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 shadow-xs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div data-keyboard-list className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {displayed.map((customer) => {
          const balance = Number(customer.balance || 0)
          const initials = customer.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
          const ledger = ledgerFor(customer)

          return (
            <article data-keyboard-row tabIndex={0} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-4" key={customer.id}>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-[#f1ebdd] text-[#173b32] grid place-items-center font-bold text-sm select-none">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <strong className="block text-[#173b32] text-base sm:text-lg font-bold truncate">{customer.name}</strong>
                  <small className="text-[#718078] text-xs truncate block">
                    {[customer.city, customer.phone].filter(Boolean).join(' · ') || 'Contact details not provided'}
                  </small>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#fafbf8] border border-[#edf0eb] flex justify-between items-center">
                <span className="text-xs font-semibold text-[#718078]">Balance</span>
                <div className="text-right">
                  <strong className={`block text-lg sm:text-xl font-bold ${balance > 0 ? 'text-red-700' : 'text-[#155b4b]'}`}>
                    Rs. {Math.abs(balance).toLocaleString()}
                  </strong>
                  <span className="text-[11px] text-[#718078] font-medium">
                    {balance < 0 ? 'Advance · Jama hai' : balance > 0 ? 'To receive · Lena hai' : 'Settled'}
                  </span>
                </div>
              </div>

              {balance > 0 && (
                <button
                  type="button"
                  className="w-full h-10 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                  onClick={() => receivePayment(customer)}
                >
                  Record cash received
                </button>
              )}

              <button type="button" data-keyboard-primary onClick={() => onStatement?.(customer.id)} className="w-full h-9 rounded-lg border border-[#dfe4dc] text-xs font-semibold text-[#173b32]">View / print statement</button>

              <details className="mt-auto group">
                <summary className="text-xs sm:text-sm font-semibold text-[#173b32] cursor-pointer select-none">
                  Account ledger ({ledger.length})
                </summary>
                <div className="mt-3 divide-y divide-[#edf0eb] max-h-48 overflow-y-auto pr-1 text-xs">
                  {ledger.length ? (
                    ledger.map((entry) => (
                      <div key={entry.id} className="py-2 flex justify-between items-center text-[#12332d]">
                        <span>{entry.date || '—'} · {entry.title}</span>
                        <strong className={entry.direction === 'credit' ? 'text-[#155b4b]' : 'text-red-700'}>
                          {entry.direction === 'credit' ? '− ' : entry.direction === 'debit' ? '+ ' : ''}
                          Rs. {Number(entry.amount || 0).toLocaleString()}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-[#718078]">No transactions recorded.</p>
                  )}
                </div>
              </details>
            </article>
          )
        })}
      </div>
      {installments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[#173b32] text-xl font-bold mb-3">Installment plans</h2>
          <div className="overflow-x-auto rounded-xl border border-[#e2e6df] bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[#f7faf5] text-[#718078] text-xs uppercase"><tr><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Next due</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
              {installments.map((plan) => <tr key={plan.id} data-keyboard-row tabIndex={0}><td className="p-3 font-semibold">{plan.customer}</td><td className="p-3">Rs. {Number(plan.totalAmount).toLocaleString()}</td><td className="p-3">Rs. {Number(plan.paidAmount).toLocaleString()}</td><td className="p-3">{plan.schedule?.find((entry) => entry.status !== 'paid')?.dueDate || '—'}</td><td className="p-3">{plan.status}</td><td className="p-3 text-right">{plan.status !== 'completed' && <button type="button" data-keyboard-primary onClick={() => receiveInstallment(plan)} className="px-3 py-1.5 rounded-lg bg-[#155b4b] text-white text-xs font-semibold">Receive payment</button>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
