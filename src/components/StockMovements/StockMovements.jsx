import { receivingLabel } from '../../data/receiving.js'

export default function StockMovements({ movements = [], products = [], purchases = [], supplierReturns = [] }) {
  const movementLabel = (entry) => {
    if (entry.type === 'purchase') return receivingLabel(purchases.find((purchase) => purchase.id === entry.referenceId)) || entry.note || entry.referenceId
    if (entry.type === 'supplier-return') {
      const returned = supplierReturns.find((row) => row.id === entry.referenceId)
      const batch = returned?.batchNumber || receivingLabel(purchases.find((purchase) => purchase.id === returned?.purchaseId))
      if (batch) return `${batch}${returned?.reason ? ` · ${returned.reason}` : ''}`
    }
    return entry.note || entry.referenceId
  }
  return (
    <section className="mt-8">
      <h2 className="text-[#173b32] text-xl font-bold mb-4">Stock movements</h2>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Product</th>
              <th className="px-4 sm:px-6 py-3.5">Movement</th>
              <th className="px-4 sm:px-6 py-3.5">Quantity change</th>
              <th className="px-4 sm:px-6 py-3.5">Batch / Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">
            {movements.length ? (
              movements.slice(0, 100).map((entry) => (
                <tr key={entry.id} className="hover:bg-[#f8faf7]">
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">
                    {products.find((product) => product.id === entry.productId)?.name || 'Removed product'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-medium text-[#12332d]">{entry.type}</td>
                  <td className="px-4 sm:px-6 py-4 font-bold text-[#155b4b]">
                    {entry.quantity > 0 ? '+' : ''}
                    {entry.quantity}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{movementLabel(entry)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
