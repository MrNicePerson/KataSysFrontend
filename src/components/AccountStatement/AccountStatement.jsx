import { useEffect } from 'react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function AccountStatement({ statement, type, onClose }) {
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('button')?.focus()
    return () => opener?.isConnected && opener.focus?.()
  }, [])
  const account = type === 'supplier' ? statement.supplier : statement.customer
  const ledger = statement.ledger

  return (
    <div className="fixed inset-0 z-[60] bg-[#203832]/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:static print:block print:p-0">
      <style>{`@media print { body * { visibility: hidden !important; } #account-statement-print, #account-statement-print * { visibility: visible !important; } #account-statement-print { position: absolute; inset: 0; width: 100%; padding: 16mm; background: white; color: black; } .statement-controls { display: none !important; } }`}</style>
      <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-label={`${type === 'supplier' ? 'Supplier' : 'Customer'} account statement`} id="account-statement-print" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 bg-white rounded-xl border border-[#e2e6df] print:max-w-none print:max-h-none print:overflow-visible print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-[#e2e6df] pb-4">
          <div>
            <p className="text-xs uppercase font-bold text-[#718078]">KataSys · Account statement</p>
            <h1 className="mt-1 text-2xl font-bold text-[#173b32]">{account.name}</h1>
            {type === 'supplier' && <p className="mt-1 text-sm font-semibold text-[#155b4b]">Supplier code: {account.supplierCode || '—'}</p>}
            <p className="mt-1 text-sm text-[#718078]">{account.phone || 'No phone'} · {account.address || account.city || 'No address'}</p>
          </div>
          <div className="text-right text-sm">
            <span className="block text-[#718078]">{type === 'supplier' ? 'Payable / advance' : 'Due / advance'}</span>
            <strong className="text-lg text-[#173b32]">Rs. {Math.abs(Number(account.balance || 0)).toLocaleString()} {Number(account.balance || 0) < 0 ? 'advance' : ''}</strong>
          </div>
        </header>
        <p className="my-4 text-xs text-[#718078]">Printed {new Date().toLocaleString()}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[#dfe4dc] text-xs uppercase text-[#718078]"><tr><th className="py-2">Date</th><th className="py-2">Description</th><th className="py-2 text-right">Debit</th><th className="py-2 text-right">Credit</th></tr></thead>
            <tbody className="divide-y divide-[#edf0eb]">
              {ledger.entries.map((entry) => <tr key={entry.id}>
                <td className="py-2 pr-3 whitespace-nowrap">{entry.date || '—'}</td>
                <td className="py-2">{entry.title}</td>
                <td className="py-2 text-right">{entry.direction === 'debit' ? `Rs. ${Number(entry.amount).toLocaleString()}` : '—'}</td>
                <td className="py-2 text-right">{entry.direction === 'credit' ? `Rs. ${Number(entry.amount).toLocaleString()}` : '—'}</td>
              </tr>)}
              {!ledger.entries.length && <tr><td colSpan="4" className="py-8 text-center text-[#718078]">No account entries recorded.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="statement-controls mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-[#dfe4dc] text-sm font-semibold">Close</button>
          <button type="button" onClick={() => window.print()} className="h-10 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold">Print statement</button>
        </div>
      </section>
    </div>
  )
}
