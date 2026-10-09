import { useEffect, useRef, useState } from 'react'
import CustomerInvoice from '../../components/CustomerInvoice/CustomerInvoice.jsx'
import CurrentCart from '../../components/CurrentCart/CurrentCart.jsx'
import AddItem from '../../components/AddItem/AddItem.jsx'
import Payment from '../../components/Payment/Payment.jsx'
import { calculatePaymentSummary } from '../../data/paymentCalculations.js'

const paymentMethodForDraft = (draft) => {
  const values = ['cash', 'bank', 'cheque'].filter((method) => Number(draft?.payments?.[method === 'bank' ? 'bankTransfer' : method] ?? draft?.payments?.[method] ?? 0) > 0)
  return values.length > 1 ? 'split' : values[0] || 'cash'
}

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
  const [bankDetails, setBankDetails] = useState(() => initialDraft?.payments?.bankDetails ?? initialDraft?.bankDetails ?? { bankName: '', accountNumber: '' })
  const [paymentMethod, setPaymentMethod] = useState(() => paymentMethodForDraft(initialDraft))
  const [saleMessage, setSaleMessage] = useState('')
  const [paidInvoiceNumber, setPaidInvoiceNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const sectionEnterRef = useRef(null)
  const saleRootRef = useRef(null)

  useEffect(() => {
    const focusCustomer = () => {
      const customer = saleRootRef.current?.querySelector('#customer-select')
      customer?.focus({ preventScroll: true })
      customer?.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
    focusCustomer()
    const recoverSaleFocus = (event) => {
      if (!['PageDown', 'PageUp'].includes(event.key) || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
      if (document.querySelector('[aria-modal="true"]')) return
      if (saleRootRef.current?.contains(event.target) && event.target.closest?.('[data-sale-step]')) return
      event.preventDefault()
      event.stopPropagation()
      focusCustomer()
    }
    document.addEventListener('keydown', recoverSaleFocus, true)
    return () => document.removeEventListener('keydown', recoverSaleFocus, true)
  }, [])

  const handleSectionNavigation = (event) => {
    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return
    const section = event.target.closest?.('[data-sale-step]')
    if (!section) return
    if (section.dataset?.saleStep === 'article' && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      sectionEnterRef.current = null
      const payment = event.currentTarget.querySelector('[data-sale-step="payment"]')
      const method = payment?.querySelector('input[name="sale-payment-method"]:checked')
        || payment?.querySelector('input[name="sale-payment-method"]')
      method?.focus({ preventScroll: true })
      method?.scrollIntoView?.({ behavior: 'auto', block: 'center' })
      return
    }
    if (section.dataset?.saleStep === 'customer' && event.target.id === 'address' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      sectionEnterRef.current = null
      const search = event.currentTarget.querySelector('#sale-item-search')
      search?.focus({ preventScroll: true })
      search?.scrollIntoView?.({ behavior: 'auto', block: 'center' })
      return
    }
    if (event.target.id === 'sale-discount' && event.key === 'Enter') {
      sectionEnterRef.current = null
      return
    }
    const backward = event.key === 'PageUp' || event.shiftKey && event.key === 'Backspace'
    const pageForward = event.key === 'PageDown'
    const doubleEnterStart = section.dataset?.saleStep === 'customer' && event.target.id === 'customer-select'
    if (!backward && !pageForward && (event.key !== 'Enter' || event.shiftKey)) {
      sectionEnterRef.current = null
      return
    }
    if (event.repeat) {
      event.preventDefault()
      return
    }
    const now = event.timeStamp
    const previous = sectionEnterRef.current
    if (event.key === 'Enter' && !doubleEnterStart) {
      sectionEnterRef.current = null
      return
    }
    if (section.dataset?.saleStep === 'article' && (backward || pageForward)) {
      const form = section.querySelector('form')
      const fields = [...form.querySelectorAll('#sale-item-search, input[name="quantity"], input[name="price"], button[type="submit"]')]
      const index = fields.indexOf(event.target)
      if (index >= 0 && (pageForward && index === 0 || backward && index > 0)) {
        sectionEnterRef.current = null
        // Let AddItem handle movement between its own controls. The capture
        // handler only owns jumps from the item section into payment.
        return
      }
      if (pageForward && index > 0 || backward && index === 0) {
        sectionEnterRef.current = null
      }
    }
    if (!backward && !pageForward && (!previous || previous.section !== section || now - previous.time > 500)) {
      sectionEnterRef.current = { section, time: now }
      return
    }
    sectionEnterRef.current = null
    event.preventDefault()
    event.stopPropagation()
    if (section.dataset?.saleStep === 'cart' && ['PageUp', 'PageDown'].includes(event.key)) {
      let selector = null
      if (event.key === 'PageUp' && event.target.id === 'sale-discount') selector = '#sale-return-code'
      if (event.key === 'PageUp' && event.target.id === 'sale-save-preview') selector = '#sale-discount'
      if (event.key === 'PageDown' && event.target.id !== 'sale-discount' && event.target.id !== 'sale-save-preview') selector = '#sale-discount'
      if (event.key === 'PageDown' && event.target.id === 'sale-discount') selector = '#sale-save-preview:not(:disabled)'
      if (selector) {
        const target = section.querySelector(selector)
        target?.focus({ preventScroll: true })
        if (selector === '#sale-discount' && target) {
          target.select?.()
          target.style.scrollMarginTop = '8rem'
          target.scrollIntoView?.({ block: 'start', behavior: 'instant' })
        } else {
          target?.scrollIntoView?.({ block: 'center', behavior: 'auto' })
        }
        return
      }
    }
    const sections = [...event.currentTarget.querySelectorAll('[data-sale-step]')]
    const next = sections[sections.indexOf(section) + (backward ? -1 : 1)]
    if (!next) return
    if (!backward && !pageForward && event.target.matches?.('button[type="submit"]')) {
      const form = event.target.closest('form')
      if (form && !form.reportValidity()) return
      form?.requestSubmit(event.target)
    }
    const targets = {
      customer: '#customer-select',
      article: '#sale-item-search',
      payment: 'input[name="sale-payment-method"]:checked',
      cart: 'input[max]',
    }
    const control = next.querySelector(targets[next.dataset?.saleStep] || 'input, select')
    control?.focus({ preventScroll: true })
    control?.scrollIntoView?.({ behavior: 'auto', block: 'center' })
  }

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
    setBankDetails({ bankName: '', accountNumber: '' })
    setPaymentMethod('cash')
  }

  const changePayment = (method, value) => {
    const sanitizedValue = value !== '' && Number(value) < 0 ? '0' : value
    setPayments((currentPayments) => ({ ...currentPayments, [method]: sanitizedValue }))
  }

  const changePaymentMethod = (method) => {
    setPaymentMethod(method)
    if (method !== 'split') {
      setPayments((currentPayments) => ({
        cash: method === 'cash' ? currentPayments.cash : '',
        bank: method === 'bank' ? currentPayments.bank : '',
        cheque: method === 'cheque' ? currentPayments.cheque : '',
      }))
    }
  }

  const addItem = (item) => {
    setItems((currentItems) => {
      const sameItem = currentItems.find((currentItem) => {
        if (currentItem.isReturn || currentItem.returnQuantity) return false
        if (item.productId != null && currentItem.productId != null) {
          return currentItem.productId === item.productId
        }
        const identity = (entry) => String(entry.code || entry.name || '').trim().toLowerCase()
        return identity(currentItem) === identity(item) && Number(currentItem.price) === Number(item.price)
      })

      if (sameItem) {
        return currentItems.map((currentItem) => currentItem.id === sameItem.id
          ? { ...currentItem, quantity: Number(currentItem.quantity || 0) + Number(item.quantity || 1) }
          : currentItem)
      }

      return [...currentItems, { ...item, id: `${Date.now()}-${Math.random()}` }]
    })
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

  const focusDiscount = () => {
    const discountField = saleRootRef.current?.querySelector('#sale-discount')
    discountField?.focus({ preventScroll: true })
    discountField?.select?.()
    discountField?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
  }

  const saveBill = async (bill) => {
    if (savingRef.current) return
    const paymentSummary = calculatePaymentSummary(bill.total, payments)
    if (paymentSummary.excessPayment > 0) {
      setSaleMessage(`Payment exceeds bill total by Rs. ${paymentSummary.excessPayment.toLocaleString()}.`)
      return
    }
    if (paymentSummary.bank > 0 && !bankDetails.bankName.trim()) {
      setSaleMessage('Enter a bank name for the bank payment.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const saved = await onSaveBill({ ...bill, payments: { ...paymentSummary, bankTransfer: paymentSummary.bank, chequeDetails, bankDetails }, bankDetails, cheque: chequeDetails, due: paymentSummary.uncoveredBalance, paymentDue: chequeDetails.dueDate, customerId: selectedCustomerId, paidInvoiceNumber, padInvoiceNumber: paidInvoiceNumber, customerPhone: phone, customerAddress: address })
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
      const held = await onHoldBill({ items, discount, total, payments, chequeDetails, bankDetails, paymentMethod, customerId: selectedCustomerId, kind })
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
    <main ref={saleRootRef} onKeyDownCapture={handleSectionNavigation} className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
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
          <div data-sale-step="customer">
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
          </div>
          <div data-sale-step="article">
          <AddItem products={products} onAddItem={addItem} onSkipEmptyItem={focusDiscount} />
          </div>
          <div data-sale-step="payment">
          <Payment
            total={total}
            payments={payments}
            method={paymentMethod}
            onMethodChange={changePaymentMethod}
            onChange={changePayment}
            bankDetails={bankDetails}
            onBankDetailsChange={setBankDetails}
            chequeDetails={chequeDetails}
            onChequeDetailsChange={setChequeDetails}
          />
          </div>
        </div>

        <div data-sale-step="cart" className="space-y-4 lg:sticky lg:top-28">
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
            onAddReturn={addReturn} onReturnAdded={focusDiscount}
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
