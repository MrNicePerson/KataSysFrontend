import { refreshCartStock } from '../../data/cartStock.js'
import { validatePaymentPromises } from '../../data/paymentPromises.js'
import { returnRefundAmount } from '../../data/inputValidation.js'
import { useEffect, useRef, useState } from 'react'
import CustomerInvoice from '../../components/CustomerInvoice/CustomerInvoice.jsx'
import CurrentCart from '../../components/CurrentCart/CurrentCart.jsx'
import AddItem from '../../components/AddItem/AddItem.jsx'
import Payment from '../../components/Payment/Payment.jsx'
import { calculatePaymentSummary } from '../../data/paymentCalculations.js'
import { prepareSaleDraft } from '../../data/saleDraft.js'
import { sellableProducts } from '../../data/sellableStock.js'

const paymentMethodForDraft = (draft) => {
  const values = ['cash', 'bank', 'cheque'].filter((method) => Number(draft?.payments?.[method === 'bank' ? 'bankTransfer' : method] ?? draft?.payments?.[method] ?? 0) > 0)
  return values.length > 1 ? 'split' : values[0] || 'cash'
}

export default function NewSale({ customers, products = [], bills = [], returns = [], selectedCustomerId, onCustomerChange, onNewCustomer, onSaveBill, onHoldBill, initialDraft, onDraftLoaded, businessDate }) {
  const [items, setItems] = useState(() => prepareSaleDraft(initialDraft).items)
  const [discount, setDiscount] = useState(() => String(initialDraft?.discount ?? ''))
  const [paymentPromises, setPaymentPromises] = useState(() => (initialDraft?.paymentPromises || []).map((promise, index) => ({ id: promise.id || `promise-${index}-${Date.now()}`, dueDate: promise.dueDate || '', amount: String(promise.amount ?? '') })))
  const [refundType, setRefundType] = useState(() => initialDraft?.refundType || 'cash')
  const [payments, setPayments] = useState(() => ({
    cash: String(initialDraft?.payments?.cash ?? ''),
    bank: String(initialDraft?.payments?.bankTransfer ?? initialDraft?.payments?.bank ?? ''),
    cheque: String(initialDraft?.payments?.cheque ?? ''),
  }))
  const [chequeDetails, setChequeDetails] = useState(() => ({
    chequeNumber: initialDraft?.payments?.chequeDetails?.chequeNumber ?? initialDraft?.chequeDetails?.chequeNumber ?? initialDraft?.cheque?.chequeNumber ?? initialDraft?.cheque?.number ?? '',
    bankName: initialDraft?.payments?.chequeDetails?.bankName ?? initialDraft?.chequeDetails?.bankName ?? initialDraft?.cheque?.bankName ?? initialDraft?.cheque?.bank ?? '',
    chequeDate: initialDraft?.payments?.chequeDetails?.chequeDate ?? initialDraft?.chequeDetails?.chequeDate ?? initialDraft?.cheque?.chequeDate ?? initialDraft?.cheque?.issued ?? '',
    dueDate: initialDraft?.payments?.chequeDetails?.dueDate ?? initialDraft?.chequeDetails?.dueDate ?? initialDraft?.cheque?.dueDate ?? initialDraft?.cheque?.expectedClearanceDate ?? '',
  }))
  const [bankDetails, setBankDetails] = useState(() => initialDraft?.payments?.bankDetails ?? initialDraft?.bankDetails ?? { bankName: '', accountNumber: '' })
  const [paymentMethod, setPaymentMethod] = useState(() => paymentMethodForDraft(initialDraft))
  const [saleMessage, setSaleMessage] = useState('')
  const [paidInvoiceNumber, setPaidInvoiceNumber] = useState(() => initialDraft?.padInvoiceNumber ?? initialDraft?.paidInvoiceNumber ?? '')
  const [phone, setPhone] = useState(() => initialDraft?.customerPhone ?? '')
  const [address, setAddress] = useState(() => initialDraft?.customerAddress ?? '')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const idempotencyRef = useRef(null)
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
    if (initialDraft) {
      setPhone(initialDraft.customerPhone ?? customer?.phone ?? customer?.mobile ?? customer?.mobileNumber ?? customer?.phoneNumber ?? customer?.customerPhone ?? customer?.contact ?? '')
      setAddress(initialDraft.customerAddress ?? customer?.address ?? customer?.addressLine ?? customer?.customerAddress ?? customer?.location ?? customer?.city ?? '')
      return
    }
    setPhone(customer?.phone ?? customer?.mobile ?? customer?.mobileNumber ?? customer?.phoneNumber ?? customer?.customerPhone ?? customer?.contact ?? '')
    setAddress(customer?.address ?? customer?.addressLine ?? customer?.customerAddress ?? customer?.location ?? customer?.city ?? '')
  }, [customers, selectedCustomerId])

  const saleSubtotal = items.filter((item) => !item.isReturn && !item.returnQuantity).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0) * (item.productType === 'tan' ? Number(item.metersPerTan || 0) : 1), 0)
  const returnTotal = items.filter((item) => item.isReturn || item.returnQuantity).reduce((sum, item) => sum + Number(item.quantity || 0) * Math.abs(Number(item.price || 0)), 0)
  const total = Math.max(0, saleSubtotal - Number(discount || 0) - returnTotal)
  const normalizedDiscount = Number(discount) || 0
  const availableProducts = sellableProducts(products)
  const customerProducts = (() => {
    if (!selectedCustomerId || selectedCustomerId === 'walk-in') return []
    const selectedCustomer = customers.find((customer) => String(customer.id) === String(selectedCustomerId))
    const selectedCustomerName = String(selectedCustomer?.name || '').trim().toLowerCase()
    const customerBills = bills.filter((bill) => {
      const idMatches = String(bill.customerId || '') === String(selectedCustomerId)
      const nameMatches = !bill.customerId && selectedCustomerName && String(bill.customer || bill.customerName || '').trim().toLowerCase() === selectedCustomerName
      return idMatches || nameMatches
    })
    return customerBills
      .flatMap((bill) => (bill.items || []).filter((item) => !item.isReturn).map((item) => {
        const alreadyReturned = returns.filter((entry) => entry.saleId === bill.id && (entry.lineId
          ? entry.lineId === item.lineId
          : entry.productId === item.productId)).reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
        const product = products.find((entry) => entry.id === item.productId)
        return {
          ...(product || {}),
          ...item,
          originalSaleId: bill.id,
          originalSaleNumber: bill.number,
          purchasedAt: bill.date,
          remainingReturnQuantity: Math.max(0, Number(item.quantity || 0) - alreadyReturned),
          salePrice: Number(item.unitPrice ?? item.price ?? product?.salePrice ?? 0),
        }
      }))
      .filter((item) => item.remainingReturnQuantity > 0)
      .sort((left, right) => String(right.purchasedAt || '').localeCompare(String(left.purchasedAt || '')))
  })()

  useEffect(() => { setItems((current) => refreshCartStock(current, products)) }, [products])

  const clearSale = () => {
    idempotencyRef.current = null
    setItems([])
    setDiscount('')
    setPaymentPromises([])
    setRefundType('cash')
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
    if (item.productType === 'tan') {
      const inCart = items.filter((current) => current.productId === item.productId && !current.isReturn).reduce((sum, current) => sum + Number(current.quantity || 0), 0)
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || inCart + Number(item.quantity) > Number(item.availableQuantity || 0)) {
        setSaleMessage(`Tan quantity must be a whole number and cannot exceed the ${item.availableQuantity || 0} available Tan.`)
        return
      }
    }
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
      [field]: value === '' ? '' : field === 'quantity' ? Math.max(1, item.productType === 'tan' ? Math.min(Number(item.availableQuantity || 0), Math.floor(Number(value) || 1)) : Number(value) || 1) : Math.max(0, Number(value) || 0),
    }))
  }

  const addReturn = ({ code, quantity, condition, originalSaleId, originalSaleLineId }) => {
    const normalizedCode = code.trim().toLowerCase()
    const matchesCode = (item) => [item.code, item.articleNumber, item.id, item.name]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalizedCode)
    const originalSale = bills.find((bill) => bill.id === originalSaleId && bill.customerId === selectedCustomerId)
      || bills.find((bill) => bill.customerId === selectedCustomerId && bill.items?.some(matchesCode))
    const billedItem = originalSale?.items.find((item) => originalSaleLineId
      ? item.lineId === originalSaleLineId
      : matchesCode(item))
    if (!billedItem) {
      setSaleMessage('Item not found.')
      return false
    }
    const amount = returnRefundAmount(originalSale, billedItem, quantity) / quantity
    const returnCondition = condition === 'Return' ? 'sellable' : condition === 'Defective' ? 'damaged' : 'replace'

    setItems((currentItems) => [...currentItems, {
      id: `${Date.now()}-${Math.random()}`,
      name: `Return · ${code} (${condition})`,
      returnCode: code,
      returnLabel: condition,
      returnCondition,
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
    const currentStock = refreshCartStock(items, products)
    const changedPrices = currentStock.filter((item) => item.stockPriceChanged)
    if (changedPrices.length) {
      if (window.confirm('Stock price or tan length changed. Apply current stock prices to the affected cart rows? Review the total and save again.')) setItems(currentStock.map((item) => item.stockPriceChanged ? { ...item, price: item.nextStockPrice, configuredSalePrice: item.nextStockPrice, metersPerTan: item.nextMetersPerTan, stockPriceChanged: false } : item))
      setSaleMessage('Review the updated stock prices and save again.')
      return
    }
    if (currentStock.some((item) => !item.isReturn && !item.originalSaleId && (item.stockUnavailable || currentStock.filter((row) => row.productId === item.productId && !row.isReturn).reduce((sum, row) => sum + Number(row.quantity), 0) > item.availableQuantity))) { setSaleMessage('Some cart items no longer have enough available stock. Update the cart before saving.'); return }
    const invalidChequeDate = ['#sale-cheque-date', '#sale-cheque-due-date'].map((selector) => saleRootRef.current?.querySelector(selector)).find((field) => field && !field.validity.valid)
    if (invalidChequeDate) { invalidChequeDate.reportValidity(); setSaleMessage('Enter cheque dates as a real day/month/year date.'); return }
    const paymentSummary = calculatePaymentSummary(bill.total, payments)
    if (paymentSummary.excessPayment > 0) {
      setSaleMessage(`Payment exceeds bill total by Rs. ${paymentSummary.excessPayment.toLocaleString()}.`)
      return
    }
    if (paymentSummary.bank > 0 && !bankDetails.bankName.trim()) {
      setSaleMessage('Enter a bank name for the bank payment.')
      return
    }
    if (paymentSummary.cheque > 0 && (!chequeDetails.chequeNumber.trim() || !chequeDetails.bankName.trim() || !chequeDetails.chequeDate)) {
      setSaleMessage('Enter cheque number, cheque bank, and cheque date before saving the bill.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
      const promises = validatePaymentPromises(paymentPromises, { customerId: selectedCustomerId, customers, due: paymentSummary.uncoveredBalance })
      const signature = JSON.stringify({ bill, paymentPromises: promises, refundType, payments, chequeDetails, bankDetails, customerId: selectedCustomerId })
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = {
          signature,
          key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        }
      }
      const saved = await onSaveBill({ ...bill, paymentPromises: promises, refundType, idempotencyKey: idempotencyRef.current.key, payments: { ...paymentSummary, bankTransfer: paymentSummary.bank, chequeDetails, bankDetails }, bankDetails, cheque: chequeDetails, due: paymentSummary.uncoveredBalance, paymentDue: chequeDetails.dueDate, previousBalance: Number(selectedCustomer?.balance ?? selectedCustomer?.openingBalance ?? 0), customerId: selectedCustomerId, paidInvoiceNumber, padInvoiceNumber: paidInvoiceNumber, customerPhone: phone, customerAddress: address })
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
      const held = await onHoldBill({ items, discount: normalizedDiscount, total, payments, chequeDetails, bankDetails, paymentMethod, refundType, paymentPromises, customerId: selectedCustomerId, kind })
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
          Draft · {businessDate}
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
          <AddItem products={availableProducts} onAddItem={addItem} onSkipEmptyItem={focusDiscount} />
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
          <section className="rounded-2xl border border-[#e2e6df] bg-white p-4 sm:p-6 shadow-panel" aria-labelledby="payment-promises-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="payment-promises-title" className="text-[#173b32] text-lg font-semibold">Payment promises</h2><p className="mt-1 text-sm text-[#718078]">Schedule expected payments from the selected customer.</p></div>
              <span className="rounded-full bg-[#f1f6ea] px-3 py-1 text-xs font-semibold text-[#557250]">{customers.find((customer) => String(customer.id) === String(selectedCustomerId))?.name || 'No customer selected'}</span>
            </div>
            {!customers.some((customer) => String(customer.id) === String(selectedCustomerId)) && <p className="mt-3 text-xs text-[#718078]">Choose a saved customer to schedule a promise.</p>}
            <div className="mt-4 space-y-3">{paymentPromises.map((promise, index) => <div key={promise.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-xl border border-[#edf0eb] p-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#29443b]">Due date<input type="date" value={promise.dueDate} onChange={(event) => setPaymentPromises((rows) => rows.map((row) => row.id === promise.id ? { ...row, dueDate: event.target.value } : row))} className="h-10 rounded-lg border border-[#dfe4dc] px-3 text-sm" /></label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#29443b]">Promised amount (Rs.)<input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0" value={promise.amount} onChange={(event) => setPaymentPromises((rows) => rows.map((row) => row.id === promise.id ? { ...row, amount: event.target.value } : row))} className="h-10 rounded-lg border border-[#dfe4dc] px-3 text-sm" /></label>
              <button type="button" aria-label={`Remove payment promise ${index + 1}`} onClick={() => setPaymentPromises((rows) => rows.filter((row) => row.id !== promise.id))} className="h-10 rounded-lg border border-[#e2e6df] px-3 text-sm font-semibold text-[#718078] hover:border-red-200 hover:bg-red-50 hover:text-red-700">Remove</button>
            </div>)}</div>
            <button type="button" onClick={() => setPaymentPromises((rows) => [...rows, { id: `promise-${Date.now()}-${Math.random()}`, dueDate: '', amount: '' }])} className="mt-3 h-10 rounded-lg border border-[#155b4b] px-4 text-sm font-semibold text-[#155b4b] hover:bg-[#f1f6ea]">+ Add another payment</button>
          </section>
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
            discount={normalizedDiscount}
            discountInput={discount}
            onDiscountChange={setDiscount}
            paymentPromises={paymentPromises}
            onAddReturn={addReturn} onReturnAdded={focusDiscount}
            refundType={refundType}
            onRefundTypeChange={setRefundType}
            saleSubtotal={saleSubtotal}
            returnTotal={returnTotal}
            onRemoveItem={(id) => setItems((currentItems) => currentItems.filter((item) => item.id !== id))}
            onUpdateItem={updateItem}
            onSaveBill={(bill) => saveBill({ ...bill, paidInvoiceNumber, customerPhone: phone, customerAddress: address })}
            onHoldBill={holdBill}
            onClear={handleClear}
            purchasedItems={customerProducts}
          />
        </div>
      </div>
    </main>
  )
}
