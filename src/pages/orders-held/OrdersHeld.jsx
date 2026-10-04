import { useState } from 'react'
import EmptyOrdersTable from '../../components/EmptyOrdersTable/EmptyOrdersTable.jsx'
import FormDialog from '../../components/FormDialog/FormDialog.jsx'

export default function OrdersHeld({ bills, customers = [], onResume, onDiscard, onDeliver, onComplete }) {
  const [deliveryOrder, setDeliveryOrder] = useState(null)
  const deliveryFields = deliveryOrder ? [
    ...deliveryOrder.items.filter((item) => !item.isReturn).map((item, index) => ({
      name: `quantity-${item.lineId || item.productId || index}`,
      label: `${item.name} · ${Number(item.remainingQuantity ?? item.quantity)} remaining`,
      type: 'number',
      min: '0',
      step: '1',
      defaultValue: String(item.remainingQuantity ?? item.quantity),
    })),
    { name: 'cash', label: 'Cash received', type: 'number', min: '0', defaultValue: '0' },
    { name: 'bank', label: 'Bank received', type: 'number', min: '0', defaultValue: '0' },
  ] : []

  const submitDelivery = async (values) => {
    const items = deliveryOrder.items.filter((item) => !item.isReturn).map((item, index) => ({
      lineId: item.lineId,
      productId: item.productId,
      quantity: Number(values[`quantity-${item.lineId || item.productId || index}`] || 0),
      price: item.price ?? item.unitPrice,
    })).filter((item) => item.quantity > 0)
    if (!items.length) throw new Error('Enter a quantity to deliver.')
    const delivered = await onDeliver(deliveryOrder.id, { items, payments: { cash: values.cash, bank: values.bank } })
    if (delivered) setDeliveryOrder(null)
    return delivered
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
        YOUR WHOLESALE WORKSPACE
      </p>
      <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
        Orders &amp; held bills
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-[#718078] mb-6 sm:mb-8">
        Continue a draft, reserve stock, or convert a quotation.
      </p>
      <EmptyOrdersTable bills={bills} customers={customers} onResume={onResume} onDiscard={onDiscard} onDeliver={setDeliveryOrder} onComplete={onComplete} />
      {deliveryOrder && <FormDialog title={`Deliver ${deliveryOrder.kind === 'quotation' ? 'quotation' : 'held order'}`} fields={deliveryFields} onClose={() => setDeliveryOrder(null)} onSave={submitDelivery} />}
    </main>
  )
}
