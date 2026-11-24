import { useState } from 'react'
import { Printer } from 'lucide-react'
import { receivingLabel } from '../../data/receiving.js'

export default function SupplierReturns({ suppliers = [], products = [], purchases = [], returns = [], onSubmit }) {
  const [supplierId, setSupplierId] = useState('')
  const [selectedLineKey, setSelectedLineKey] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [returnBill, setReturnBill] = useState(null)

  const supplier = suppliers.find((entry) => entry.id === supplierId)
  const supplierPurchases = purchases.filter((entry) => entry.supplierId === supplierId || String(entry.supplier || '').trim().toLowerCase() === String(supplier?.name || '').trim().toLowerCase())
  const supplierLines = supplierPurchases.flatMap((purchaseEntry) => (purchaseEntry.items || []).map((item, index) => ({ purchase: purchaseEntry, item, key: `${purchaseEntry.id}:${item.lineId || item.productId || item.code || index}` })))
  const selectedLine = supplierLines.find((entry) => entry.key === selectedLineKey)
  const purchase = selectedLine?.purchase
  const purchaseId = purchase?.id || ''
  const selectedItem = selectedLine?.item
  const selectedProduct = products.find((entry) => entry.id === selectedItem?.productId)
  const priorReturns = returns.filter((entry) => entry.purchaseId === purchaseId && (entry.purchaseItemId ? entry.purchaseItemId === selectedItem?.lineId : entry.productId === selectedItem?.productId))
    .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
  const receivedRemaining = Math.max(0, Number(selectedItem?.quantity || 0) - priorReturns)
  const stockAvailable = Math.max(0, Number(selectedProduct?.stockQuantity || 0) - Number(selectedProduct?.reservedQuantity || 0))
  const returnLimit = selectedItem ? Math.min(receivedRemaining, stockAvailable) : 0

  const submit = async (event) => {
    event.preventDefault()
    if (!selectedItem || Number(quantity) > returnLimit) {
      setMessage('Return quantity must be within the unreturned quantity currently available in stock.')
      return
    }
    try {
      const saved = await onSubmit({
        purchaseId,
        purchaseItemId: selectedItem.lineId,
        productId: selectedItem.productId,
        code: selectedItem.code,
        quantity: Number(quantity),
        reason,
      })
      if (!saved) return
      setReturnBill(saved)
      setMessage('Supplier return recorded. Stock and supplier khata have been updated.')
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
        Supplier return history
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Return received stock against its original purchase. The return reduces on hand stock and supplier due.
      </p>

      <form onSubmit={submit} className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4 mb-8">
        <h2 className="text-[#173b32] text-lg font-bold">Record a return to supplier</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Supplier
            <select required value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setSelectedLineKey('') }} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]">
              <option value="">Choose supplier</option>
              {suppliers.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            All items received from this supplier
            <select
              required
              value={selectedLineKey}
              onChange={(e) => setSelectedLineKey(e.target.value)}
              disabled={!supplierId}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
            >
              <option value="">{supplierId ? (supplierLines.length ? 'Choose an item' : 'No received items found for this supplier') : 'Choose supplier first'}</option>
              {supplierLines.map(({ purchase: purchaseEntry, item, key }) => (
                <option key={key} value={key}>
                  {item.productName || item.name || item.code} · {item.code || 'No code'} · {receivingLabel(purchaseEntry)} · {purchaseEntry.date} · {item.quantity} received · {Math.max(0, Number(item.quantity || 0) - returns.filter((entry) => entry.purchaseId === purchaseEntry.id && (entry.purchaseItemId ? entry.purchaseItemId === item.lineId : entry.productId === item.productId)).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0))} unreturned
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Quantity
            <input
              type="number"
              min="1"
              max={returnLimit || 1}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            />
            {selectedItem && <small className="self-end text-xs text-[#718078]">Available to return: {returnLimit} (received quantity less previous returns and reserved stock)</small>}
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
          disabled={!selectedItem || returnLimit < 1}
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
      {returnBill && <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"><div id="supplier-return-bill" className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } body * { visibility: hidden !important; } #supplier-return-bill, #supplier-return-bill * { visibility: visible !important; } #supplier-return-bill { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; } #supplier-return-bill .print-controls { display: none !important; } }`}</style>
        <div className="print-controls mb-4 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#155b4b] px-4 py-2 text-sm font-semibold text-white"><Printer size={16} /> Print return bill</button><button type="button" onClick={() => setReturnBill(null)} className="rounded-lg border px-4 py-2 text-sm">Close</button></div>
        <header className="border-b-2 border-[#173b32] pb-3 text-center"><h2 className="text-xl font-bold text-[#173b32]">SUPPLIER RETURN BILL</h2><p className="mt-1 text-xs text-[#718078]">Goods returned to supplier</p></header>
        <div className="my-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-[#718078]">Return bill no.</span><strong>{returnBill.returnNumber || returnBill.id}</strong></p><p><span className="block text-xs text-[#718078]">Date</span><strong>{returnBill.date}</strong></p><p><span className="block text-xs text-[#718078]">Supplier</span><strong>{suppliers.find((entry) => entry.id === returnBill.supplierId)?.name || 'Supplier'}</strong></p><p><span className="block text-xs text-[#718078]">Receiving batch</span><strong>{returnBill.batchNumber || '—'}</strong></p></div>
        <table className="w-full border-collapse text-left text-sm"><thead><tr className="bg-[#f7faf5]"><th className="border p-2">Item / article</th><th className="border p-2">Quantity</th><th className="border p-2">Cost per unit</th><th className="border p-2">Return amount</th></tr></thead><tbody><tr><td className="border p-2">{returnBill.itemName}{returnBill.code ? ` · ${returnBill.code}` : ''}</td><td className="border p-2">{returnBill.quantity}</td><td className="border p-2">Rs. {Number(returnBill.quantity ? returnBill.amount / returnBill.quantity : 0).toLocaleString()}</td><td className="border p-2">Rs. {Number(returnBill.amount || 0).toLocaleString()}</td></tr></tbody></table>
        <p className="mt-4 text-sm"><strong>Reason:</strong> {returnBill.reason || '—'}</p><p className="mt-3 text-right text-lg font-bold">Supplier khata credit: Rs. {Number(returnBill.amount || 0).toLocaleString()}</p><footer className="mt-16 grid grid-cols-2 gap-12 text-xs"><div className="border-t pt-2">Authorized signature</div><div className="border-t pt-2">Supplier signature</div></footer>
      </div></div>}
    </main>
  )
}
