import { useEffect, useState } from 'react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function OldItemReturn({ suppliers, onAdd, onClose }) {
  const [values, setValues] = useState({ name: '', code: '', quantity: '', returnValue: '', purchaseCost: '', supplierId: '', returnCondition: 'sellable', reason: '' })
  const [error, setError] = useState('')
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('input')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const change = (key, value) => setValues((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!values.name.trim() || !values.code.trim() || !suppliers.some((supplier) => supplier.id === values.supplierId)) return setError('Enter the item name, article code and supplier.')
    if (!Number.isSafeInteger(Number(values.quantity)) || Number(values.quantity) <= 0) return setError('Quantity must be a positive whole number.')
    if (!Number.isFinite(Number(values.returnValue)) || Number(values.returnValue) <= 0) return setError('Return value must be a positive amount.')
    if (values.purchaseCost === '' || !Number.isFinite(Number(values.purchaseCost)) || Number(values.purchaseCost) < 0) return setError('Enter the stock valuation cost, or explicitly enter zero.')
    onAdd({ ...values, name: values.name.trim(), code: values.code.trim(), quantity: Number(values.quantity), returnValue: Number(values.returnValue), purchaseCost: Number(values.purchaseCost),
      id: crypto.randomUUID(), isReturn: true, oldItemReturn: true, returnCode: values.code.trim(), price: -Number(values.returnValue), returnQuantity: Number(values.quantity) })
    onClose()
  }
  const inputClass = 'w-full rounded-lg border border-[#dfe4dc] bg-white p-2 text-sm'
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-labelledby="old-return-title" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between"><h2 id="old-return-title" className="text-lg font-bold">Return old item</h2><button type="button" aria-label="Close old item return" onClick={onClose}>Close</button></div>
      <p className="my-3 text-sm text-gray-600">For items sold before KataSys. A separate return batch preserves the supplier and source.</p>
      <form onSubmit={submit} className="space-y-3">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {[
          ['name', 'Item name / brand', 'text'], ['code', 'Article / item code', 'text'],
          ['quantity', 'Quantity', 'number'], ['returnValue', 'Return value per item (customer credit)', 'number'],
          ['purchaseCost', 'Stock valuation cost per item (separate from credit; zero allowed)', 'number'],
        ].map(([key, label, type]) => <label key={key} className="block text-sm font-medium">{label}<input className={inputClass} required type={type} min={key === 'quantity' ? 1 : key === 'returnValue' ? 0.01 : 0} step={key === 'quantity' ? 1 : 0.01} value={values[key]} onChange={(event) => change(key, event.target.value)} /></label>)}
        <label className="block text-sm font-medium">Supplier<select required className={inputClass} value={values.supplierId} onChange={(event) => change('supplierId', event.target.value)}><option value="">Choose supplier</option>{suppliers.filter((supplier) => supplier.active !== false).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Condition<select className={inputClass} value={values.returnCondition} onChange={(event) => change('returnCondition', event.target.value)}><option value="sellable">Return</option><option value="replace">Replace</option><option value="damaged">Defective</option></select></label>
        <label className="block text-sm font-medium">Reason / notes<input className={inputClass} value={values.reason} onChange={(event) => change('reason', event.target.value)} /></label>
        <p className="font-semibold" aria-live="polite">Total customer credit: Rs. {((Number(values.quantity) || 0) * (Number(values.returnValue) || 0)).toLocaleString()}</p>
        <button type="submit" className="w-full rounded-lg bg-[#155b4b] p-3 font-semibold text-white">Add old return to bill</button>
      </form>
    </section>
  </div>
}
