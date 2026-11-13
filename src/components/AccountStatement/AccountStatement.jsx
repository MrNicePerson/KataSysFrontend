import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import BillReceipt from '../../pages/bill-receipt/BillReceipt.jsx'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
const displayDate = (value) => {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AccountStatement({ statement, type, products = [], onClose }) {
  const [viewingBill, setViewingBill] = useState(null)
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('button')?.focus()
    return () => opener?.isConnected && opener.focus?.()
  }, [])

  const account = type === 'supplier' ? statement.supplier : statement.customer
  const ledger = statement.ledger
  const salesById = new Map((type === 'customer' ? statement.sales || [] : []).map((sale) => [sale.id, sale]))
  const chronological = [...(ledger.entries || [])].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  let runningBalance = 0
  const rows = chronological.map((entry) => {
    runningBalance += entry.direction === 'debit' ? Number(entry.amount || 0) : entry.direction === 'credit' ? -Number(entry.amount || 0) : 0
    return { ...entry, runningBalance }
  }).reverse()
  const closingBalance = Number(account.balance ?? ledger.storedBalance ?? ledger.calculatedBalance ?? 0)
  const debitTotal = ledger.entries.reduce((sum, entry) => sum + (entry.direction === 'debit' ? Number(entry.amount || 0) : 0), 0)
  const creditTotal = ledger.entries.reduce((sum, entry) => sum + (entry.direction === 'credit' ? Number(entry.amount || 0) : 0), 0)
  const title = type === 'supplier' ? 'Supplier statement' : 'Customer statement'

  if (viewingBill) return (
    <div className="fixed inset-0 z-[60] bg-[#203832]/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:static print:block print:p-0">
      <BillReceipt bill={viewingBill} products={products} modal closeLabel="Back to statement" onClose={() => setViewingBill(null)} />
    </div>
  )

  return createPortal((
    <div id="account-statement-print-root">
      <style>{`@page { size: auto; margin: 12mm; } @media print { body > *:not(#account-statement-print-root) { display: none !important; } #account-statement-print-root { position: static !important; display: block !important; width: 100% !important; height: auto !important; max-height: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; } #account-statement-print-root, #account-statement-print-root * { visibility: visible !important; } #account-statement-print { position: static !important; inset: auto !important; display: block !important; width: 100% !important; max-width: none !important; max-height: none !important; margin: 0 !important; padding: 0 !important; background: white !important; color: #172d27 !important; box-shadow: none !important; overflow: visible !important; } .statement-controls, .statement-no-print { display: none !important; } }`}</style>
      <div className="fixed inset-0 z-[60] bg-[#173b32]/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:static print:block print:p-0">
      <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-label={`${type === 'supplier' ? 'Supplier' : 'Customer'} account statement`} id="account-statement-print" className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl bg-[#f7faf7] shadow-2xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[#e2e9e2] bg-white px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#155b4b] text-lg font-black text-white">AT</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#718078]">Abbas Textile Wholesale · Account ledger</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#173b32] sm:text-3xl">{account.name}</h1>
              <p className="mt-1 text-sm text-[#64756d]">{[account.phone, account.address || account.city].filter(Boolean).join(' · ') || 'No contact details provided'}</p>
              {type === 'supplier' && <p className="mt-1 text-xs font-semibold text-[#155b4b]">Supplier code: {account.supplierCode || '—'}</p>}
            </div>
          </div>
          <div className="statement-no-print flex items-center gap-2 rounded-full border border-[#dfe8de] bg-[#f7faf5] px-3 py-1.5 text-xs font-semibold text-[#52645c]">{title}</div>
        </header>

        <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#dfe8de] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718078]">{closingBalance < 0 ? 'Advance balance' : type === 'supplier' ? 'Payable balance' : 'Amount due'}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${closingBalance > 0 ? 'text-[#a33c35]' : 'text-[#155b4b]'}`}>{money(Math.abs(closingBalance))}</p>
              <p className="mt-1 text-xs text-[#718078]">{closingBalance < 0 ? 'Credit / advance' : closingBalance > 0 ? 'Outstanding' : 'Settled'}</p>
            </div>
            <div className="rounded-xl border border-[#dfe8de] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718078]">Total debit</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#173b32]">{money(debitTotal)}</p>
              <p className="mt-1 text-xs text-[#718078]">Charges and increases</p>
            </div>
            <div className="rounded-xl border border-[#dfe8de] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#718078]">Total credit</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#173b32]">{money(creditTotal)}</p>
              <p className="mt-1 text-xs text-[#718078]">Payments, returns and reductions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#718078]">
            <span>{rows.length} ledger {rows.length === 1 ? 'entry' : 'entries'}</span>
            <span>Printed {new Date().toLocaleString('en-PK')}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#dfe8de] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#edf4ed] text-[11px] uppercase tracking-wide text-[#5f7167]"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Entry / comment</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {rows.map((entry) => <tr key={entry.id} className="align-top hover:bg-[#fbfdfb]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-[#64756d]">{displayDate(entry.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#173b32]">{entry.title}</div>
                      {entry.reason && <p className="mt-1 max-w-xl whitespace-pre-wrap text-xs leading-relaxed text-[#718078]">Reason: {entry.reason}</p>}
                      {salesById.has(entry.id) && <button type="button" aria-label={`View bill ${salesById.get(entry.id).number || entry.title}`} onClick={() => setViewingBill(salesById.get(entry.id))} className="statement-controls mt-2 inline-flex min-h-8 items-center rounded-lg border border-[#dfe4dc] px-3 text-xs font-semibold text-[#155b4b] hover:bg-[#eaf3e7] focus-visible:outline-2 focus-visible:outline-[#155b4b]">View invoice</button>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#a33c35]">{entry.direction === 'debit' ? money(entry.amount) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-[#155b4b]">{entry.direction === 'credit' ? money(entry.amount) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#173b32]">{money(Math.abs(entry.runningBalance))}<span className="ml-1 text-[10px] font-medium text-[#718078]">{entry.runningBalance < 0 ? 'advance' : 'due'}</span></td>
                  </tr>)}
                  {!rows.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-sm text-[#718078]">No account entries recorded.</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe8de] bg-[#f7faf5] px-4 py-3 text-xs text-[#64756d]">
              <span>Closing balance</span>
              <strong className="text-sm text-[#173b32]">{closingBalance < 0 ? 'Advance' : 'Due'} · {money(Math.abs(closingBalance))}</strong>
            </footer>
          </div>

          <div className="statement-controls flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#dfe4dc] bg-white px-4 text-sm font-semibold text-[#173b32]">Close</button>
            <button type="button" onClick={() => window.print()} className="h-10 rounded-lg bg-[#155b4b] px-5 text-sm font-semibold text-white">Print statement</button>
          </div>
        </div>
      </section>
      </div>
    </div>
  ), document.body)
}
