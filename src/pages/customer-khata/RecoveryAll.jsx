import { useEffect, useRef, useState } from 'react'
import { localDateString } from '../../data/businessLogic.js'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'
import { focusNextRecoveryField, normalizeRecoveryAmount, recoveryLines } from './recoveryAmount.js'

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`

export default function RecoveryAll({ customers, onClose, onSave }) {
  const [amounts, setAmounts] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const keyboard = useKeyboardScope({ onEscape: () => { if (!savingRef.current) onClose() }, trapFocus: true })
  const recoverable = customers.filter((customer) => Number(customer.balance || 0) > 0)
  const totalBalance = recoverable.reduce((sum, customer) => sum + Number(customer.balance), 0)
  const lines = recoveryLines(recoverable, amounts)
  const totalRecovery = lines.reduce((sum, line) => sum + line.amount, 0)
  const invalid = recoverable.some((customer) => Number(amounts[customer.id] || 0) > Number(customer.balance))

  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('[data-recovery-amount]')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])

  const nextRecovery = (event) => focusNextRecoveryField(event, keyboard.ref.current)

  const submit = async (event) => {
    event.preventDefault()
    if (savingRef.current) return
    if (invalid) return setError('A cash recovery exceeds the customer outstanding balance.')
    if (!lines.length) return setError('Enter a cash recovery for at least one customer.')
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const saved = await onSave({ items: lines, method: 'cash', date: localDateString() })
      if (saved) onClose()
      else setError('Could not save the recoveries. Please review the amounts and try again.')
    } catch (issue) {
      setError(issue.message || 'Could not save the recoveries.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 bg-[#203832]/40 flex items-center justify-center p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingRef.current) onClose() }}>
    <section ref={keyboard.ref} onKeyDown={keyboard.onKeyDown} role="dialog" aria-modal="true" aria-label="Recovery All" className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#e2e6df] bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#e2e6df] bg-white px-4 py-4 sm:px-6">
        <div><h2 className="text-xl font-bold text-[#173b32]">Recovery All</h2><p className="text-xs text-[#718078]">Cash recovery for multiple customers in one save.</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close Recovery All" className="h-9 w-9 rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] disabled:opacity-50">×</button>
      </header>
      <form onSubmit={submit} className="p-4 sm:p-6">
        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-4 border-b border-[#e2e6df] pb-2 text-xs font-bold uppercase text-[#718078] sm:grid">
          <span>Customer</span><span>Current balance</span><span>Cash recovery</span><span>Remaining balance</span>
        </div>
        <div className="divide-y divide-[#edf0eb]">
          {customers.map((customer) => {
            const balance = Number(customer.balance || 0)
            const amount = Number(amounts[customer.id] || 0)
            const canRecover = balance > 0
            return <div key={customer.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] sm:items-center sm:gap-4">
              <strong className="text-sm text-[#173b32]">{customer.name}</strong>
              <div><span className="block text-xs text-[#718078] sm:hidden">Current balance</span><span className="text-sm text-[#29443b]">{money(balance)}{balance < 0 ? ' advance' : ''}</span></div>
              <div>
                <label className="block text-xs text-[#718078] sm:sr-only" htmlFor={`recovery-${customer.id}`}>Cash recovery for {customer.name}</label>
                <input id={`recovery-${customer.id}`} data-recovery-amount={canRecover ? '' : undefined} data-keyboard-native type="number" inputMode="decimal" min="0" max={canRecover ? balance : 0} step="0.01" disabled={!canRecover} value={amounts[customer.id] ?? '0'} onFocus={() => setAmounts((current) => Number(current[customer.id] ?? 0) === 0 ? { ...current, [customer.id]: '' } : current)} onBlur={() => setAmounts((current) => current[customer.id] === '' ? { ...current, [customer.id]: '0' } : current)} onChange={(event) => setAmounts((current) => ({ ...current, [customer.id]: normalizeRecoveryAmount(event.target.value) }))} onKeyDown={nextRecovery} className="h-10 w-full rounded-lg border border-[#dfe4dc] bg-white px-3 text-sm text-[#173b32] disabled:bg-[#f6f8f1] disabled:text-[#9aa69e]" />
              </div>
              <div><span className="block text-xs text-[#718078] sm:hidden">Remaining balance</span><span className={`text-sm font-semibold ${amount > balance && canRecover ? 'text-red-700' : 'text-[#155b4b]'}`}>{canRecover ? money(balance - amount) : balance < 0 ? 'Advance · no recovery' : 'Settled · no recovery'}</span></div>
            </div>
          })}
          {!customers.length && <p className="py-6 text-sm text-[#718078]">No customers recorded yet.</p>}
        </div>
        <div className="mt-4 grid gap-2 rounded-xl border border-[#e2e6df] bg-[#f7faf5] p-4 text-sm font-semibold text-[#173b32] sm:grid-cols-3 sm:gap-4">
          <div><span className="block text-xs text-[#718078]">Total Current Recoverable Balance</span>{money(totalBalance)}</div>
          <div><span className="block text-xs text-[#718078]">Total Cash Recovery Entered</span>{money(totalRecovery)}</div>
          <div><span className="block text-xs text-[#718078]">Total Remaining Balance</span>{money(totalBalance - totalRecovery)}</div>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving || invalid || !lines.length} className="h-11 rounded-xl bg-[#155b4b] px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save All Recoveries'}</button>
        </div>
      </form>
    </section>
  </div>
}
