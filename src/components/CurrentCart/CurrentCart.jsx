import { ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function CurrentCart({ items, discount, onDiscountChange, onAddReturn, onRemoveItem, onUpdateItem, onSaveBill, onHoldBill, onClear, saving = false }) {
  const [returnItem, setReturnItem] = useState({ itemCode: '', quantity: 1, condition: 'Sellable stock' })
  const [returnError, setReturnError] = useState('')
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const total = Math.max(0, subtotal - discount)
  const saleItems = items.filter((item) => !item.isReturn && !item.returnQuantity)
  const returnItems = items.filter((item) => item.isReturn || item.returnQuantity)
  const itemCount = saleItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleChange = (field, value) => {
    setReturnItem((previous) => ({ ...previous, [field]: value }))
    if (returnError) setReturnError('')
  }
  const handleReturn = (event) => {
    event.preventDefault()
    const code = returnItem.itemCode.trim()
    const quantity = Number(returnItem.quantity)
    if (!code) {
      setReturnError('Please enter an item code.')
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setReturnError('Quantity must be at least 1.')
      return
    }
    const added = onAddReturn({ code, quantity, condition: returnItem.condition })
    if (added === false) return
    setReturnItem((previous) => ({ ...previous, itemCode: '', quantity: 1 }))
    setReturnError('')
  }

  return (
    <section className="p-4 sm:p-6 lg:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel hover:border-[#155b4b]/20 hover:shadow-panel-hover transition-all flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#edf0eb]">
        <h2 className="text-[#173b32] text-lg sm:text-xl lg:text-2xl font-semibold leading-tight">
          Current cart
        </h2>
        <span className="px-3 py-1 rounded-lg bg-[#e8f2e3] text-[#557250] text-xs sm:text-sm font-semibold whitespace-nowrap">
          {itemCount} suits
        </span>
      </div>

      {saleItems.length ? (
        <div data-keyboard-scope className="divide-y divide-[#edf0eb] my-3">
          {saleItems.map((item) => (
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm" key={item.id}>
              <div className="flex-1 min-w-0">
                <strong className="block text-[#12332d] font-semibold text-sm sm:text-base truncate">{item.name}</strong>
                <small className="text-[#718078] text-xs font-medium">{item.code ? `Code ${item.code}` : 'Wholesale item'}</small>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <label className="flex items-center gap-1.5 text-xs text-[#718078] font-semibold">
                  Qty
                  <input
                    type="number"
                    min="1"
                    className="w-14 h-8 px-1.5 text-center rounded-lg border border-[#dfe4dc] text-sm text-[#12332d] font-medium focus:outline-none focus:border-[#155b4b]"
                    value={item.quantity}
                    onChange={(event) => onUpdateItem(item.id, 'quantity', event.target.value)}
                    onBlur={() => {
                      if (!Number(item.quantity)) onUpdateItem(item.id, 'quantity', '1')
                    }}
                  />
                </label>

                <label className="flex items-center gap-1.5 text-xs text-[#718078] font-semibold">
                  Rate
                  <input
                    type="number"
                    min="0"
                    className="w-20 h-8 px-1.5 text-center rounded-lg border border-[#dfe4dc] text-sm text-[#12332d] font-medium focus:outline-none focus:border-[#155b4b]"
                    value={item.price}
                    onChange={(event) => onUpdateItem(item.id, 'price', event.target.value)}
                    onBlur={() => {
                      if (item.price === '') onUpdateItem(item.id, 'price', '0')
                    }}
                  />
                </label>

                <div className="text-right min-w-[70px]">
                  <strong className="block text-[#12332d] text-sm sm:text-base font-bold">
                    Rs. {((Number(item.quantity) || 0) * (Number(item.price) || 0)).toLocaleString()}
                  </strong>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  className="w-8 h-8 grid place-items-center rounded-lg border border-[#e2e6df] text-[#718078] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-[#7b857e] text-sm sm:text-base font-normal">
          Your added items will appear here.
        </p>
      )}

      {/* Return section */}
      <section className="mt-4 p-4 rounded-xl bg-[#f8faf4] border border-[#dfe4dc]" aria-labelledby="return-customer-heading">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 id="return-customer-heading" className="text-[#173b32] text-sm sm:text-base font-semibold leading-snug">
            Return item from this customer
          </h3>
          <span className="px-2.5 py-0.5 rounded-md bg-[#e8f2e3] text-[#557250] text-xs font-semibold whitespace-nowrap">
            {returnItems.length} {returnItems.length === 1 ? 'return' : 'returns'}
          </span>
        </div>
        <p className="text-xs text-[#6f7b74] mb-3">
          Make the bill first, then enter the item code. The original rate will be deducted.
        </p>

        <form className="space-y-3" onSubmit={handleReturn}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
              Item code
              <input
                name="returnCode"
                type="text"
                autoComplete="off"
                placeholder="Scan / type code"
                className="w-full h-10 px-3 rounded-lg border border-[#d9e0d9] bg-white text-xs sm:text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                value={returnItem.itemCode}
                onChange={(event) => handleChange('itemCode', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
              Quantity
              <input
                name="returnQuantity"
                type="number"
                min="1"
                step="1"
                className="w-full h-10 px-3 rounded-lg border border-[#d9e0d9] bg-white text-xs sm:text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                value={returnItem.quantity}
                onChange={(event) => handleChange('quantity', event.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
              Condition
              <div className="relative">
                <select
                  name="condition"
                  className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#d9e0d9] bg-white text-xs sm:text-sm text-[#173b32] appearance-none focus:outline-none focus:border-[#155b4b]"
                  value={returnItem.condition}
                  onChange={(event) => handleChange('condition', event.target.value)}
                >
                  <option>Sellable stock</option>
                  <option>Damaged</option>
                  <option>Defective</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718078] pointer-events-none" />
              </div>
            </label>

            <button
              className="w-full sm:w-auto h-10 px-4 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-98"
              type="submit"
            >
              Add return
            </button>
          </div>
        </form>

        {returnError && (
          <p className="mt-2 text-xs text-red-600 font-medium" role="alert">
            {returnError}
          </p>
        )}
      </section>

      {returnItems.length > 0 && (
        <ul className="mt-3 divide-y divide-[#edf0eb] border border-[#e5e9df] rounded-xl p-2 bg-white" aria-label="Added return items">
          {returnItems.map((item) => (
            <li className="py-2 px-1 flex items-center justify-between gap-2 text-xs sm:text-sm text-[#12332d]" key={item.id}>
              <div>
                <strong className="block font-semibold">{item.returnCode || item.name}</strong>
                <small className="text-[#718078]">
                  {item.quantity} {item.quantity === 1 ? 'item' : 'items'} · {item.returnCondition}
                </small>
              </div>
              <div className="flex items-center gap-3">
                <strong className="text-red-700">Rs. {(item.quantity * Math.abs(item.price)).toLocaleString()}</strong>
                <button
                  type="button"
                  aria-label={`Remove return ${item.returnCode || item.name}`}
                  className="w-7 h-7 grid place-items-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Totals Calculation */}
      <div className="mt-6 space-y-3 pt-4 border-t border-[#edf0eb]">
        <div className="flex justify-between items-center text-sm sm:text-base text-[#29443b]">
          <span>Subtotal</span>
          <strong className="font-bold">Rs. {subtotal.toLocaleString()}</strong>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-semibold text-[#29443b]">
            Discount (Rs.)
          </label>
          <input
            type="number"
            className="w-full h-10 sm:h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm sm:text-base text-[#29443b] focus:outline-none focus:border-[#155b4b] focus:ring-2 focus:ring-[#155b4b]/15"
            value={discount}
            onChange={(event) => onDiscountChange(Number(event.target.value))}
            min="0"
            max={Math.max(0, subtotal)}
          />
        </div>
      </div>

      {/* Total Banner */}
      <div className="my-5 p-4 sm:p-5 rounded-xl bg-[#f1f6ea] border border-[#e2ebd7] flex justify-between items-center">
        <span className="text-xs sm:text-sm font-semibold text-[#173b32] uppercase tracking-wider">Total bill</span>
        <strong className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#155b4b]">
          Rs. {total.toLocaleString()}
        </strong>
      </div>

      {/* Actions */}
      <div className="space-y-3 mt-auto">
        <button
          className="w-full h-12 sm:h-14 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 disabled:cursor-not-allowed text-white text-base sm:text-lg font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          type="button"
          disabled={!items.length || saving}
          onClick={() => onSaveBill({ subtotal, discount, total, items })}
        >
          {saving ? 'Saving…' : 'Save & preview bill →'}
        </button>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            className="h-11 rounded-xl border border-[#e2e6df] bg-white hover:bg-[#f6f8f1] disabled:opacity-50 disabled:cursor-not-allowed text-[#12332d] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-98"
            disabled={!items.length || saving}
            onClick={() => onHoldBill('held')}
          >
            Hold bill
          </button>
          <button
            type="button"
            className="h-11 rounded-xl border border-[#e2e6df] bg-white hover:bg-[#f6f8f1] disabled:opacity-50 disabled:cursor-not-allowed text-[#12332d] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-98"
            disabled={!items.length || saving}
            onClick={() => onHoldBill('quotation')}
          >
            Save quote
          </button>
          <button
            type="button"
            className="h-11 rounded-xl border border-[#e2e6df] bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#12332d] text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-98"
            disabled={!items.length || saving}
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  )
}
