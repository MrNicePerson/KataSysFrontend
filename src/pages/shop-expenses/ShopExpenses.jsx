import { useState } from 'react'
import FormDialog from '../../components/FormDialog/FormDialog.jsx'
import { localDateString } from '../../data/businessLogic.js'

export default function ShopExpenses({ expenses = [], financeEntries = [], onCreate }) {
  const entries = [...expenses, ...financeEntries]
  const [isAddingExpense, setAddingExpense] = useState(false)
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const withdrawals = entries.filter((entry) => entry.category === 'Personal withdrawal').reduce((sum, entry) => sum + entry.amount, 0)
  const cashExpenses = entries.filter((entry) => entry.method === 'cash').reduce((sum, entry) => sum + entry.amount, 0)
  const stats = [
    ['Expenses & finance', `Rs. ${total.toLocaleString()}`],
    ['Personal withdrawals', `Rs. ${withdrawals.toLocaleString()}`],
    ['Cash expenses', `Rs. ${cashExpenses.toLocaleString()}`],
    ['Entries', entries.length.toString()],
  ]

  const addExpense = async (expense) => {
    const created = await onCreate?.({ ...expense, method: String(expense.method).toLowerCase() })
    if (!created) return null
    setAddingExpense(false)
    return created
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Shop expenses
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Daily expenses and personal withdrawals in one simple list.
          </p>
        </div>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={() => setAddingExpense(true)}
        >
          + Add expense
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
        {stats.map(([label, value]) => (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-1" key={label}>
            <span className="text-xs sm:text-sm font-medium text-[#718078]">{label}</span>
            <strong className="text-lg sm:text-xl lg:text-2xl font-bold text-[#173b32]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[650px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Date</th>
              <th className="px-4 sm:px-6 py-3.5">Category</th>
              <th className="px-4 sm:px-6 py-3.5">Paid to</th>
              <th className="px-4 sm:px-6 py-3.5">Description</th>
              <th className="px-4 sm:px-6 py-3.5">Method</th>
              <th className="px-4 sm:px-6 py-3.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0eb]">
            {entries.length ? (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#f8faf7]">
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.date}</td>
                  <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">{entry.category || entry.type}</td>
                  <td className="px-4 sm:px-6 py-4 font-medium">{entry.paidTo || '—'}</td>
                  <td className="px-4 sm:px-6 py-4 text-[#718078]">{entry.description || '—'}</td>
                  <td className="px-4 sm:px-6 py-4 capitalize">{entry.method}</td>
                  <td className="px-4 sm:px-6 py-4 text-right font-bold text-[#155b4b]">
                    Rs. {entry.amount.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 sm:px-6 py-8 text-center text-[#718078]">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddingExpense && (
        <FormDialog
          title="Add expense"
          fields={[
            { name: 'date', label: 'Date', type: 'date', defaultValue: localDateString() },
            {
              name: 'type',
              label: 'Entry type',
              options: [
                { value: 'expense', label: 'Shop expense' },
                { value: 'drawing', label: 'Personal drawing' },
                { value: 'family-drawing', label: 'Family drawing' },
                { value: 'capital', label: 'Capital' },
                { value: 'transfer', label: 'Account transfer' },
              ],
            },
            {
              name: 'category',
              label: 'Category',
              options: [
                { value: 'Shop expense', label: 'Shop expense' },
                { value: 'Personal withdrawal', label: 'Personal withdrawal' },
                { value: 'Utilities', label: 'Utilities' },
              ],
            },
            { name: 'paidTo', label: 'Paid to', required: false },
            {
              name: 'method',
              label: 'Payment method',
              options: [
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank transfer' },
              ],
            },
            { name: 'amount', label: 'Amount', type: 'number', min: '1' },
            { name: 'description', label: 'Description', required: false },
            { name: 'fromAccount', label: 'From account (transfers)', required: false },
            { name: 'toAccount', label: 'To account (transfers)', required: false },
          ]}
          onClose={() => setAddingExpense(false)}
          onSave={addExpense}
        />
      )}
    </main>
  )
}
