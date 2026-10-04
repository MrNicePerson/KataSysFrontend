import { useEffect } from 'react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function BillReceipt({ bill, onClose, modal = false }) {
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: modal })
  useEffect(() => { keyboard.ref.current?.querySelector('[aria-label="Close receipt"]')?.focus() }, [])
  if (!bill) return null

  const customer = bill.customerDetails ?? {
    name: bill.customer || 'Walk-in customer',
    phone: bill.customerPhone,
    address: bill.customerAddress,
    city: bill.customerCity,
  }
  const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`

  const subtotal = bill.subtotal ?? bill.items?.reduce((sum, item) => sum + item.quantity * item.price, 0) ?? bill.total ?? 0
  const discount = Number(bill.discount || 0)
  const total = Number(bill.total ?? (subtotal - discount))
  const cash = Number(bill.payments?.cash ?? bill.paid ?? 0)
  const bank = Number(bill.payments?.bank ?? 0)
  const cheque = Number(bill.payments?.cheque ?? 0)
  const due = Number(bill.due ?? Math.max(0, total - cash - bank))

  const paymentDueDate = bill.paymentDue || bill.paymentDueDate || ''

  return (
    <main ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} id="thermal-receipt" className="thermal-receipt w-full max-w-[80mm] mx-auto p-4 sm:p-6 bg-white rounded-2xl border border-[#e2e6df] shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <style>{`@page { size: 80mm auto; margin: 3mm; } @media print { body * { visibility: hidden !important; } #thermal-receipt, #thermal-receipt * { visibility: visible !important; } #thermal-receipt { position: absolute; inset: 0; width: 74mm; max-width: 74mm; margin: 0; color: #000; } .receipt-controls { display: none !important; } }`}</style>
      <div className="receipt-controls flex items-center justify-between pb-3 mb-4 border-b border-[#edf0eb]">
        <h1 className="text-[#173b32] text-xl font-bold">Bill receipt</h1>
        <button
          className="w-8 h-8 grid place-items-center rounded-lg text-xl text-[#718078] hover:bg-[#f6f8f1] hover:text-[#173b32] cursor-pointer"
          type="button"
          aria-label="Close receipt"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <article className="p-4 sm:p-6 rounded-xl bg-[#fafbf8] border border-[#e8ece3] text-[#12332d]">
        <div className="text-xs text-[#718078] space-y-0.5 mb-4 pb-3 border-b border-[#e8ece3]">
          <div>Pad invoice: {bill.padInvoiceNumber || bill.paidInvoiceNumber || '—'}</div>
          <div>Phone: {customer.phone || '—'}</div>
          <div>Address: {[customer.address, customer.city].filter(Boolean).join(', ') || '—'}</div>
        </div>

        <header className="text-center mb-4">
          <h2 className="text-[#155b4b] text-xl sm:text-2xl font-bold tracking-tight">{bill.receiptShopName || 'Kapra Khata'}</h2>
          <p className="text-xs text-[#718078] font-medium">Wholesale clothing · Sales receipt</p>
        </header>

        <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-[#173b32] mb-2">
          <strong>{bill.number}</strong>
          <time className="text-[#718078] font-normal">{bill.date}</time>
        </div>
        <p className="text-xs sm:text-sm text-[#173b32] font-medium mb-3">
          Customer: <span className="font-bold">{customer.name || bill.customer}</span>
        </p>

        <div className="overflow-x-auto my-3">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#dfe4dc] text-[#718078] font-semibold">
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0eb]">
              {bill.items?.length ? (
                bill.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="py-2">
                      <div className="font-semibold text-[#12332d]">{item.name}</div>
                      {(item.shade || item.colour || item.color || item.variant || item.description) && (
                        <div className="text-[11px] text-[#718078]">
                          {item.shade || item.colour || item.color || item.variant || item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center font-medium">{item.quantity}</td>
                    <td className="py-2 text-right">{money(Math.abs(item.price))}</td>
                    <td className="py-2 text-right font-semibold">{money(item.quantity * item.price)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 font-medium">{bill.customer} purchase</td>
                  <td className="py-2 text-center">1</td>
                  <td className="py-2 text-right">{money(total)}</td>
                  <td className="py-2 text-right font-semibold">{money(total)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="my-3 border-t-2 border-dashed border-[#dfe4dc]" />

        <div className="space-y-1.5 text-xs sm:text-sm pt-1">
          {discount > 0 && (
            <p className="text-right text-[#718078]">
              Discount: <span className="font-semibold text-[#173b32]">{money(discount)}</span>
            </p>
          )}

          <p className="text-right text-base sm:text-lg font-bold text-[#155b4b]">
            Total: {money(total)}
          </p>

          <p className="text-right text-[#718078] text-xs">
            Cash / bank: <span className="font-medium text-[#155b4b]">{money(cash + bank)}</span> · Due at sale:{' '}
            <span className="font-medium text-red-700">{money(due)}</span>
          </p>

          {cheque > 0 && <p className="text-right text-[#718078] text-xs">Pending cheque: <span className="font-medium text-[#173b32]">{money(cheque)}</span></p>}
          {paymentDueDate && <p className="text-right text-[#718078] text-xs">Payment due: <span className="font-medium text-[#173b32]">{paymentDueDate}</span></p>}
        </div>

        <p className="text-center text-xs text-[#718078] italic mt-5 pt-3 border-t border-[#edf0eb]">
          {bill.receiptFooter || 'Shukriya! Apna bill sambhal kar rakhein.'}
        </p>
      </article>

      <div className="receipt-controls flex items-center justify-end gap-3 mt-4 pt-3 border-t border-[#edf0eb]">
        <button
          type="button"
          className="px-4 py-2 rounded-xl border border-[#dfe4dc] text-xs sm:text-sm font-semibold text-[#12332d] hover:bg-[#f6f8f1] cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-xs sm:text-sm font-semibold text-white shadow-xs cursor-pointer"
          onClick={() => window.print()}
        >
          Print receipt
        </button>
      </div>
    </main>
  )
}
