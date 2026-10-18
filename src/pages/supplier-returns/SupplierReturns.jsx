import { useState } from 'react'
import { receivingLabel } from '../../data/receiving.js'

export default function SupplierReturns({ purchases = [], returns = [], onSubmit }) {
  const [purchaseId, setPurchaseId] = useState('')
  const [purchaseItemId, setPurchaseItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  const purchase = purchases.find((entry) => entry.id === purchaseId)
  const selectedItem = purchase?.items?.find((item) => item.lineId === purchaseItemId)

  const submit = async (event) => {
    event.preventDefault()
    try {
      const saved = await onSubmit({
        purchaseId,
        purchaseItemId,
        productId: selectedItem?.productId,
        quantity: Number(quantity),
        reason,
      })
      if (!saved) return
      setMessage('Supplier return recorded and stock/khata updated.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Supplier returns
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Return received stock against its original purchase. The return reduces on hand stock and supplier due.
      </p>

      <form onSubmit={submit} className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4 mb-8">
        <h2 className="text-[#173b32] text-lg font-bold">Record a return to supplier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Receiving Batch Number
            <select
              required
              value={purchaseId}
              onChange={(e) => {
                setPurchaseId(e.target.value)
                setPurchaseItemId('')
              }}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            >
              <option value="">Choose purchase</option>
              {purchases.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {receivingLabel(entry)} · {entry.supplier} · {entry.date}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Item
            <select
              required
              value={purchaseItemId}
              onChange={(e) => setPurchaseItemId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            >
              <option value="">Choose item</option>
              {purchase?.items?.map((item) => (
                <option key={item.lineId} value={item.lineId}>
                  {item.productName} · {item.code} · {item.quantity} received
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Quantity
            <input
              type="number"
              min="1"
              max={selectedItem?.quantity || 1}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Colour mismatch, damaged batch"
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            />
          </label>
        </div>

        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-98"
          disabled={!selectedItem}
        >
          Record supplier return
        </button>
      </form>

      {message && (
        <p className="p-3.5 rounded-xl bg-[#eaf3e7] text-[#155b4b] text-xs sm:text-sm font-medium mb-6" role="status">
          {message}
        </p>
      )}

      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Receiving Batch</th>
              <th className="px-4 sm:px-6 py-3.5">Item</th>
              <th className="px-4 sm:px-6 py-3.5">Qty</th>
              <th className="px-4 sm:px-6 py-3.5">Amount</th>
              <th className="px-4 sm:px-6 py-3.5">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">
            {returns.length ? (
              returns.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#f8faf7]">
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-bold text-[#173b32]">
                    {entry.batchNumber || receivingLabel(purchases.find((p) => p.id === entry.purchaseId)) || '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#12332d]">{entry.itemName}</td>
                  <td className="px-4 sm:px-6 py-4 font-bold">{entry.quantity}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#155b4b] font-bold">
                    Rs. {Number(entry.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.reason}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  No supplier returns recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
