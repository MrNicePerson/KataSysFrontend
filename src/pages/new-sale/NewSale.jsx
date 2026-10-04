import { useEffect, useRef, useState } from 'react'
import CustomerInvoice from '../../components/CustomerInvoice/CustomerInvoice.jsx'
import CurrentCart from '../../components/CurrentCart/CurrentCart.jsx'
import AddItem from '../../components/AddItem/AddItem.jsx'
import Payment from '../../components/Payment/Payment.jsx'
import { calculatePaymentSummary } from '../../data/paymentCalculations.js'

export default function NewSale({ customers, products = [], bills = [], selectedCustomerId, onCustomerChange, onNewCustomer, onSaveBill, onHoldBill, initialDraft, onDraftLoaded }) {
  const [items, setItems] = useState(() => initialDraft?.items ?? [])
  const [discount, setDiscount] = useState(() => initialDraft?.discount ?? 0)
  const [payments, setPayments] = useState(() => ({
    cash: String(initialDraft?.payments?.cash ?? ''),
    bank: String(initialDraft?.payments?.bankTransfer ?? initialDraft?.payments?.bank ?? ''),
    cheque: String(initialDraft?.payments?.cheque ?? ''),
  }))
  const [chequeDetails, setChequeDetails] = useState(() => ({
    chequeNumber: initialDraft?.payments?.chequeDetails?.chequeNumber ?? initialDraft?.chequeDetails?.chequeNumber ?? '',
    bankName: initialDraft?.payments?.chequeDetails?.bankName ?? initialDraft?.chequeDetails?.bankName ?? '',
    chequeDate: initialDraft?.payments?.chequeDetails?.chequeDate ?? initialDraft?.chequeDetails?.chequeDate ?? '',
    dueDate: initialDraft?.payments?.chequeDetails?.dueDate ?? initialDraft?.chequeDetails?.dueDate ?? '',
  }))
  const [saleMessage, setSaleMessage] = useState('')
  const [paidInvoiceNumber, setPaidInvoiceNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    if (initialDraft) {
      document.getElementById('customer-select')?.focus()
      onDraftLoaded?.()
    }
  }, [initialDraft, onDraftLoaded])

  useEffect(() => {
    const customer = customers.find((entry) => entry.id === selectedCustomerId)
    setPhone(customer?.phone ?? '')
    setAddress(customer?.address ?? '')
  }, [customers, selectedCustomerId])

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const total = Math.max(0, subtotal - discount)

  const clearSale = () => {
    setItems([])
    setDiscount(0)
    setPayments({ cash: '', bank: '', cheque: '' })
    setChequeDetails({ chequeNumber: '', bankName: '', chequeDate: '', dueDate: '' })
  }

  const changePayment = (method, value) => {
    const sanitizedValue = value !== '' && Number(value) < 0 ? '0' : value
    setPayments((currentPayments) => ({ ...currentPayments, [method]: sanitizedValue }))
  }

  const addItem = (item) => {
    setItems((currentItems) => [...currentItems, { ...item, id: `${Date.now()}-${Math.random()}` }])
    setSaleMessage('')
  }

  const updateItem = (id, field, value) => {
    setItems((currentItems) => currentItems.map((item) => item.id !== id ? item : {
      ...item,
      [field]: value === '' ? '' : field === 'quantity' ? Math.max(1, Number(value) || 1) : Math.max(0, Number(value) || 0),
    }))
  }

  const addReturn = ({ code, quantity, condition }) => {
    const normalizedCode = code.trim().toLowerCase()
    const matchesCode = (item) => [item.code, item.articleNumber, item.id, item.name]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalizedCode)
    const originalSale = bills.find((bill) => bill.customerId === selectedCustomerId && bill.items?.some(matchesCode))
    const billedItem = originalSale?.items.find(matchesCode)
    if (!billedItem) {
      setSaleMessage('Item not found.')
      return false
    }
    const amount = Math.abs(Number(billedItem.price ?? billedItem.unitPrice ?? 0))

    setItems((currentItems) => [...currentItems, {
      id: `${Date.now()}-${Math.random()}`,
      name: `Return · ${code} (${condition})`,
      returnCode: code,
      returnCondition: condition,
      productId: billedItem.productId,
      originalSaleId: originalSale.id,
      originalSaleLineId: billedItem.lineId,
      quantity,
      price: -amount,
      returnQuantity: quantity,
      isReturn: true,
    }])
    if (!amount) setSaleMessage('Return added; the item rate was not found, so no amount was deducted.')
    return true
  }

  const saveBill = async (bill) => {
    if (savingRef.current) return
    const paymentSummary = calculatePaymentSummary(bill.total, payments)
    if (paymentSummary.excessPayment > 0) {
      setSaleMessage(`Payment exceeds bill total by Rs. ${paymentSummary.excessPayment.toLocaleString()}.`)
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const saved = await onSaveBill({ ...bill, payments: { ...paymentSummary, bankTransfer: paymentSummary.bank, chequeDetails }, due: paymentSummary.uncoveredBalance, paymentDue: chequeDetails.dueDate, customerId: selectedCustomerId, paidInvoiceNumber, padInvoiceNumber: paidInvoiceNumber, customerPhone: phone, customerAddress: address })
      if (!saved) return
      clearSale()
    } catch (error) {
      setSaleMessage(error.message || 'Could not save this sale.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const holdBill = async (kind = 'held') => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const held = await onHoldBill({ items, discount, total, payments, chequeDetails, customerId: selectedCustomerId, kind })
      if (!held) return
      setSaleMessage('Bill held.')
      clearSale()
    } catch (error) {
      setSaleMessage(error.message || 'Could not hold this bill.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const handleClear = () => {
    if (window.confirm('Clear all items and payment amounts from this sale?')) {
      clearSale()
      setSaleMessage('Sale cleared.')
    }
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            New sale
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#718078] flex items-center flex-wrap gap-1">
            Search <span className="text-[#9aa19b]">→</span> Enter <span className="text-[#9aa19b]">→</span> quantity <span className="text-[#9aa19b]">→</span> Enter <span className="text-[#9aa19b]">→</span> price <span className="text-[#9aa19b]">→</span> Enter
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full border border-[#e2e6df] bg-white text-[#52645c] text-xs sm:text-sm font-medium shadow-xs select-none">
          Draft · 2026-09-28
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] 2xl:grid-cols-[1fr_460px] gap-6 lg:gap-8 items-start">
        <div className="space-y-6">
          <CustomerInvoice
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onCustomerChange={onCustomerChange}
            onNewCustomer={onNewCustomer}
            paidInvoiceNumber={paidInvoiceNumber}
            onPaidInvoiceNumberChange={setPaidInvoiceNumber}
            phone={phone}
            onPhoneChange={setPhone}
            address={address}
            onAddressChange={setAddress}
          />
          <AddItem products={products} onAddItem={addItem} />
          <Payment
            total={total}
            payments={payments}
            onChange={changePayment}
            chequeDetails={chequeDetails}
            onChequeDetailsChange={setChequeDetails}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-28">
          {saleMessage && (
            <p className="p-3.5 rounded-xl bg-[#eaf3e7] border border-[#d2e4ce] text-[#155b4b] text-xs sm:text-sm font-medium shadow-xs" role="status">
              {saleMessage}
            </p>
          )}
          <CurrentCart
            saving={saving}
            items={items}
            discount={discount}
            onDiscountChange={setDiscount}
            onAddReturn={addReturn}
            onRemoveItem={(id) => setItems((currentItems) => currentItems.filter((item) => item.id !== id))}
            onUpdateItem={updateItem}
            onSaveBill={(bill) => saveBill({ ...bill, paidInvoiceNumber, customerPhone: phone, customerAddress: address })}
            onHoldBill={holdBill}
            onClear={handleClear}
          />
        </div>
      </div>
    </main>
  )
}
