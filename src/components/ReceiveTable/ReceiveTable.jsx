export default function ReceiveTable({ deliveries = [], onSelect }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
      <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
        <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
          <tr>
            <th className="px-4 sm:px-6 py-3.5">Batch Number</th>
            <th className="px-4 sm:px-6 py-3.5">Supplier</th>
            <th className="px-4 sm:px-6 py-3.5">Date</th>
            <th className="px-4 sm:px-6 py-3.5">Delivery</th>
            <th className="px-4 sm:px-6 py-3.5">Total</th>
            <th className="px-4 sm:px-6 py-3.5">Paid</th>
            <th className="px-4 sm:px-6 py-3.5 text-right">Bill</th>
          </tr>
        </thead>
        <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
          {deliveries.length ? (
            deliveries.map((delivery) => (
              <tr key={delivery[0]} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                <td className="px-4 sm:px-6 py-4 font-bold text-[#173b32]">{delivery[0]}</td>
                <td className="px-4 sm:px-6 py-4 font-medium">{delivery[1]}</td>
                <td className="px-4 sm:px-6 py-4 text-[#718078]">{delivery[2]}</td>
                <td className="px-4 sm:px-6 py-4">{delivery[3]}</td>
                <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">{delivery[4]}</td>
                <td className="px-4 sm:px-6 py-4 text-[#155b4b] font-medium">{delivery[5]}</td>
                <td className="px-4 sm:px-6 py-4 text-right"><button type="button" data-keyboard-primary className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] text-[#173b32] font-semibold" onClick={() => onSelect?.(delivery[6])}>Details</button></td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                No stock deliveries recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
