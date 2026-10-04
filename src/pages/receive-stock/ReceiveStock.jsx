import { useEffect, useRef, useState } from 'react'
import ReceiveStats from '../../components/ReceiveStats/ReceiveStats.jsx'
import ReceiveTable from '../../components/ReceiveTable/ReceiveTable.jsx'
import NewDeliveryModal from '../../components/NewDeliveryModal/NewDeliveryModal.jsx'
import { receivingLabel } from '../../data/receiving.js'
import ReceivingDetails from '../../components/ReceivingDetails/ReceivingDetails.jsx'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`

export default function ReceiveStock({ suppliers = [], purchases = [], onSave }) {
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPurchase, setSelectedPurchase] = useState(null)
  const detailsOpenerRef = useRef(null)
  const closeDetails = () => {
    setSelectedPurchase(null)
    requestAnimationFrame(() => { if (detailsOpenerRef.current?.isConnected) detailsOpenerRef.current.focus() })
  }
  const detailsKeyboard = useKeyboardScope({ onEscape: closeDetails, trapFocus: true })
  useEffect(() => {
    if (selectedPurchase) detailsKeyboard.ref.current?.querySelector('[aria-label="Close bill details"]')?.focus()
  }, [selectedPurchase])
  const purchased = purchases.reduce((sum, row) => sum + Number(row.total || 0), 0)
  const paid = purchases.reduce((sum, row) => sum + Number(row.paid || 0), 0)
  const stats = [
    ['Deliveries', String(purchases.length)],
    ['Purchased', money(purchased)],
    ['Payments at receiving', money(paid)],
    ['Supplier dues', money(purchases.reduce((sum, row) => sum + Number(row.due || 0), 0))],
  ]

  const saveDelivery = async (delivery) => {
    try {
      const saved = await onSave(delivery)
      if (!saved) return
      setAdding(false)
      setMessage(`Delivery ${receivingLabel(saved)} recorded and stock updated.`)
    } catch (error) {
      setMessage(error.message || 'Could not save delivery.')
    }
  }

  const rows = purchases.map((purchase) => [
    receivingLabel(purchase),
    purchase.supplier,
    purchase.date,
    `${(purchase.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} suits · ${(purchase.items || []).length} products`,
    money(purchase.total),
    money(purchase.paid),
    purchase.id,
  ])

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Receive stock
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Add a supplier delivery to the stock ledger.
          </p>
        </div>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={() => setAdding(true)}
        >
          + New delivery
        </button>
      </div>

      <ReceiveStats stats={stats} />
      <ReceiveTable deliveries={rows} onSelect={(id) => { detailsOpenerRef.current = document.activeElement; setSelectedPurchase(purchases.find((purchase) => purchase.id === id) || null) }} />

      {selectedPurchase && <div className="fixed inset-0 z-50 bg-[#203832]/40 flex items-center justify-center p-3 sm:p-6" onClick={closeDetails}>
        <div ref={detailsKeyboard.ref} onKeyDown={detailsKeyboard.onKeyDown} role="dialog" aria-modal="true" aria-label="Receive Stock bill details" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between mb-4"><h2 className="text-[#173b32] text-xl font-bold">Receive Stock bill</h2><button type="button" aria-label="Close bill details" className="text-2xl text-[#718078]" onClick={closeDetails}>×</button></div>
          <ReceivingDetails purchase={selectedPurchase} supplier={suppliers.find((supplier) => supplier.id === selectedPurchase.supplierId)} />
        </div>
      </div>}

      {message && (
        <p className="mt-4 p-3.5 rounded-xl bg-[#eaf3e7] border border-[#d2e4ce] text-[#155b4b] text-xs sm:text-sm font-medium" role="status">
          {message}
        </p>
      )}

      {adding && (
        <NewDeliveryModal
          suppliers={suppliers}
          purchases={purchases}
          onClose={() => setAdding(false)}
          onSave={saveDelivery}
        />
      )}
    </main>
  )
}
