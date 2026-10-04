import { useEffect, useState } from 'react'
import { apiRequest } from '../../api/client.js'
import ReportStats from '../../components/ReportStats/ReportStats.jsx'
import SalesBySupplier from '../../components/SalesBySupplier/SalesBySupplier.jsx'
import IncomeSpending from '../../components/IncomeSpending/IncomeSpending.jsx'
import StockMovements from '../../components/StockMovements/StockMovements.jsx'
import { localDateString } from '../../data/businessLogic.js'

export default function Reports({ bills = [], database, token }) {
  const [audit, setAudit] = useState(null)
  const [auditError, setAuditError] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const today = localDateString()
  const monthStart = `${today.slice(0, 7)}-01`
  const weekStartDate = new Date(`${today}T00:00:00`)
  weekStartDate.setDate(weekStartDate.getDate() - 6)
  const weekStart = localDateString(weekStartDate)
  const from = period === 'daily' ? today : period === 'weekly' ? weekStart : period === 'monthly' ? monthStart : customFrom
  const to = period === 'custom' ? customTo : today
  const datedCollections = new Set(['sales', 'purchases', 'expenses', 'payments', 'returns', 'supplierReturns', 'stockMovements', 'financeEntries', 'cheques', 'claims', 'dailyClosings'])
  const inRange = (entry) => {
    const date = String(entry.date || entry.issued || '').slice(0, 10)
    return (!from || date >= from) && (!to || date <= to)
  }
  const reportDatabase = Object.fromEntries(Object.entries(database).map(([key, value]) => [
    key,
    datedCollections.has(key) && Array.isArray(value) ? value.filter(inRange) : value,
  ]))
  const reportBills = reportDatabase.sales || bills

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest('reports/stock-audit', { token }),
      apiRequest('reports/account-audit', { token }),
    ]).then(([stock, accounts]) => {
      if (active) setAudit({ stock, accounts })
    }).catch((error) => {
      if (active) setAuditError(error.message)
    })
    return () => { active = false }
  }, [token])

  const exportSales = () => {
    const rows = [['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Due'], ...reportBills.map((bill) => [bill.number, bill.date, bill.customer, bill.total, bill.paid, bill.due])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'kapra-khata-sales.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Business reports
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            A clear picture of how the shop is doing.
          </p>
        </div>
        <button
          type="button"
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          onClick={exportSales}
        >
          Export sales CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <label className="text-xs font-semibold text-[#52645c]">Period
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="ml-2 h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm">
            <option value="daily">Today</option>
            <option value="weekly">Last 7 days</option>
            <option value="monthly">This month</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {period === 'custom' && <>
          <label className="text-xs font-semibold text-[#52645c]">From<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="ml-2 h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm" /></label>
          <label className="text-xs font-semibold text-[#52645c]">To<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="ml-2 h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm" /></label>
        </>}
        <span className="text-xs text-[#718078]">{from || 'All dates'} to {to || 'Today'}</span>
      </div>

      <ReportStats database={reportDatabase} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        <SalesBySupplier database={reportDatabase} />
        <IncomeSpending database={reportDatabase} />
      </div>

      <StockMovements movements={reportDatabase.stockMovements} products={database.products} purchases={database.purchases} supplierReturns={database.supplierReturns} />
      {auditError && <p className="mt-4 text-sm text-red-700" role="alert">Audit data could not be loaded: {auditError}</p>}
      {audit && <div className="mt-6 space-y-6">
        <section className="overflow-x-auto rounded-xl border border-[#e2e6df] bg-white">
          <h2 className="p-4 text-lg font-bold text-[#173b32]">Stock audit</h2>
          <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
            <thead className="bg-[#f7faf5] text-[#718078] text-[11px] uppercase"><tr><th className="p-3">Product / batch</th><th className="p-3">Rack</th><th className="p-3">On hand</th><th className="p-3">Available</th><th className="p-3">Reserved</th><th className="p-3">Defective</th><th className="p-3">Stock value</th></tr></thead>
            <tbody className="divide-y divide-[#edf0eb]">{audit.stock.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.name} · {item.batchNumber || 'No batch'}</td><td className="p-3">{item.rackLocation || '—'}</td><td className="p-3">{item.stockQuantity}</td><td className="p-3">{item.available}</td><td className="p-3">{item.reserved}</td><td className="p-3">{item.defective}</td><td className="p-3">Rs. {Number(item.stockValue).toLocaleString()}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="overflow-x-auto rounded-xl border border-[#e2e6df] bg-white">
          <h2 className="p-4 text-lg font-bold text-[#173b32]">Account balance audit</h2>
          <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
            <thead className="bg-[#f7faf5] text-[#718078] text-[11px] uppercase"><tr><th className="p-3">Account</th><th className="p-3">Stored balance</th><th className="p-3">Ledger balance</th><th className="p-3">Difference</th></tr></thead>
            <tbody className="divide-y divide-[#edf0eb]">{[...audit.accounts.customers.map((account) => ({ ...account, type: 'Customer' })), ...audit.accounts.suppliers.map((account) => ({ ...account, type: 'Supplier' }))].map((account) => {
              const difference = Number(account.storedBalance || 0) - Number(account.calculatedBalance || 0)
              return <tr key={`${account.type}-${account.id}`}><td className="p-3 font-semibold">{account.type} · {account.name}</td><td className="p-3">Rs. {Number(account.storedBalance || 0).toLocaleString()}</td><td className="p-3">Rs. {Number(account.calculatedBalance || 0).toLocaleString()}</td><td className={`p-3 font-semibold ${Math.abs(difference) > 0.01 ? 'text-red-700' : 'text-[#155b4b]'}`}>Rs. {difference.toLocaleString()}</td></tr>
            })}</tbody>
          </table>
        </section>
      </div>}
    </main>
  )
}
