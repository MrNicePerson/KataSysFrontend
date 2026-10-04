import { useEffect, useRef, useState } from 'react'
import FormDialog from '../FormDialog/FormDialog.jsx'
import ReceivingDetails from '../ReceivingDetails/ReceivingDetails.jsx'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function StockTable({ products = [], onAdjust, onUpdate }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [adjustingProduct, setAdjustingProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const detailsOpenerRef = useRef(null)
  const closeDetails = () => {
    setSelectedProduct(null)
    requestAnimationFrame(() => { if (detailsOpenerRef.current?.isConnected) detailsOpenerRef.current.focus() })
  }
  const detailsKeyboard = useKeyboardScope({ onEscape: closeDetails, trapFocus: true })

  useEffect(() => {
    if (selectedProduct) detailsKeyboard.ref.current?.querySelector('[aria-label="Close details"]')?.focus()
  }, [selectedProduct])

  const saveAdjustment = async ({ direction, quantity }) => {
    const saved = await onAdjust(adjustingProduct, direction, Number(quantity))
    if (saved) setAdjustingProduct(null)
    return saved
  }

  const saveProduct = async (values) => {
    const saved = await onUpdate(editingProduct.id, {
      ...values,
      salePrice: Number(values.salePrice),
      averageCost: Number(values.averageCost),
      active: values.active === 'true',
      labels: String(values.labels || '').split(',').map((label) => label.trim()).filter(Boolean),
    })
    if (saved) {
      setEditingProduct(null)
      closeDetails()
    }
    return saved
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[750px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Product</th>
              <th className="px-4 sm:px-6 py-3.5">Supplier / batch</th>
              <th className="px-4 sm:px-6 py-3.5">Location</th>
              <th className="px-4 sm:px-6 py-3.5">Available</th>
              <th className="px-4 sm:px-6 py-3.5">Reserved</th>
              <th className="px-4 sm:px-6 py-3.5">Cost / sale</th>
              <th className="px-4 sm:px-6 py-3.5 text-right" aria-label="Actions" />
            </tr>
          </thead>
          <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
            {products.map((product) => (
              <tr key={product.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#eaf3e7] text-[#155b4b] grid place-items-center font-bold text-sm">
                      ✧
                    </span>
                    <div>
                      <strong className="block font-bold text-[#173b32] text-sm sm:text-base">{product.name}</strong>
                      <small className="text-[#718078] text-xs font-medium">{product.colour}</small>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-medium text-[#12332d]">{product.supplier}</div>
                  <small className="text-[#718078] text-xs block">{product.batch || product.batchFull}</small>
                </td>
                <td className="px-4 sm:px-6 py-4 text-[#718078] font-medium">{product.location}</td>
                <td className="px-4 sm:px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md bg-[#e8f2e3] text-[#557250] font-bold text-xs">
                    {product.available}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-[#718078]">{product.reserved || '0'}</td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-semibold text-[#173b32]">{product.cost}</div>
                  <small className="text-[#155b4b] text-xs font-medium block">{product.sale}</small>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      data-keyboard-primary
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] bg-white hover:bg-[#f6f8f1] text-[#173b32] text-xs font-semibold cursor-pointer shadow-2xs"
                      onClick={(event) => { detailsOpenerRef.current = event.currentTarget; setSelectedProduct(product) }}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-[#dfe4dc] bg-white hover:bg-[#eaf3e7] hover:text-[#155b4b] text-[#718078] text-xs font-semibold cursor-pointer shadow-2xs"
                      onClick={() => setAdjustingProduct(product)}
                    >
                      Adjust
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={closeDetails}
        >
          <div
            ref={detailsKeyboard.ref}
            onKeyDown={detailsKeyboard.onKeyDown}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedProduct.name} details`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#edf0eb]">
              <h2 className="text-[#173b32] text-xl sm:text-2xl font-bold">{selectedProduct.name}</h2>
              <button
                type="button"
                className="w-8 h-8 grid place-items-center rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] cursor-pointer"
                onClick={closeDetails}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#f7faf5] border border-[#edf0eb] mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#155b4b] text-white grid place-items-center font-bold text-base">
                ✦
              </div>
              <div>
                <strong className="block text-sm sm:text-base font-bold text-[#173b32]">
                  {selectedProduct.code
                    ? `${selectedProduct.code} · ${selectedProduct.shade || selectedProduct.colour?.split('·')[0]?.trim()}`
                    : selectedProduct.colour}
                </strong>
                <span className="text-xs text-[#718078] font-medium">{selectedProduct.type || 'Unstitched'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Supplier</span>
                <strong className="text-[#173b32] font-semibold">{selectedProduct.supplier}</strong>
              </div>

              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Receiving Batch Number</span>
                <strong className="text-[#173b32] font-semibold">
                  {selectedProduct.batch || selectedProduct.batchFull?.split('·')[0]?.trim() || 'Not recorded'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Arrival date</span>
                <strong className="text-[#173b32] font-semibold">
                  {selectedProduct.receiving?.purchase.date || selectedProduct.arrivalDate || 'Not recorded'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Originally received</span>
                <strong className="text-[#173b32] font-semibold">
                  {selectedProduct.receiving ? `${selectedProduct.receiving.quantity} suits` : 'Not recorded'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Available</span>
                <strong className="text-[#155b4b] font-bold">{selectedProduct.available}</strong>
              </div>

              <div className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb]">
                <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">Reserved</span>
                <strong className="text-[#173b32] font-semibold">{selectedProduct.reserved || '0'}</strong>
              </div>
            </div>
            {selectedProduct.receiving && <div className="mt-5">
              <h3 className="text-[#173b32] font-bold mb-3">Original Receive Stock bill</h3>
              <ReceivingDetails purchase={selectedProduct.receiving.purchase} supplier={selectedProduct.supplierRecord} />
            </div>}
            <div className="flex justify-end mt-5">
              <button type="button" className="h-10 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold" onClick={() => setEditingProduct(selectedProduct)}>Edit product</button>
            </div>
          </div>
        </div>
      )}

      {adjustingProduct && (
        <FormDialog
          title={`Adjust ${adjustingProduct.name}`}
          fields={[
            {
              name: 'direction',
              label: 'Adjustment',
              options: [
                { value: 'add', label: 'Add stock' },
                { value: 'remove', label: 'Remove stock' },
              ],
            },
            { name: 'quantity', label: 'Quantity', type: 'number', min: '1' },
          ]}
          onClose={() => setAdjustingProduct(null)}
          onSave={saveAdjustment}
        />
      )}
      {editingProduct && <FormDialog title={`Edit ${editingProduct.name}`} fields={[
        { name: 'name', label: 'Product name', defaultValue: editingProduct.name },
        { name: 'code', label: 'Code / article', defaultValue: editingProduct.code || '' },
        { name: 'article', label: 'Article number', defaultValue: editingProduct.article || '', required: false },
        { name: 'rackLocation', label: 'Rack / location', defaultValue: editingProduct.rackLocation || '', required: false },
        { name: 'averageCost', label: 'Purchase cost', type: 'number', min: '0', step: '0.01', defaultValue: String(editingProduct.averageCost || 0) },
        { name: 'salePrice', label: 'Selling rate', type: 'number', min: '0', step: '0.01', defaultValue: String(editingProduct.salePrice || 0) },
        { name: 'labels', label: 'Labels (comma separated)', defaultValue: (editingProduct.labels || []).join(', '), required: false },
        { name: 'active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }], defaultValue: String(editingProduct.active !== false) },
      ]} onClose={() => setEditingProduct(null)} onSave={saveProduct} />}
    </>
  )
}
