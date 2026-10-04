import { useState } from 'react'
import BillsTable from '../../components/BillsTable/BillsTable.jsx'
import BillReceipt from '../bill-receipt/BillReceipt.jsx'
import FormDialog from '../../components/FormDialog/FormDialog.jsx'

export default function BillsReceipts({ bills = [], onNewSale, onReturn, onViewInvoice, onUpdateReceipt, onUpdateBill }) {
  const [query, setQuery] = useState('')
  const [viewingBill, setViewingBill] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [editingLines, setEditingLines] = useState(null)

  const filteredBills = bills.filter((bill) =>
    `${bill.number} ${bill.customer} ${bill.customerPhone || ''} ${(bill.items || []).map((item) => `${item.code || ''} ${item.name || ''}`).join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Bills &amp; receipts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Find a bill, reprint it, or process a return.
          </p>
        </div>

        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={onNewSale}
        >
          + New sale
        </button>
      </div>

      <div className="mb-6">
        <input
          className="w-full max-w-md h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 shadow-xs"
          type="search"
          placeholder="Search bill number or customer..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <BillsTable
        bills={filteredBills}
        onReturn={onReturn}
        onViewBill={onViewInvoice || ((bill) => setViewingBill(bill))}
        onEditBill={onUpdateReceipt ? setEditingBill : undefined}
        onEditLines={onUpdateBill ? setEditingLines : undefined}
      />

      {editingLines && <FormDialog
        title={`Edit bill · ${editingLines.number}`}
        fields={[
          ...(editingLines.items || []).map((item) => [
            { name: `quantity-${item.lineId}`, label: `${item.name} · quantity`, type: 'number', min: '1', step: '1', defaultValue: String(item.quantity) },
            { name: `price-${item.lineId}`, label: `${item.name} · rate per suit`, type: 'number', min: '0', step: '0.01', defaultValue: String(item.unitPrice ?? item.price) },
          ]).flat(),
          { name: 'discount', label: 'Discount', type: 'number', min: '0', step: '0.01', defaultValue: String(editingLines.discount || 0) },
        ]}
        onClose={() => setEditingLines(null)}
        onSave={async (values) => {
          const saved = await onUpdateBill(editingLines.id, {
            items: editingLines.items.map((item) => ({ lineId: item.lineId, quantity: values[`quantity-${item.lineId}`], price: values[`price-${item.lineId}`] })),
            discount: values.discount,
          })
          if (saved) setEditingLines(null)
          return saved
        }}
      />}

      {editingBill && <FormDialog
        title={`Edit receipt details · ${editingBill.number}`}
        fields={[
          { name: 'padInvoiceNumber', label: 'Pad invoice number', defaultValue: editingBill.padInvoiceNumber || '', required: false },
          { name: 'customerPhone', label: 'Customer phone on receipt', defaultValue: editingBill.customerPhone || '', required: false },
          { name: 'customerAddress', label: 'Customer address on receipt', defaultValue: editingBill.customerAddress || '', required: false },
          { name: 'paymentDue', label: 'Payment due date', type: 'date', defaultValue: editingBill.paymentDue || '', required: false },
        ]}
        onClose={() => setEditingBill(null)}
        onSave={async (details) => {
          const saved = await onUpdateReceipt(editingBill.id, details)
          if (saved) setEditingBill(null)
          return saved
        }}
      />}

      {/* Bill Receipt Preview Modal */}
      {viewingBill && (
        <div
          className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setViewingBill(null)}
        >
          <div
            className="w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Receipt ${viewingBill.number}`}
          >
            <BillReceipt bill={viewingBill} modal onClose={() => setViewingBill(null)} />
          </div>
        </div>
      )}
    </main>
  )
}
