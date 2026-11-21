import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function OldItemReturn({ suppliers, onAdd, onClose }) {
  const [values, setValues] = useState({ name: '', code: '', quantity: '', returnValue: '', purchaseCost: '', supplierId: '', returnCondition: 'sellable', reason: '' })
  const [error, setError] = useState('')
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  const selectedSupplier = suppliers.find((supplier) => supplier.id === values.supplierId)
  const batchNumber = selectedSupplier?.supplierCode ? `${String(selectedSupplier.supplierCode).trim().toUpperCase()}000000` : ''
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('input')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const change = (key, value) => setValues((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!values.name.trim() || !values.code.trim() || !selectedSupplier) return setError('Enter the item name, article code and supplier.')
    if (!batchNumber) return setError('Add a supplier code to this supplier before recording the return.')
    if (!Number.isSafeInteger(Number(values.quantity)) || Number(values.quantity) <= 0) return setError('Quantity must be a positive whole number.')
    if (!Number.isFinite(Number(values.returnValue)) || Number(values.returnValue) <= 0) return setError('Return value must be a positive amount.')
    if (values.purchaseCost === '' || !Number.isFinite(Number(values.purchaseCost)) || Number(values.purchaseCost) < 0) return setError('Enter the stock valuation cost, or explicitly enter zero.')
    onAdd({ ...values, name: values.name.trim(), code: values.code.trim(), batchNumber, quantity: Number(values.quantity), returnValue: Number(values.returnValue), purchaseCost: Number(values.purchaseCost),
      id: crypto.randomUUID(), isReturn: true, oldItemReturn: true, returnCode: values.code.trim(), price: -Number(values.returnValue), returnQuantity: Number(values.quantity) })
    onClose()
  }
  const inputClass = 'mt-1 h-10 w-full rounded-lg border border-[#dfe4dc] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#155b4b]'
  return createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-3 sm:p-4">
    <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-labelledby="old-return-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
      <div className="flex items-center justify-between gap-4"><h2 id="old-return-title" className="text-lg font-bold">Return old item</h2><button type="button" aria-label="Close old item return" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dfe4dc] text-[#173b32] hover:bg-[#f1f6ea]"><X size={20} aria-hidden="true" /></button></div>
      <p className="mb-3 text-sm text-gray-600">For items sold before KataSys. Enter the item and return details below.</p>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
        {[
          ['name', 'Item name / brand', 'text'], ['code', 'Article / item code', 'text'],
          ['quantity', 'Quantity', 'number'], ['returnValue', 'Return value per item (customer credit)', 'number'],
          ['purchaseCost', 'Stock valuation cost per item (Rs.)', 'number'],
        ].map(([key, label, type]) => <label key={key} className="block text-sm font-medium">{label}<input className={inputClass} required type={type} min={key === 'quantity' ? 1 : key === 'returnValue' ? 0.01 : 0} step={key === 'quantity' ? 1 : 0.01} value={values[key]} onChange={(event) => change(key, event.target.value)} /></label>)}
        <label className="block text-sm font-medium">Supplier<select required className={inputClass} value={values.supplierId} onChange={(event) => { change('supplierId', event.target.value); setError('') }}><option value="">Choose supplier</option>{suppliers.filter((supplier) => supplier.active !== false).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Return batch number<input className={`${inputClass} bg-[#f7faf5]`} value={batchNumber} readOnly placeholder="Select a supplier with a supplier code" /></label>
        <label className="block text-sm font-medium">Condition<select className={inputClass} value={values.returnCondition} onChange={(event) => change('returnCondition', event.target.value)}><option value="sellable">Return</option><option value="replace">Replace</option><option value="damaged">Defective</option></select></label>
        <label className="block text-sm font-medium">Reason / notes<input className={inputClass} value={values.reason} onChange={(event) => change('reason', event.target.value)} /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e6df] pt-3 sm:col-span-2">
          <p className="text-sm font-semibold" aria-live="polite">Total customer credit: Rs. {((Number(values.quantity) || 0) * (Number(values.returnValue) || 0)).toLocaleString()}</p>
          <button type="submit" className="rounded-lg bg-[#155b4b] px-5 py-2.5 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#155b4b] focus:ring-offset-2">Add old return to bill</button>
        </div>
      </form>
    </section>
  </div>, document.body)
}
