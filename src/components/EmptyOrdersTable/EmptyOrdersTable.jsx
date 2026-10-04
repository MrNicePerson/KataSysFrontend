export default function EmptyOrdersTable({ bills = [], customers = [], onResume, onDiscard, onDeliver, onComplete }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
      <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
        <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
          <tr>
            <th className="px-4 sm:px-6 py-3.5">Order</th>
            <th className="px-4 sm:px-6 py-3.5">Customer</th>
            <th className="px-4 sm:px-6 py-3.5">Date</th>
            <th className="px-4 sm:px-6 py-3.5">Items</th>
            <th className="px-4 sm:px-6 py-3.5">Total</th>
            <th className="px-4 sm:px-6 py-3.5">Status</th>
            <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
          {bills.length ? (
            bills.map((bill, index) => (
              <tr key={bill.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                <th scope="row" className="px-4 sm:px-6 py-4 font-bold text-[#173b32]">
                  DRAFT-{index + 1}
                </th>
                <td className="px-4 sm:px-6 py-4 font-medium">{customers.find((customer) => customer.id === bill.customerId)?.name || bill.customer || 'Walk-in customer'}</td>
                <td className="px-4 sm:px-6 py-4 text-[#718078]">{bill.date || 'Today'}</td>
                <td className="px-4 sm:px-6 py-4">{bill.items?.length || 0}</td>
                <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">
                  Rs. {Number(bill.total || 0).toLocaleString()}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    {bill.kind || 'held'} · {bill.status || 'held'}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      data-keyboard-primary
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
                      onClick={() => onResume(bill)}
                    >
                      Resume
                    </button>
                    <button type="button" className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-[#173b32] text-xs font-semibold cursor-pointer" onClick={() => onDeliver(bill)}>
                      Partial delivery
                    </button>
                    <button type="button" className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-[#173b32] text-xs font-semibold cursor-pointer" onClick={() => onComplete(bill)}>
                      Complete
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer active:scale-95"
                      onClick={() => onDiscard(bill.id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-4 sm:px-6 py-12 text-center text-[#718078]">
                Nothing here yet. Held orders and drafts will appear here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
