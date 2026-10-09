import { useEffect, useRef, useState } from 'react'
import BillsTable from '../../components/BillsTable/BillsTable.jsx'
import BillReceipt from '../bill-receipt/BillReceipt.jsx'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

function ReviewEditBillDialog({ bill, products, onClose, onUpdateBill, onUpdateReceipt }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  const canEditItems = bill.items?.length > 0 && bill.items.every((item) => item.lineId && !item.isReturn)

  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('input:not([disabled])')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])

  const articleFor = (item) => {
    const product = products.find((entry) => entry.id === item.productId)
    return item.articleNumber || item.article || product?.articleNumber || product?.article || item.code || product?.code || '—'
  }
  const brandFor = (item) => {
    const product = products.find((entry) => entry.id === item.productId)
    return item.brandName || item.name || item.productName || product?.name || '—'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    try {
      if (canEditItems && onUpdateBill) {
        const savedBill = await onUpdateBill(bill.id, {
          items: bill.items.map((item) => ({ lineId: item.lineId, quantity: formData.get(`quantity-${item.lineId}`), price: formData.get(`price-${item.lineId}`) })),
          discount: Number(formData.get('discount') ?? bill.discount ?? 0),
        })
        if (!savedBill) return
      }
      if (onUpdateReceipt) {
        const savedReceipt = await onUpdateReceipt(bill.id, {
          padInvoiceNumber: String(formData.get('padInvoiceNumber') || '').trim(),
          customerPhone: String(formData.get('customerPhone') || '').trim(),
          customerAddress: String(formData.get('customerAddress') || '').trim(),
          paymentDue: String(formData.get('paymentDue') || '').trim(),
        })
        if (!savedReceipt) return
      }
      onClose()
    } catch (issue) {
      setError(issue.message || 'Could not save this bill.')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={keyboard.ref}
        onKeyDown={keyboard.onKeyDown}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#f7faf5] border border-[#e2e6df] shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={`Review and edit bill ${bill.number}`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-7 bg-white border-b border-[#e2e6df] rounded-t-2xl">
          <div>
            <p className="text-[11px] font-bold tracking-[2px] uppercase text-[#718078]">Bill review</p>
            <h2 className="text-[#173b32] text-lg sm:text-2xl font-bold">Review and edit bill · {bill.number}</h2>
            <p className="mt-1 text-xs sm:text-sm text-[#718078]">{bill.customer || 'Walk-in customer'} · {bill.date || ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 shrink-0 rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1]">×</button>
        </header>

        <form onSubmit={handleSubmit} className="p-4 sm:p-7 space-y-5">
          {error && <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">{error}</p>}

          <section aria-labelledby="review-bill-items" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="review-bill-items" className="text-[#173b32] text-lg sm:text-xl font-semibold">Bill items</h3>
              <span className="px-3 py-1 rounded-full bg-[#eaf3e7] text-[#456b4e] text-xs font-semibold">{bill.items?.length || 0} items</span>
            </div>
            {(bill.items || []).map((item, index) => (
              <article key={item.lineId || `${item.code}-${index}`} className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-black">Article: {articleFor(item)}</p>
                    <p className="mt-1 text-xs sm:text-sm text-[#173b32]">Brand Name: <span className="font-semibold">{brandFor(item)}</span></p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#f1f4ee] text-[#718078] text-xs font-semibold">Item {index + 1}</span>
                </div>
                {canEditItems && onUpdateBill ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                      Quantity
                      <input name={`quantity-${item.lineId}`} type="number" min="1" step="1" defaultValue={item.quantity} required className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
                    </label>
                    <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                      Price per suit
                      <input name={`price-${item.lineId}`} type="number" min="0" step="0.01" defaultValue={item.unitPrice ?? item.price} required className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-[#718078]">Quantity: {item.quantity} · Rate: Rs. {Number(item.unitPrice ?? item.price ?? 0).toLocaleString()}</p>
                )}
              </article>
            ))}
            {canEditItems && onUpdateBill && (
              <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                Discount (Rs.)
                <input name="discount" type="number" min="0" step="0.01" defaultValue={bill.discount || 0} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
              </label>
            )}
          </section>

          {onUpdateReceipt && (
            <section aria-labelledby="review-receipt-details" className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
              <h3 id="review-receipt-details" className="text-[#173b32] text-lg font-semibold">Receipt details</h3>
              <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                Pad invoice number
                <input name="padInvoiceNumber" defaultValue={bill.padInvoiceNumber || ''} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                  Customer phone
                  <input name="customerPhone" defaultValue={bill.customerPhone || ''} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
                </label>
                <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                  Payment due date
                  <input name="paymentDue" type="date" defaultValue={bill.paymentDue || ''} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-[#173b32] text-sm font-semibold">
                Customer address
                <input name="customerAddress" defaultValue={bill.customerAddress || ''} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm font-normal focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15" />
              </label>
            </section>
          )}

          {!canEditItems && <p className="text-xs text-[#718078]">This bill’s item lines are shown for review; only its receipt details can be edited.</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e6df]">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 px-4 rounded-xl border border-[#dfe4dc] bg-white text-sm font-semibold text-[#173b32] disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={saving} className="h-10 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function BillsReceipts({ bills = [], customers = [], products = [], onNewSale, onReturn, onViewInvoice, onUpdateReceipt, onUpdateBill }) {
  const [query, setQuery] = useState('')
  const [viewingBill, setViewingBill] = useState(null)
  const [reviewingBill, setReviewingBill] = useState(null)
  const newSaleRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    searchRef.current?.focus({ preventScroll: true })
    const handlePageNavigation = (event) => {
      if (!['PageDown', 'PageUp'].includes(event.key) || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target.closest?.('[aria-modal="true"]')) return
      event.preventDefault()
      event.stopPropagation()

      const reviewButtons = [...document.querySelectorAll('[data-keyboard-review-edit]')]
      const currentReviewIndex = reviewButtons.indexOf(document.activeElement)
      let target
      if (event.key === 'PageUp') {
        target = currentReviewIndex >= 0 ? searchRef.current : newSaleRef.current
      } else if (document.activeElement === newSaleRef.current) {
        target = searchRef.current
      } else if (document.activeElement === searchRef.current) {
        target = reviewButtons[0] || searchRef.current
      } else if (currentReviewIndex >= 0) {
        target = reviewButtons[currentReviewIndex + 1] || reviewButtons[currentReviewIndex]
      } else {
        target = searchRef.current
      }

      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    document.addEventListener('keydown', handlePageNavigation, true)
    return () => document.removeEventListener('keydown', handlePageNavigation, true)
  }, [])

  const customerName = (bill) => bill.customer?.trim()
    || bill.customerDetails?.name
    || customers.find((customer) => customer.id === bill.customerId)?.name
    || 'Walk-in customer'
  const filteredBills = bills
    .map((bill) => ({ ...bill, customer: customerName(bill) }))
    .filter((bill) =>
      `${bill.number} ${bill.customer} ${bill.customerPhone || ''} ${(bill.items || []).map((item) => `${item.code || ''} ${item.name || ''}`).join(' ')}`.toLowerCase().includes(query.toLowerCase()),
    )
  const handlePageMouseDown = (event) => {
    if (event.target.closest?.('input, textarea, select, button, a, [role="button"], [contenteditable="true"], [aria-modal="true"]')) return
    event.preventDefault()
    searchRef.current?.focus({ preventScroll: true })
  }

  return (
    <main onMouseDown={handlePageMouseDown} className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
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
          ref={newSaleRef}
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={onNewSale}
        >
          + New sale
        </button>
      </div>

      <div className="mb-6">
        <input
          ref={searchRef}
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
        onReviewBill={(bill) => {
          if (onUpdateReceipt || onUpdateBill) setReviewingBill(bill)
          else if (onViewInvoice) onViewInvoice(bill)
          else setViewingBill(bill)
        }}
      />

      {reviewingBill && <ReviewEditBillDialog
        bill={reviewingBill}
        products={products}
        onClose={() => setReviewingBill(null)}
        onUpdateBill={onUpdateBill}
        onUpdateReceipt={onUpdateReceipt}
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
