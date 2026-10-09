import { useState } from 'react'
import BillReceipt from '../../pages/bill-receipt/BillReceipt.jsx'

export default function BillsTable({ bills = [], onReturn, onReviewBill }) {
  const [localViewingBill, setLocalViewingBill] = useState(null)

  const displayedBills = bills

  const handleView = (bill) => {
    if (onViewBill) {
      onViewBill(bill)
    } else {
      setLocalViewingBill(bill)
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm text-[#12332d] min-w-[700px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Bill</th>
              <th className="px-4 sm:px-6 py-3.5">Customer</th>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Total</th>
              <th className="px-4 sm:px-6 py-3.5">Paid</th>
              <th className="px-4 sm:px-6 py-3.5">Due at sale</th>
              <th className="px-4 sm:px-6 py-3.5 text-right" aria-label="Actions">Actions</th>
            </tr>
          </thead>
          <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
            {displayedBills.length ? (
              displayedBills.map((bill) => (
                <tr key={bill.number} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                  <th scope="row" className="px-4 sm:px-6 py-4 font-bold text-[#173b32] whitespace-nowrap">
                    {bill.number}
                  </th>
                  <td className="px-4 sm:px-6 py-4 font-medium">{bill.customer}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{bill.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">
                    Rs. {Number(bill.total || 0).toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-[#155b4b] font-medium">
                    Rs. {Number(bill.paid || 0).toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-red-700 font-medium">
                    Rs. {Number(bill.due || 0).toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        data-keyboard-primary
                        data-keyboard-review-edit
                        type="button"
                        className="px-3 py-1.5 rounded-lg border border-[#e2e6df] bg-white hover:bg-[#f6f8f1] text-[#173b32] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        onClick={() => onReviewBill ? onReviewBill(bill) : handleView(bill)}
                        title="Review and edit bill and receipt details"
                      >
                        Review and edit bill
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg border border-[#e2e6df] bg-white hover:bg-[#eaf3e7] hover:text-[#155b4b] text-[#718078] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        onClick={onReturn}
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-4 sm:px-6 py-10 text-center text-[#718078]">
                  No bills match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {localViewingBill && (
        <div
          className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setLocalViewingBill(null)}
        >
          <div
            className="w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Bill receipt"
          >
            <BillReceipt bill={localViewingBill} modal onClose={() => setLocalViewingBill(null)} />
          </div>
        </div>
      )}
    </>
  )
}
