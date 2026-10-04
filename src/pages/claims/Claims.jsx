import { useState } from 'react'
import FormDialog from '../../components/FormDialog/FormDialog.jsx'

export default function Claims({ claims = [], products = [], suppliers = [], onCreate, onStatusChange, onUpdateDetails }) {
  const [productId, setProductId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [editingClaim, setEditingClaim] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    try {
      const created = await onCreate({ productId, supplierId, quantity: Number(quantity), description })
      if (!created) return
      setDescription('')
      setError('')
    } catch (issue) {
      setError(issue.message)
    }
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Defects &amp; claims
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Record defects and track supplier claims through resolution.
      </p>

      <form onSubmit={submit} className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4 mb-8">
        <h2 className="text-[#173b32] text-lg font-bold">Record a new defect claim</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Product
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            >
              <option value="">Choose product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Supplier
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            >
              <option value="">Choose supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Quantity
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            Reason / defect detail
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Torn fabric, print defect"
              className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-98"
        >
          Record claim
        </button>
        {error && <p className="text-red-600 text-xs sm:text-sm" role="alert">{error}</p>}
      </form>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Product</th>
              <th className="px-4 sm:px-6 py-3.5">Supplier</th>
              <th className="px-4 sm:px-6 py-3.5">Qty</th>
              <th className="px-4 sm:px-6 py-3.5">Reason</th>
              <th className="px-4 sm:px-6 py-3.5">Dispatch / physical / financial</th>
              <th className="px-4 sm:px-6 py-3.5">Status</th>
              <th className="px-4 sm:px-6 py-3.5 text-right">Update</th>
            </tr>
          </thead>
          <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
            {claims.length ? (
              claims.map((claim) => (
                <tr key={claim.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7]">
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{claim.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">
                    {products.find((p) => p.id === claim.productId)?.name || '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-medium">
                    {suppliers.find((s) => s.id === claim.supplierId)?.name || '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-bold">{claim.quantity}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{claim.description}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{claim.dispatchDate || 'Not dispatched'} · {claim.dispatchReference || 'No reference'}<small className="block">Credit: {claim.expectedCreditDate || 'Not set'}</small><small className="block">Physical: {claim.physicalStatus || 'quarantine'} · Financial: {claim.financialStatus || 'pending'}</small></td>
                  <td className="px-4 sm:px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        claim.status === 'Approved'
                          ? 'bg-[#e8f2e3] text-[#557250]'
                          : claim.status === 'Rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    {claim.status === 'Pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs font-semibold cursor-pointer"
                          onClick={() => onStatusChange(claim.id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                          onClick={() => onStatusChange(claim.id, 'Rejected')}
                        >
                          Reject
                        </button>
                        <button type="button" className="px-2.5 py-1 rounded-lg border border-[#dfe4dc] text-[#173b32] text-xs font-semibold" onClick={() => onStatusChange(claim.id, 'Replacement')}>
                          Replacement
                        </button>
                        <button type="button" data-keyboard-primary className="px-2.5 py-1 rounded-lg border border-[#dfe4dc] text-[#173b32] text-xs font-semibold" onClick={() => setEditingClaim(claim)}>
                          Dispatch details
                        </button>
                      </div>
                    )}
                    {claim.status !== 'Pending' && <button type="button" data-keyboard-primary className="px-2.5 py-1 rounded-lg border border-[#dfe4dc] text-[#173b32] text-xs font-semibold" onClick={() => setEditingClaim(claim)}>Details</button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  No claims recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editingClaim && <FormDialog title="Claim dispatch and credit" fields={[
        { name: 'dispatchDate', label: 'Dispatch date', type: 'date', defaultValue: editingClaim.dispatchDate || '' },
        { name: 'dispatchReference', label: 'Dispatch reference', defaultValue: editingClaim.dispatchReference || '', required: false },
        { name: 'expectedCreditDate', label: 'Expected credit date', type: 'date', defaultValue: editingClaim.expectedCreditDate || '' },
        { name: 'physicalStatus', label: 'Physical status', options: [
          { value: 'quarantine', label: 'Quarantine' },
          { value: 'dispatched', label: 'Dispatched' },
          { value: 'replaced', label: 'Replacement received' },
          { value: 'rejected', label: 'Rejected' },
        ], defaultValue: editingClaim.physicalStatus || 'quarantine' },
        { name: 'financialStatus', label: 'Financial status', options: [
          { value: 'pending', label: 'Pending' },
          { value: 'credit expected', label: 'Credit expected' },
          { value: 'credited', label: 'Credited' },
          { value: 'replacement', label: 'Replacement' },
          { value: 'rejected', label: 'Rejected' },
        ], defaultValue: editingClaim.financialStatus || 'pending' },
        { name: 'note', label: 'Note', defaultValue: editingClaim.note || '', required: false },
      ]} onClose={() => setEditingClaim(null)} onSave={async (details) => {
        const saved = await onUpdateDetails?.(editingClaim.id, details)
        if (saved) setEditingClaim(null)
        return saved
      }} />}
    </main>
  )
}
