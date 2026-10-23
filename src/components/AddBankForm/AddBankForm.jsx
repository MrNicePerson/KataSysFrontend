import { useState } from 'react'
import { BANK_OPTIONS } from '../Payment/Payment.jsx'

const bankNames = BANK_OPTIONS.map((bank) => bank.name)

export default function AddBankForm({ onAddBank }) {
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (saving || !bankNames.includes(name)) return
    setSaving(true)
    setError('')
    try {
      const saved = await onAddBank({ name: name.trim(), openingBalance: Number(balance) })
      if (saved) { setName(''); setBalance('0') }
    } catch (issue) {
      setError(issue.message || 'Could not add bank account.')
    } finally { setSaving(false) }
  }

  return <form onSubmit={submit} className="mt-4 rounded-xl border border-[#e4eae5] bg-[#fbfdfb] p-4">
    <p className="text-sm font-semibold text-[#31473c] mb-3">Add bank or wallet</p>
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex-1 min-w-[200px] text-xs font-semibold text-[#52645c]">Bank / wallet
        <select value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 block w-full h-10 px-3 rounded-lg border border-[#dfe6df] bg-white text-sm">
          <option value="">Choose a bank or wallet</option>
          {bankNames.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#52645c]">Opening balance (Rs.)
        <input type="number" min="0" step="0.01" required value={balance} onChange={(event) => setBalance(event.target.value)} className="mt-1 block w-40 h-10 px-3 rounded-lg border border-[#dfe6df] bg-white text-sm" />
      </label>
      <button type="submit" disabled={saving || !name.trim() || !onAddBank} className="h-10 px-4 rounded-lg bg-[#155b4b] text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Adding…' : '+ Add bank'}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </form>
}
