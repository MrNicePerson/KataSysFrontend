import { useState } from 'react'
import { localDateString } from '../../data/businessLogic.js'

export default function CustomerReturns({ bills = [], customers = [], returns = [], onReturnProcessed }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBill, setSelectedBill] = useState(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [condition, setCondition] = useState('sellable')
  const [refundType, setRefundType] = useState('khata')
  const [successMessage, setSuccessMessage] = useState('')

  const customerNameForId = (customerId) => customers.find((customer) => customer.id === customerId)?.name
  const customerNameForBill = (bill) => bill?.customer?.trim()
    || bill?.customerDetails?.name
    || customerNameForId(bill?.customerId)
    || 'Walk-in customer'
  const availableBills = bills.filter((bill) => bill.items?.some((item) => !item.isReturn))

  const filteredBills = availableBills.filter((bill) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    const num = (bill.number || '').toLowerCase()
    const name = customerNameForBill(bill).toLowerCase()
    const phone = (bill.customerDetails?.phone || bill.customerPhone || '').toLowerCase()
    return name.includes(q) || phone.includes(q) || num.includes(q)
  })

  const handleSelectBill = (bill) => {
    setSelectedBill(bill)
    setSelectedItemIndex(0)
    setReturnQuantity(1)
    setSuccessMessage('')
  }

  const handleProcessReturn = async (e) => {
    e.preventDefault()
    if (!selectedBill) return

    const currentItem = selectedBill.items?.filter((item) => !item.isReturn)[selectedItemIndex]
    if (!currentItem) {
      setSuccessMessage('This bill has no returnable items.')
      return
    }

    const qty = Number(returnQuantity) || 1
    const today = localDateString()
    const lineId = currentItem.lineId || null
    let savedReturn
    try {
      savedReturn = await onReturnProcessed?.({ saleId: selectedBill.id, lineId, productId: currentItem.productId, code: currentItem.code, name: currentItem.name, quantity: qty, condition, refundType, date: today })
      if (!savedReturn) {
        setSuccessMessage('Could not process this return. Check the error message above and try again.')
        return
      }
    } catch (error) {
      setSuccessMessage(error.message || 'Could not process this return.')
      return
    }
    setSuccessMessage(`Return ${savedReturn?.id || ''} processed successfully! ${refundType === 'khata' ? 'Credited to customer khata.' : 'Refunded in cash.'}`)
    setSelectedBill(null)
  }

  const selectedItems = selectedBill?.items?.filter((item) => !item.isReturn) || []
  const currentItem = selectedItems[selectedItemIndex]
  const alreadyReturned = currentItem && returns.filter((entry) => entry.saleId === selectedBill.id && (entry.lineId ? entry.lineId === currentItem.lineId : entry.productId === currentItem.productId)).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
  const remainingQuantity = currentItem ? Math.max(0, Number(currentItem.quantity || 0) - alreadyReturned) : 0

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Customer returns
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Search by customer name, phone, or bill number to find the original purchase.
      </p>

      {/* Find original bill search card */}
      <section className="p-4 sm:p-6 rounded-2xl bg-white border border-[#e2e6df] shadow-panel mb-6">
        <label className="block text-[#173b32] text-sm sm:text-base font-semibold mb-2" htmlFor="returns-bill-search-input">
          Find original bill
        </label>
        <input
          id="returns-bill-search-input"
          className="w-full max-w-lg h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
          type="search"
          placeholder="Customer name, phone, or bill number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <p className="mt-2 text-xs sm:text-sm text-[#718078]">
          Select a bill to see its items, suppliers and returnable quantities.
        </p>
      </section>

      {/* Matching Bills Table */}
      <section className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel mb-6">
        <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">BILL</th>
              <th className="px-4 sm:px-6 py-3.5">CUSTOMER</th>
              <th className="px-4 sm:px-6 py-3.5">PURCHASE DATE</th>
              <th className="px-4 sm:px-6 py-3.5">TOTAL</th>
              <th className="px-4 sm:px-6 py-3.5 text-right" aria-label="Action"></th>
            </tr>
          </thead>
          <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
            {filteredBills.length ? (
              filteredBills.map((bill) => (
                <tr key={bill.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                  <td className="px-4 sm:px-6 py-4 font-bold text-[#173b32]">{bill.number}</td>
                  <td className="px-4 sm:px-6 py-4 font-medium">{customerNameForBill(bill)}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{bill.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">
                    Rs. {Number(bill.total || 0).toLocaleString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <button
                      data-keyboard-primary
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
                      onClick={() => handleSelectBill(bill)}
                    >
                      Select bill →
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  No bills match "{searchQuery}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#eaf3e7] border border-[#d2e4ce] text-[#155b4b] text-sm font-medium mb-6" role="status">
          <span>✓ {successMessage}</span>
          <button type="button" className="text-lg leading-none cursor-pointer" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}

      {/* Selected Bill Return Processor Card */}
      {selectedBill && (
        <section className="p-4 sm:p-6 lg:p-7 rounded-2xl bg-white border border-[#155b4b]/30 shadow-panel mb-6">
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#edf0eb] mb-5">
            <div>
              <h2 className="text-[#173b32] text-lg sm:text-xl font-bold">Process return for {selectedBill.number}</h2>
              <p className="text-xs sm:text-sm text-[#718078] mt-0.5">
                Customer: <strong className="text-[#173b32]">{customerNameForBill(selectedBill)}</strong> · Purchased on {selectedBill.date}
              </p>
            </div>
            <button
              type="button"
              className="w-8 h-8 grid place-items-center rounded-lg text-xl text-[#718078] hover:bg-[#f6f8f1] hover:text-[#173b32] cursor-pointer"
              onClick={() => setSelectedBill(null)}
              aria-label="Cancel return"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleProcessReturn} className="space-y-5">
            <div>
              <label className="block text-[#173b32] text-sm font-semibold mb-2">Choose item to return</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedItems.map((item, index) => (
                  <button
                    key={item.lineId || item.id || index}
                    type="button"
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedItemIndex === index
                        ? 'border-[#155b4b] bg-[#eef4e8] shadow-xs'
                        : 'border-[#dfe4dc] hover:border-[#cbd7cf] bg-white'
                    }`}
                    onClick={() => {
                      setSelectedItemIndex(index)
                      setReturnQuantity(1)
                    }}
                  >
                    <strong className="text-[#12332d] text-sm font-semibold">{item.name}</strong>
                    {item.shade && <span className="text-xs text-[#718078]">{item.shade}</span>}
                    <span className="text-xs text-[#155b4b] font-medium">
                      Purchased: {item.quantity} suits @ Rs. {Number(item.price ?? item.unitPrice ?? 0).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Return quantity
                <input
                  type="number"
                  min="1"
                  max={remainingQuantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm focus:outline-none focus:border-[#155b4b]"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Condition
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm focus:outline-none focus:border-[#155b4b]"
                >
                  <option value="sellable">Sellable stock (Restock)</option>
                  <option value="damaged">Damaged / Defective (Quarantine)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
                Refund adjustment
                <select
                  value={refundType}
                  onChange={(e) => setRefundType(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] text-sm focus:outline-none focus:border-[#155b4b]"
                >
                  <option value="khata">Credit to customer khata (Jama karein)</option>
                  <option value="cash">Cash refund from cash drawer</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-[#edf0eb]">
              <span className="text-sm text-[#173b32]">
                Total refund/credit amount:{' '}
                <strong className="text-base sm:text-lg text-[#155b4b] font-bold">
                  Rs.{' '}
                  {(
                    (Number(returnQuantity) || 1) *
                    Math.abs(currentItem?.price ?? currentItem?.unitPrice ?? 0)
                  ).toLocaleString()}
                </strong>
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-[#dfe4dc] text-xs sm:text-sm font-semibold hover:bg-[#f6f8f1] cursor-pointer"
                  onClick={() => setSelectedBill(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                  disabled={!currentItem || remainingQuantity < 1 || Number(returnQuantity) > remainingQuantity}
                >
                  Confirm &amp; process return
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Previous returns section */}
      <section className="mt-8">
        <h2 className="text-[#173b32] text-xl font-bold mb-4">Previous returns</h2>
        <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
          <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-4 sm:px-6 py-3.5">RETURN</th>
                <th className="px-4 sm:px-6 py-3.5">ORIGINAL BILL</th>
                <th className="px-4 sm:px-6 py-3.5">DATE</th>
                <th className="px-4 sm:px-6 py-3.5">CUSTOMER</th>
                <th className="px-4 sm:px-6 py-3.5">CREDIT</th>
                <th className="px-4 sm:px-6 py-3.5">REFUND</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0eb]">
              {returns.length ? (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-[#f8faf7]">
                    <td className="px-4 sm:px-6 py-4 font-bold text-[#173b32]">{ret.id}</td>
                    <td className="px-4 sm:px-6 py-4 font-medium">{ret.saleNumber}</td>
                    <td className="px-4 sm:px-6 py-4 text-[#718078]">{ret.date}</td>
                    <td className="px-4 sm:px-6 py-4">
                      {customerNameForId(ret.customerId) || customerNameForBill(bills.find((bill) => bill.id === ret.saleId))}
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-semibold text-[#155b4b]">
                      {ret.refundType === 'khata' ? `Rs. ${Number(ret.amount || 0).toLocaleString()}` : 'Rs. 0'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-semibold text-red-700">
                      {ret.refundType === 'cash' ? `Rs. ${Number(ret.amount || 0).toLocaleString()}` : 'Rs. 0'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                    No previous returns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
