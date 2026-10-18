import { useEffect, useRef, useState } from 'react'
import { localDateString } from '../../data/businessLogic.js'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

const initialItem = () => ({
  id: `item-${Date.now()}-${Math.random()}`,
  name: '',
  shade: '',
  quantity: 1,
  price: 0,
})

export default function CreateBillModal({ customers = [], products = [], onClose, onSave, nextInvoiceNumber }) {
  const submittingRef = useRef(false)
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('select, input')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || 'walk-in')
  const [customerName, setCustomerName] = useState(customers[0]?.name || 'Walk-in customer')
  const [customerPhone, setCustomerPhone] = useState(customers[0]?.phone || '')
  const [customerAddress, setCustomerAddress] = useState(customers[0]?.address || '')
  const [padInvoiceNumber, setPadInvoiceNumber] = useState('')
  const [billDate, setBillDate] = useState(() => localDateString())

  const [items, setItems] = useState([initialItem()])
  const [discount, setDiscount] = useState(0)
  const [cashPaid, setCashPaid] = useState(0)
  const [bankPaid, setBankPaid] = useState(0)
  const [chequePaid, setChequePaid] = useState(0)

  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId)
    if (customerId === 'walk-in') {
      setCustomerName('Walk-in customer')
      setCustomerPhone('')
      setCustomerAddress('')
    } else if (customerId === 'custom') {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
    } else {
      const found = customers.find((c) => c.id === customerId)
      if (found) {
        setCustomerName(found.name)
        setCustomerPhone(found.phone || '')
        setCustomerAddress(found.address || found.city || '')
      }
    }
  }

  const handleItemChange = (id, field, value) => {
    setItems((curr) =>
      curr.map((item) => {
        if (item.id !== id) return item
        if (field === 'preset') {
          const product = products.find((p) => p.name === value || p.code === value)
          if (product) {
            return { ...item, productId: product.id, code: product.code, name: product.name, shade: product.shade || '', price: product.salePrice || 0 }
          }
          return { ...item, name: value }
        }
        return {
          ...item,
          [field]: field === 'quantity' || field === 'price' ? Number(value) || 0 : value,
        }
      }),
    )
  }

  const addItem = () => {
    setItems((curr) => [
      ...curr,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        name: '',
        shade: '',
        quantity: 1,
        price: 0,
      },
    ])
  }

  const removeItem = (id) => {
    if (items.length <= 1) return
    setItems((curr) => curr.filter((i) => i.id !== id))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  const total = Math.max(0, subtotal - Number(discount || 0))
  const totalPaid = Number(cashPaid || 0) + Number(bankPaid || 0)
  const due = Math.max(0, total - totalPaid)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!items.length || submittingRef.current) return
    submittingRef.current = true

    const dueParts = billDate.split('-')
    let defaultDueDate = ''
    if (dueParts.length === 3) {
      const d = new Date(Number(dueParts[0]), Number(dueParts[1]) - 1, Number(dueParts[2]))
      d.setDate(d.getDate() + 7)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      defaultDueDate = `${y}-${m}-${day}`
    }

    const newBill = {
      id: `bill-${Date.now()}`,
      number: nextInvoiceNumber || `INV-${1053 + Math.floor(Math.random() * 100)}`,
      date: billDate,
      paymentDue: defaultDueDate,
      customer: customerName || 'Walk-in customer',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      padInvoiceNumber: padInvoiceNumber.trim(),
      customerDetails: {
        id: selectedCustomerId,
        name: customerName || 'Walk-in customer',
        phone: customerPhone || '',
        address: customerAddress || '',
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.name.trim(),
        shade: i.shade.trim(),
        quantity: Number(i.quantity) || 1,
        price: Number(i.price) || 0,
      })),
      subtotal,
      discount: Number(discount) || 0,
      total,
      payments: {
        cash: Number(cashPaid) || 0,
        bank: Number(bankPaid) || 0,
        cheque: Number(chequePaid) || 0,
      },
      paid: totalPaid,
      due,
    }

    try {
      await onSave(newBill)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} className="w-full max-w-4xl p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create new bill">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#edf0eb]">
          <div>
            <h2 className="text-[#173b32] text-xl sm:text-2xl font-bold">Create bill &amp; receipt</h2>
            <p className="text-xs sm:text-sm text-[#718078] mt-0.5">Create and preview a wholesale sales receipt.</p>
          </div>
          <button className="w-8 h-8 grid place-items-center rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] cursor-pointer" type="button" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 sm:p-5 rounded-xl bg-[#fafbf8] border border-[#e8ece3] space-y-4">
            <h3 className="text-sm font-bold text-[#173b32] uppercase tracking-wider">Customer &amp; invoice info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Select customer
                <select className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]" value={selectedCustomerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                  <option value="walk-in">Walk-in customer</option>
                  <option value="custom">Other / Custom customer</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Customer name
                <input
                  type="text"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Customer name"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Phone number
                <input
                  type="text"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Pad invoice number (optional)
                <input
                  type="text"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  value={padInvoiceNumber}
                  onChange={(e) => setPadInvoiceNumber(e.target.value)}
                  placeholder="e.g. PAD-8812"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Bill date
                <input
                  type="date"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Address (optional)
                <input
                  type="text"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Lahore, Faisalabad..."
                />
              </label>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#fafbf8] border border-[#e8ece3] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#173b32] uppercase tracking-wider">Bill line items</h3>
              <button type="button" className="px-3 py-1 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs font-semibold shadow-2xs cursor-pointer" onClick={addItem}>+ Add item</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-[#dfe4dc] text-[#718078] font-semibold">
                    <th className="py-2 px-2">Item article</th>
                    <th className="py-2 px-2">Shade / Colour</th>
                    <th className="py-2 px-2 w-20">Qty</th>
                    <th className="py-2 px-2 w-28">Rate (Rs.)</th>
                    <th className="py-2 px-2 text-right w-28">Total</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          className="w-full h-9 px-2.5 rounded-lg border border-[#dfe4dc] bg-white text-xs sm:text-sm focus:outline-none focus:border-[#155b4b]"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="Item name"
                          list="product-presets"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          className="w-full h-9 px-2.5 rounded-lg border border-[#dfe4dc] bg-white text-xs sm:text-sm focus:outline-none focus:border-[#155b4b]"
                          value={item.shade}
                          onChange={(e) => handleItemChange(item.id, 'shade', e.target.value)}
                          placeholder="e.g. Sky blue"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          className="w-full h-9 px-2 text-center rounded-lg border border-[#dfe4dc] bg-white text-xs sm:text-sm focus:outline-none focus:border-[#155b4b]"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          min="1"
                          required
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          className="w-full h-9 px-2 text-center rounded-lg border border-[#dfe4dc] bg-white text-xs sm:text-sm focus:outline-none focus:border-[#155b4b]"
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                          min="0"
                          required
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#173b32]">
                        Rs. {(item.quantity * item.price).toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove ${item.name || 'bill item'}`}
                            className="w-7 h-7 grid place-items-center rounded-md text-red-600 hover:bg-red-50 cursor-pointer"
                            onClick={() => removeItem(item.id)}
                            title="Remove item"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <datalist id="product-presets">
                {products.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} ({p.code}) - Rs. {p.salePrice}</option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#fafbf8] border border-[#e8ece3] space-y-4">
            <h3 className="text-sm font-bold text-[#173b32] uppercase tracking-wider">Payment &amp; totals</h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
                  Discount (Rs.)
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    min="0"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
                  Cash payment (Rs.)
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]"
                    value={cashPaid}
                    onChange={(e) => setCashPaid(Number(e.target.value) || 0)}
                    min="0"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-[#173b32]">
                  Bank transfer (Rs.)
                  <input
                    type="number"
                    className="w-full h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]"
                    value={bankPaid}
                    onChange={(e) => setBankPaid(Number(e.target.value) || 0)}
                    min="0"
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#dfe4dc] space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[#718078]">
                  <span>Subtotal</span>
                  <strong className="text-[#173b32]">Rs. {subtotal.toLocaleString()}</strong>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <strong>− Rs. {discount.toLocaleString()}</strong>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[#155b4b] pt-2 border-t border-[#edf0eb]">
                  <span>Total bill</span>
                  <strong>Rs. {total.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-[#718078]">
                  <span>Total paid</span>
                  <strong className="text-[#155b4b]">Rs. {totalPaid.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-red-700 font-semibold">
                  <span>Due at sale</span>
                  <strong>Rs. {due.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#edf0eb]">
            <button type="button" className="px-4 py-2 rounded-xl border border-[#dfe4dc] text-xs sm:text-sm font-semibold hover:bg-[#f6f8f1] cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-98">
              Save &amp; view bill receipt →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
