import { useState } from 'react'
import FormDialog from '../../components/FormDialog/FormDialog.jsx'
import { calculateAccountLedger } from '../../data/businessLogic.js'
import ReceivingDetails from '../../components/ReceivingDetails/ReceivingDetails.jsx'
import { receivingLabel } from '../../data/receiving.js'

export default function Suppliers({ suppliers = [], products = [], purchases = [], payments = [], returns = [], claims = [], cheques = [], onCreate, onUpdate, onPayment, onStatement }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const due = suppliers.reduce((sum, supplier) => sum + Math.max(0, Number(supplier.balance || 0)), 0)
  const filtered = suppliers.filter((supplier) => `${supplier.name} ${supplier.supplierCode || ''} ${supplier.city || ''} ${supplier.phone || ''}`.toLowerCase().includes(query.toLowerCase()))
  const pay = (supplier) => {
    const amount = Number(window.prompt(`Cash paid to ${supplier.name} (Rs.)`, ''))
    if (Number.isFinite(amount) && amount > 0) onPayment?.({ accountId: supplier.id, amount, method: 'cash' })
  }
  const ledgerFor = (supplier) => calculateAccountLedger({ suppliers, purchases, payments, supplierReturns: returns, claims }, 'supplier', supplier.id).entries

  const stats = [
    ['Total suppliers', suppliers.length],
    ['Amount to pay', `Rs. ${due.toLocaleString()}`],
    ['Advance balances', `Rs. ${suppliers.reduce((sum, s) => sum + Math.max(0, -Number(s.balance || 0)), 0).toLocaleString()}`],
    ['Transactions', purchases.length + payments.length + returns.length],
  ]

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Suppliers
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Purchases, payments and stock — supplier by supplier.
          </p>
        </div>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={() => setAdding(true)}
        >
          + New supplier
        </button>
      </div>

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
          className="w-full sm:max-w-md h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 shadow-xs"
          type="search"
          placeholder="Search by name..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div data-keyboard-list className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filtered.map((supplier) => {
          const balance = Number(supplier.balance || 0)
          const ledger = ledgerFor(supplier)
          const supplierProducts = products.filter((product) => product.supplierId === supplier.id)
          const supplierPurchases = purchases.filter((purchase) => purchase.supplierId === supplier.id)
          const supplierCheques = cheques.filter((cheque) => cheque.partyId === supplier.id)
          const initials = supplier.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

          return (
            <article data-keyboard-row tabIndex={0} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-4" key={supplier.id}>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-[#f1ebdd] text-[#173b32] grid place-items-center font-bold text-sm select-none">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <strong className="block text-[#173b32] text-base sm:text-lg font-bold truncate">{supplier.name}</strong>
                  <small className="text-[#155b4b] text-xs font-semibold">Code: {supplier.supplierCode || '—'}</small>
                  <small className="text-[#718078] text-xs truncate block">
                    {[supplier.city, supplier.phone].filter(Boolean).join(' · ') || 'Contact details not provided'}
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
                    {balance < 0 ? 'Advance paid' : balance ? 'To pay · Dena hai' : 'Settled'}
                  </span>
                </div>
              </div>

              {balance > 0 && (
                <button
                  type="button"
                  className="w-full h-10 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                  onClick={() => pay(supplier)}
                >
                  Record cash payment
                </button>
              )}

              <details>
                <summary className="text-xs sm:text-sm font-semibold text-[#173b32] cursor-pointer select-none">
                  Stock batches ({supplierProducts.length}) · cheques ({supplierCheques.filter((cheque) => cheque.status === 'Pending').length} pending / {supplierCheques.filter((cheque) => cheque.status === 'Cleared').length} cleared)
                </summary>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto text-xs">
                  {supplierProducts.length ? supplierProducts.map((product) => <div key={product.id} className="py-2 border-b border-[#edf0eb] flex justify-between gap-3">
                    <span>{product.name} · {product.batchNumber || 'No batch'} · {product.rackLocation || 'No rack'}</span>
                    <strong className="whitespace-nowrap">{Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0)} available</strong>
                  </div>) : <p className="text-[#718078]">No stock batches linked.</p>}
                </div>
              </details>

              <details>
                <summary className="text-xs sm:text-sm font-semibold text-[#173b32] cursor-pointer">Receive Stock history ({supplierPurchases.length})</summary>
                <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                  {supplierPurchases.map((purchase) => <details key={purchase.id} className="rounded-xl border border-[#edf0eb] p-3">
                    <summary className="text-xs font-semibold text-[#173b32] cursor-pointer">{receivingLabel(purchase)} · {purchase.date} · {purchase.items?.length || 0} products · Rs. {Number(purchase.total || 0).toLocaleString()}</summary>
                    <div className="mt-3"><ReceivingDetails purchase={purchase} supplier={supplier} /></div>
                  </details>)}
                  {!supplierPurchases.length && <p className="text-xs text-[#718078]">No receiving bills linked.</p>}
                </div>
              </details>

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
                          {entry.direction === 'credit' ? '−' : '+'} Rs. {Number(entry.amount || 0).toLocaleString()}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-[#718078]">No transactions recorded.</p>
                  )}
                </div>
              </details>
              <button type="button" onClick={() => onStatement?.(supplier.id)} className="w-full h-9 rounded-lg border border-[#dfe4dc] text-xs font-semibold text-[#173b32]">View / print statement</button>
              <button type="button" data-keyboard-primary onClick={() => setEditing(supplier)} className="w-full h-9 rounded-lg border border-[#dfe4dc] text-xs font-semibold text-[#173b32]">Edit supplier</button>
            </article>
          )
        })}
      </div>

      {adding && (
        <FormDialog
          title="New supplier"
          fields={[
            { name: 'name', label: 'Supplier name' },
            { name: 'supplierCode', label: 'Supplier code' },
            { name: 'phone', label: 'Phone', required: false },
            { name: 'city', label: 'City', required: false },
            { name: 'openingBalance', label: 'Opening balance', type: 'number', defaultValue: '0' },
          ]}
          onClose={() => setAdding(false)}
          onSave={async (data) => {
            const created = await onCreate?.(data)
            if (!created) return null
            setAdding(false)
            return created
          }}
        />
      )}
      {editing && <FormDialog title="Edit supplier" fields={[{ name: 'name', label: 'Supplier name', defaultValue: editing.name }, { name: 'supplierCode', label: 'Supplier code', defaultValue: editing.supplierCode }, { name: 'phone', label: 'Phone', required: false, defaultValue: editing.phone }, { name: 'city', label: 'City', required: false, defaultValue: editing.city }]} onClose={() => setEditing(null)} onSave={async (data) => { const saved = await onUpdate?.(editing.id, data); if (!saved) return null; setEditing(null); return saved }} />}
    </main>
  )
}
