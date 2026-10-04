import { calculateBusinessTotals } from '../../data/businessLogic.js'

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`

export default function ReportStats({ database }) {
  const totals = calculateBusinessTotals(database)
  const stats = [
    ['Net sales', money(totals.netSales)],
    ['Estimated gross profit', money(totals.estimatedGrossProfit)],
    ['Customer receivables', money(database.customers.reduce((sum, entry) => sum + Math.max(0, Number(entry.balance || 0)), 0))],
    ['Supplier payables', money(database.suppliers.reduce((sum, entry) => sum + Math.max(0, Number(entry.balance || 0)), 0))],
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
      {stats.map(([label, value]) => (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-1" key={label}>
          <span className="text-xs sm:text-sm font-medium text-[#718078]">{label}</span>
          <strong className="text-lg sm:text-xl lg:text-2xl font-bold text-[#173b32]">{value}</strong>
        </div>
      ))}
    </div>
  )
}
