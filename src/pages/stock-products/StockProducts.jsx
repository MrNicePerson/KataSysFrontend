import { useMemo, useState } from 'react'
import StockStats from '../../components/StockStats/StockStats.jsx'
import StockTools from '../../components/StockTools/StockTools.jsx'
import StockTable from '../../components/StockTable/StockTable.jsx'
import { receivingForProduct } from '../../data/receivingTrace.js'

export default function StockProducts({ products: records = [], purchases = [], suppliers = [], onReceiveStock, onAdjust, onUpdate }) {
  const [query, setQuery] = useState('')
  const products = useMemo(() => records.map((p) => ({ ...p, colour: p.shade || '', supplier: suppliers.find((s) => s.id === p.supplierId)?.name || '—', receiving: receivingForProduct(p, purchases), supplierRecord: suppliers.find((s) => s.id === p.supplierId), batch: p.batchNumber || '—', location: p.rackLocation || '—', available: String(Number(p.stockQuantity || 0) - Number(p.reservedQuantity || 0)), reserved: String(p.reservedQuantity || 0), defective: String(p.defectiveQuantity || 0), cost: `Rs. ${Number(p.averageCost || 0).toLocaleString()}`, sale: `Sale Rs. ${Number(p.salePrice || 0).toLocaleString()}`, tone: 'blue' })), [records, purchases, suppliers])
  const total = (key) => products.reduce((sum, p) => sum + Number(p[key] || 0), 0)
  const stats = [['Available suits', total('available').toLocaleString()], ['Reserved', total('reservedQuantity').toLocaleString()], ['Defective / quarantine', total('defectiveQuantity').toLocaleString()], ['Stock value', `Rs. ${products.reduce((sum, p) => sum + Number(p.stockQuantity || 0) * Number(p.averageCost || 0), 0).toLocaleString()}`]]
  const filtered = products.filter((product) => Object.values(product).join(' ').toLowerCase().includes(query.toLowerCase()))

  return (
    <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <p className="text-[#70847b] text-xs sm:text-[13px] font-bold tracking-[3px] uppercase mb-1">
            YOUR WHOLESALE WORKSPACE
          </p>
          <h1 className="text-[#173b32] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Stock &amp; products
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#718078]">
            Every suit, colour and batch in one place.
          </p>
        </div>
        <button
          className="h-11 sm:h-12 px-5 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-98"
          type="button"
          onClick={onReceiveStock}
        >
          + Receive stock
        </button>
      </div>

      <StockStats stats={stats} />
      <StockTools query={query} onQueryChange={setQuery} onPrint={() => window.print()} />
      <StockTable products={filtered} onAdjust={(product, direction, quantity) => onAdjust?.(product.id, direction, Number(quantity))} onUpdate={onUpdate} />
    </main>
  )
}
