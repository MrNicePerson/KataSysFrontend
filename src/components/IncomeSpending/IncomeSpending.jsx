import { calculateBusinessTotals } from '../../data/businessLogic.js'

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`

export default function IncomeSpending({ database }) {
  const totals = calculateBusinessTotals(database)
  const rows = [
    ['Gross billed', money(totals.grossBilled)],
    ['Discounts', money(-totals.discounts)],
    ['Returns on later return entries', money(-totals.separateReturnAmount)],
    ['Returns applied on bills', money(-totals.billReturnAdjustments)],
    ['Estimated cost of goods', money(-totals.costOfGoods)],
    ['Shop expenses', money(-totals.expenses)],
    ['Estimated net result', money(totals.estimatedNetResult)],
  ]

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
        Income &amp; spending
      </h2>
      <div className="space-y-3">
        {rows.map(([label, value], index) => {
          const isNet = index === rows.length - 1
          return (
            <div
              key={label}
              className={`flex justify-between items-center text-xs sm:text-sm ${
                isNet
                  ? 'pt-3 border-t border-[#e2e6df] font-bold text-[#173b32] text-sm sm:text-base'
                  : 'text-[#29443b]'
              }`}
            >
              <span>{label}</span>
              <strong className={isNet ? 'text-[#155b4b] text-base sm:text-lg' : ''}>{value}</strong>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-[#718078] pt-2 border-t border-[#edf0eb]">
        Estimated from recorded sales, bill discounts, returns and expenses.
      </p>
    </section>
  )
}
