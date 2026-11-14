import { paymentPromiseStates } from '../../data/paymentPromises.js'
import { useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { calculateAccountLedger } from '../../data/businessLogic.js'
import RecoveryAll from './RecoveryAll.jsx'

export default function CustomerKhata({ customers = [], payments = [], accountAdjustments = [], sales = [], returns = [], installments = [], banks = [], businessDate, canEdit = false, canDelete = false, onNewCustomer, onUpdateCustomer, onDeleteCustomer, onPayment, onBalanceAdjustment, onBulkRecovery, onInstallmentPayment, onStatement }) {
  const [query, setQuery] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [paymentCustomer, setPaymentCustomer] = useState(null)
  const [paymentDraft, setPaymentDraft] = useState(null)
  const [adjustingCustomer, setAdjustingCustomer] = useState(null)
  const [adjustmentDraft, setAdjustmentDraft] = useState(null)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const paymentKey = useRef(null)
  const adjustmentKey = useRef(null)
  const displayed = customers.filter((customer) => customer.active !== false && `${customer.name} ${customer.city || ''} ${customer.phone || ''}`.toLowerCase().includes(query.toLowerCase()))
  const amountToReceive = customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance || 0)), 0)
  const advanceBalance = customers.reduce((sum, customer) => sum + Math.max(0, -Number(customer.balance || 0)), 0)
  const netBalance = customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0)
  const stats = [
    ['Total customers', customers.length],
    ['Amount to receive', `Rs. ${amountToReceive.toLocaleString()}`],
    ['Advance balances', `Rs. ${advanceBalance.toLocaleString()}`],
    ['Transactions', payments.length + accountAdjustments.length + sales.length + returns.length],
  ]

  const receivePayment = (customer) => {
    paymentKey.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setPaymentCustomer(customer)
    setPaymentDraft({ amount: '', date: businessDate || new Date().toISOString().slice(0, 10), method: 'cash', bankId: '', bankName: '', accountNumber: '' })
    setModalError('')
  }

  const recordPayment = async (event) => {
    event.preventDefault()
    const amount = Number(paymentDraft.amount)
    if (!Number.isFinite(amount) || amount <= 0) { setModalError('Enter an amount greater than zero.'); return }
    if (amount > Number(paymentCustomer.balance || 0)) { setModalError('Amount cannot exceed the current outstanding balance.'); return }
    if (!paymentDraft.date || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDraft.date)) { setModalError('Choose a valid payment date.'); return }
    const bank = banks.find((entry) => entry.id === paymentDraft.bankId)
    const bankDetails = paymentDraft.method === 'bank' ? { bankName: bank?.name || paymentDraft.bankName.trim(), accountNumber: bank?.accountNumber || paymentDraft.accountNumber.trim(), ...(bank ? { bankAccountId: bank.id } : {}) } : null
    if (paymentDraft.method === 'bank' && !bankDetails.bankName) { setModalError('Select a bank or enter bank details.'); return }
    setSaving(true); setModalError('')
    try {
      const saved = await onPayment?.({ accountId: paymentCustomer.id, amount, date: paymentDraft.date, method: paymentDraft.method, bankDetails, idempotencyKey: paymentKey.current, note: 'Khata recovery' })
      if (!saved) throw new Error('Payment could not be recorded.')
      setMessage(`Rs. ${amount.toLocaleString()} ${paymentDraft.method} recovery recorded for ${paymentCustomer.name}.`)
      setPaymentCustomer(null); setPaymentDraft(null)
    } catch (error) { setModalError(error.message || 'Payment could not be recorded.') }
    finally { setSaving(false) }
  }

  const startAdjustment = (customer) => {
    adjustmentKey.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setAdjustingCustomer(customer)
    setAdjustmentDraft({ amount: '', direction: 'debit', date: businessDate || new Date().toISOString().slice(0, 10), reason: '' })
    setModalError('')
  }

  const recordBalanceAdjustment = async (event) => {
    event.preventDefault()
    const amount = Number(adjustmentDraft.amount)
    if (!Number.isFinite(amount) || amount <= 0) { setModalError('Enter an amount greater than zero.'); return }
    if (!adjustmentDraft.reason.trim()) { setModalError('Explain why you are adding this balance entry.'); return }
    if (!adjustmentDraft.date) { setModalError('Choose a date for this balance entry.'); return }
    setSaving(true); setModalError('')
    try {
      const saved = await onBalanceAdjustment?.({ accountId: adjustingCustomer.id, amount, direction: adjustmentDraft.direction, date: adjustmentDraft.date, reason: adjustmentDraft.reason.trim(), idempotencyKey: adjustmentKey.current })
      if (!saved) throw new Error('Balance entry could not be saved.')
      setMessage(`Balance entry of Rs. ${amount.toLocaleString()} recorded for ${adjustingCustomer.name}.`)
      setAdjustingCustomer(null); setAdjustmentDraft(null)
    } catch (error) { setModalError(error.message || 'Balance entry could not be saved.') }
    finally { setSaving(false) }
  }

  const editCustomer = (customer) => { setEditing(customer); setEditDraft({ name: customer.name || '', phone: customer.phone || '', address: customer.address || '', city: customer.city || '' }); setModalError('') }
  const saveCustomer = async (event) => {
    event.preventDefault()
    if (!editDraft.name.trim()) { setModalError('Customer name is required.'); return }
    setSaving(true); setModalError('')
    try { const saved = await onUpdateCustomer?.(editing.id, editDraft); if (!saved) throw new Error('Customer details could not be saved.'); setEditing(null) }
    catch (error) { setModalError(error.message || 'Customer details could not be saved.') }
    finally { setSaving(false) }
  }

  const ledgerFor = (customer) => calculateAccountLedger({ customers, payments, accountAdjustments, sales, returns }, 'customer', customer.id).entries

  const receiveInstallment = async (plan) => {
    const amount = Number(window.prompt(`Installment amount for ${plan.customer} (Rs.)`, ''))
    if (!Number.isFinite(amount) || amount <= 0) return
    const result = await onInstallmentPayment?.(plan.id, { amount, method: 'cash' })
    if (result) setMessage(`Installment payment recorded for ${plan.customer}.`)
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Customer khata
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            A clear account for every customer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#155b4b] bg-white px-4 text-xs font-semibold text-[#155b4b] sm:text-sm" type="button" onClick={() => window.print()}><Printer size={16} />Print all customers</button>
        <button
          className="h-11 px-4 rounded-xl bg-[#155b4b] text-white text-xs sm:text-sm font-semibold"
          type="button"
          onClick={() => setRecoveryOpen(true)}
        >
          Recovery All
        </button>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={onNewCustomer}
        >
          + New customer
        </button>
        </div>
      </div>

      <section id="customer-khata-all-print" className="hidden print:block">
        <style>{`@page { size: A4 portrait; margin: 12mm; } @media print { body * { visibility: hidden !important; } #customer-khata-all-print, #customer-khata-all-print * { visibility: visible !important; } #customer-khata-all-print { display: block !important; position: absolute; inset: 0; width: 100%; padding: 0; background: white; color: #111; } }`}</style>
        <header className="mb-5 flex items-start justify-between border-b border-gray-300 pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">KataSys · Customer Khata Summary</p><h1 className="mt-1 text-2xl font-bold">All customers</h1><p className="mt-1 text-xs text-gray-500">Printed {new Date().toLocaleString()}</p></div>
          <div className="text-right text-sm"><p>Total customers: <strong>{customers.length.toLocaleString()}</strong></p><p>Total amount to receive: <strong>Rs. {amountToReceive.toLocaleString()}</strong></p><p>Total advance: <strong>Rs. {advanceBalance.toLocaleString()}</strong></p><p>Net balance: <strong>Rs. {netBalance.toLocaleString()}</strong></p></div>
        </header>
        <table className="w-full border-collapse text-left text-[10px]">
          <thead><tr className="border-b-2 border-gray-500"><th className="p-2">Customer</th><th className="p-2">Phone</th><th className="p-2">City</th><th className="p-2 text-right">Due</th><th className="p-2 text-right">Advance</th><th className="p-2 text-right">Net balance</th></tr></thead>
          <tbody>{customers.map((customer) => {
            const balance = Number(customer.balance || 0)
            return <tr key={customer.id} className="border-b border-gray-200"><td className="p-2 font-semibold">{customer.name}</td><td className="p-2">{customer.phone || '—'}</td><td className="p-2">{customer.city || '—'}</td><td className="p-2 text-right">Rs. {Math.max(0, balance).toLocaleString()}</td><td className="p-2 text-right">Rs. {Math.max(0, -balance).toLocaleString()}</td><td className="p-2 text-right">Rs. {balance.toLocaleString()}</td></tr>
          })}</tbody>
          <tfoot><tr className="border-t-2 border-gray-500 font-bold"><td className="p-2" colSpan="3">Total</td><td className="p-2 text-right">Rs. {amountToReceive.toLocaleString()}</td><td className="p-2 text-right">Rs. {advanceBalance.toLocaleString()}</td><td className="p-2 text-right">Rs. {netBalance.toLocaleString()}</td></tr></tfoot>
        </table>
      </section>

      {message && <p className="mb-4 p-3 rounded-lg bg-[#eaf3e7] text-[#155b4b] text-sm" role="status">{message}</p>}
      {recoveryOpen && <RecoveryAll customers={customers} onClose={() => setRecoveryOpen(false)} onSave={async (input) => {
        const saved = await onBulkRecovery?.(input)
        if (saved) setMessage(`Recorded ${input.items.length} cash recovery payment${input.items.length === 1 ? '' : 's'}.`)
        return saved
      }} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
        {stats.map(([label, value]) => (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-1" key={label}>
            <span className="text-xs sm:text-sm font-medium text-[#718078]">{label}</span>
            <strong className="text-lg sm:text-xl lg:text-2xl font-bold text-[#173b32]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Search by name..."
          className="w-full sm:max-w-md h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 shadow-xs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div data-keyboard-list className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {displayed.map((customer) => {
          const balance = Number(customer.balance || 0)
          const initials = customer.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
          const ledger = ledgerFor(customer)
          const promises = paymentPromiseStates({ customers: [customer], sales })

          return (
            <article data-keyboard-row tabIndex={0} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-4" key={customer.id}>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-[#f1ebdd] text-[#173b32] grid place-items-center font-bold text-sm select-none">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="block text-[#173b32] text-base sm:text-lg font-bold truncate">{customer.name}</strong>
                    {customer.phone && <small className="shrink-0 text-[#718078] text-[11px] font-medium">{customer.phone}</small>}
                  </div>
                  <small className="text-[#718078] text-xs truncate block">
                    {customer.city || (!customer.phone ? 'Contact details not provided' : '')}
                  </small>
                </div>
              </div>
              {(canEdit || canDelete) && <div className="flex gap-2">{canEdit && <button type="button" onClick={() => editCustomer(customer)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit details</button>}{canDelete && <button type="button" onClick={async () => { const linked = sales.some((sale) => sale.customerId === customer.id) || payments.some((payment) => payment.customerId === customer.id) || accountAdjustments.some((entry) => entry.customerId === customer.id) || returns.some((entry) => entry.customerId === customer.id) || installments.some((entry) => entry.customerId === customer.id); const action = linked || Number(customer.balance || 0) !== 0 ? 'deactivate and preserve its linked financial history' : 'permanently delete'; if (!window.confirm(`Are you sure you want to ${action} for ${customer.name}?`)) return; try { const result = await onDeleteCustomer?.(customer.id); if (result?.deactivated) setMessage(`${customer.name} was deactivated. Linked history was retained.`) } catch (error) { setMessage(error.message || 'Customer could not be removed.') } }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>}</div>}

              <div className="p-3.5 rounded-xl bg-[#fafbf8] border border-[#edf0eb] flex justify-between items-center">
                <span className="text-xs font-semibold text-[#718078]">Balance</span>
                <div className="text-right">
                  <strong className={`block text-lg sm:text-xl font-bold ${balance > 0 ? 'text-red-700' : 'text-[#155b4b]'}`}>
                    Rs. {Math.abs(balance).toLocaleString()}
                  </strong>
                  <span className="text-[11px] text-[#718078] font-medium">
                    {balance < 0 ? 'Advance · Jama hai' : balance > 0 ? 'To receive · Lena hai' : 'Settled'}
                  </span>
                </div>
              </div>

              {balance > 0 && (
                <button
                  type="button"
                  className="w-full h-10 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
                  onClick={() => receivePayment(customer)}
                >
                  Record cash received
                </button>
              )}

              {canEdit && <button type="button" onClick={() => startAdjustment(customer)} className="w-full h-9 rounded-lg border border-[#dfe4dc] text-xs font-semibold text-[#155b4b] hover:bg-[#f7faf5]">Add balance entry</button>}

              <button type="button" data-keyboard-primary onClick={() => onStatement?.(customer.id)} className="w-full h-9 rounded-lg border border-[#dfe4dc] text-xs font-semibold text-[#173b32]">View / print statement</button>

              {promises.length > 0 && <div className="mt-3 text-sm"><strong>Payment promises (not payments)</strong>{promises.map((promise) => <p key={promise.id}>{promise.saleNumber} · {promise.dueDate} · Rs. {Number(promise.amount).toLocaleString()} · {promise.status}</p>)}</div>}
              <details className="mt-auto group">
                <summary className="text-xs sm:text-sm font-semibold text-[#173b32] cursor-pointer select-none">
                  Account ledger ({ledger.length})
                </summary>
                <div className="mt-3 divide-y divide-[#edf0eb] max-h-48 overflow-y-auto pr-1 text-xs">
                  {ledger.length ? (
                    ledger.map((entry) => (
                      <div key={entry.id} className="py-2 flex justify-between items-center gap-3 text-[#12332d]">
                        <span>{entry.date || '-'} · {entry.title}{entry.reason && <small className="mt-0.5 block text-[#718078]">{entry.reason}</small>}</span>
                        <strong className={entry.direction === 'credit' ? 'text-[#155b4b]' : 'text-red-700'}>
                          {entry.direction === 'credit' ? '− ' : entry.direction === 'debit' ? '+ ' : ''}
                          Rs. {Number(entry.amount || 0).toLocaleString()}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-[#718078]">No transactions recorded.</p>
                  )}
                </div>
              </details>
            </article>
          )
        })}
      </div>
      {installments.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[#173b32] text-xl font-bold mb-3">Installment plans</h2>
          <div className="overflow-x-auto rounded-xl border border-[#e2e6df] bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-[#f7faf5] text-[#718078] text-xs uppercase"><tr><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Next due</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
              {installments.map((plan) => <tr key={plan.id} data-keyboard-row tabIndex={0}><td className="p-3 font-semibold">{plan.customer}</td><td className="p-3">Rs. {Number(plan.totalAmount).toLocaleString()}</td><td className="p-3">Rs. {Number(plan.paidAmount).toLocaleString()}</td><td className="p-3">{plan.schedule?.find((entry) => entry.status !== 'paid')?.dueDate || '—'}</td><td className="p-3">{plan.status}</td><td className="p-3 text-right">{plan.status !== 'completed' && <button type="button" data-keyboard-primary onClick={() => receiveInstallment(plan)} className="px-3 py-1.5 rounded-lg bg-[#155b4b] text-white text-xs font-semibold">Receive payment</button>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {(editing || paymentCustomer || adjustingCustomer) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
          <form onSubmit={editing ? saveCustomer : paymentCustomer ? recordPayment : recordBalanceAdjustment} role="dialog" aria-modal="true" aria-labelledby="khata-modal-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <div>
              <h2 id="khata-modal-title" className="text-xl font-bold text-[#173b32]">{editing ? `Edit ${editing.name}` : paymentCustomer ? `Record cash received from ${paymentCustomer.name}` : `Add balance entry for ${adjustingCustomer.name}`}</h2>
              {paymentCustomer && <p className="mt-1 text-sm">Outstanding balance: Rs. {Number(paymentCustomer.balance || 0).toLocaleString()}</p>}
            </div>
            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[['name','Name'],['phone','Phone'],['city','City'],['address','Address']].map(([key,label]) => <label key={key} className="grid gap-1 text-sm font-semibold">{label}<input required={key==='name'} value={editDraft[key]} onChange={(event)=>setEditDraft((current)=>({...current,[key]:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>)}
                <p className="sm:col-span-2 text-xs text-[#718078]">Account balance is calculated from sales, returns and received payments. Add a dated balance entry with a reason to correct it.</p>
              </div>
            ) : paymentCustomer ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">Amount received (Rs.)<input type="number" min="0.01" step="0.01" required autoFocus value={paymentDraft.amount} onChange={(event)=>setPaymentDraft((current)=>({...current,amount:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold">Payment date<input type="date" required value={paymentDraft.date} onChange={(event)=>setPaymentDraft((current)=>({...current,date:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Payment method<select value={paymentDraft.method} onChange={(event)=>setPaymentDraft((current)=>({...current,method:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal"><option value="cash">Cash</option><option value="bank">Bank</option></select></label>
                {paymentDraft.method==='bank' && <><label className="grid gap-1 text-sm font-semibold sm:col-span-2">Bank account<select value={paymentDraft.bankId} onChange={(event)=>setPaymentDraft((current)=>({...current,bankId:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal"><option value="">{banks.length ? 'Select bank or enter details' : 'Enter bank details below'}</option>{banks.map((bank)=><option value={bank.id} key={bank.id}>{bank.name}</option>)}</select></label>{!paymentDraft.bankId && <label className="grid gap-1 text-sm font-semibold">Bank name<input value={paymentDraft.bankName} onChange={(event)=>setPaymentDraft((current)=>({...current,bankName:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>}{!paymentDraft.bankId && <label className="grid gap-1 text-sm font-semibold">Account number<input value={paymentDraft.accountNumber} onChange={(event)=>setPaymentDraft((current)=>({...current,accountNumber:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>}</>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">Amount (Rs.)<input type="number" min="0.01" step="0.01" required autoFocus value={adjustmentDraft.amount} onChange={(event)=>setAdjustmentDraft((current)=>({...current,amount:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold">Entry date<input type="date" required value={adjustmentDraft.date} onChange={(event)=>setAdjustmentDraft((current)=>({...current,date:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal" /></label>
                <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Balance effect<select value={adjustmentDraft.direction} onChange={(event)=>setAdjustmentDraft((current)=>({...current,direction:event.target.value}))} className="h-10 rounded-lg border px-3 font-normal"><option value="debit">Add to amount due</option><option value="credit">Reduce amount due / add advance</option></select></label>
                <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Why are you adding this?<textarea required rows="3" value={adjustmentDraft.reason} onChange={(event)=>setAdjustmentDraft((current)=>({...current,reason:event.target.value}))} placeholder="Write a short explanation for the customer ledger" className="rounded-lg border px-3 py-2 font-normal" /></label>
              </div>
            )}
            {modalError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={()=>{setEditing(null);setPaymentCustomer(null);setAdjustingCustomer(null)}} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-[#155b4b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save customer' : paymentCustomer ? 'Record payment' : 'Save balance entry'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
