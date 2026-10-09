import { useEffect, useMemo, useRef, useState } from 'react'
import StockStats from '../../components/StockStats/StockStats.jsx'
import StockTools from '../../components/StockTools/StockTools.jsx'
import StockTable from '../../components/StockTable/StockTable.jsx'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'
import { localDateString } from '../../data/businessLogic.js'

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

function exportStockCsv(products) {
  const date = localDateString()
  const rows = [
    ['Audit date', 'Article Name', 'Brand Name', 'Supplier', 'Batch Number', 'Available Stock', 'Cost per suit', 'Available stock value'],
    ...products.map((product) => {
      const available = Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0)
      const cost = Number(product.averageCost || 0)
      return [date, product.article || product.code || '', product.name || '', product.supplier === '—' ? '' : product.supplier, product.batch === '—' ? '' : product.batch, available, cost, available * cost]
    }),
  ]
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `stock-audit-${date}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function StockProducts({ products: records = [], suppliers = [], onReceiveStock, onSaveAudit }) {
  const [query, setQuery] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const [reviewError, setReviewError] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewPeriod, setReviewPeriod] = useState('monthly')
  const [reviewDate, setReviewDate] = useState(localDateString())
  const reviewOpenerRef = useRef(null)
  const reviewKeyboard = useKeyboardScope({ onEscape: () => { if (!reviewSaving) closeReview() }, trapFocus: true })
  const products = useMemo(() => records.map((p) => ({ ...p, colour: p.shade || '', supplier: suppliers.find((s) => s.id === p.supplierId)?.name || '—', batch: p.batchNumber || '—', available: String(Number(p.stockQuantity || 0) - Number(p.reservedQuantity || 0)), defective: String(p.defectiveQuantity || 0), cost: `Rs. ${Number(p.averageCost || 0).toLocaleString()}`, tone: 'blue' })), [records, suppliers])
  const total = (key) => products.reduce((sum, p) => sum + Number(p[key] || 0), 0)
  const stats = [['Available suits', total('available').toLocaleString()], ['Defective / quarantine', total('defectiveQuantity').toLocaleString()], ['Stock value', `Rs. ${products.reduce((sum, p) => sum + Number(p.stockQuantity || 0) * Number(p.averageCost || 0), 0).toLocaleString()}`]]
  const filtered = products.filter((product) => [product.article, product.code, product.name, product.supplier, product.batch].join(' ').toLowerCase().includes(query.toLowerCase()))

  const closeReview = () => {
    setReviewOpen(false)
    requestAnimationFrame(() => { if (reviewOpenerRef.current?.isConnected) reviewOpenerRef.current.focus() })
  }

  const openReview = (event) => {
    reviewOpenerRef.current = event?.currentTarget || null
    setCounts(Object.fromEntries(products.map((product) => [product.id, String(Math.max(0, Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0)))])))
    setReviewPeriod('monthly')
    setReviewDate(localDateString())
    setReviewError('')
    setReviewOpen(true)
  }

  useEffect(() => {
    if (reviewOpen) reviewKeyboard.ref.current?.querySelector('input')?.focus()
  }, [reviewOpen])

  const saveReview = async (event) => {
    event.preventDefault()
    const invalid = products.find((product) => !/^\d+$/.test(counts[product.id] ?? ''))
    if (invalid) {
      setReviewError(`Enter a whole number for ${invalid.article || invalid.code || invalid.name}.`)
      return
    }
    setReviewSaving(true)
    setReviewError('')
    try {
      if (!reviewDate) throw new Error('Choose the stock audit date.')
      if (!onSaveAudit) throw new Error('Stock audit saving is unavailable.')
      const saved = await onSaveAudit({
        period: reviewPeriod,
        date: reviewDate,
        items: products.map((product) => ({ productId: product.id, countedAvailable: Number(counts[product.id]) })),
      })
      if (!saved) throw new Error('Could not save the stock audit. Please try again.')
      closeReview()
    } catch (error) {
      setReviewError(error.message || 'Could not save the stock review.')
    } finally {
      setReviewSaving(false)
    }
  }

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
      <StockTools query={query} onQueryChange={setQuery} onReview={openReview} onExport={() => exportStockCsv(products)} />
      <StockTable products={filtered} />
      {reviewOpen && (
        <div className="fixed inset-0 z-50 bg-[#203832]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !reviewSaving) closeReview() }}>
          <form ref={reviewKeyboard.ref} onKeyDown={reviewKeyboard.onKeyDown} onSubmit={saveReview} className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-[#e2e6df] shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-labelledby="stock-review-title">
            <div className="px-5 py-4 border-b border-[#edf0eb] flex items-center justify-between gap-4">
              <div>
                <h2 id="stock-review-title" className="text-lg sm:text-xl font-bold text-[#173b32]">Review stock</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#718078]">Enter the physical available quantity. Differences will update stock up or down.</p>
              </div>
              <button type="button" aria-label="Close stock review" disabled={reviewSaving} onClick={closeReview} className="w-9 h-9 rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] disabled:opacity-50">×</button>
            </div>
            <div className="px-5 py-3 border-b border-[#edf0eb] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#52645c]">Audit period
                <select value={reviewPeriod} onChange={(event) => setReviewPeriod(event.target.value)} className="h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm text-[#173b32]">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-[#52645c]">Audit date
                <input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} className="h-10 px-3 rounded-lg border border-[#dfe4dc] bg-white text-sm text-[#173b32]" />
              </label>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[820px]">
                <thead className="sticky top-0 bg-[#f7faf5] text-[#718078] uppercase text-[10px] sm:text-[11px] tracking-wide">
                  <tr><th className="px-4 py-3">Article / brand</th><th className="px-4 py-3">Supplier / batch</th><th className="px-4 py-3">Current available</th><th className="px-4 py-3">Counted stock</th><th className="px-4 py-3">Cost per suit</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3"><strong className="block text-[#173b32]">{product.article || product.code || '—'}</strong><small className="text-[#718078]">{product.name}</small></td>
                      <td className="px-4 py-3"><span className="block text-[#173b32]">{product.supplier}</span><small className="text-[#718078]">{product.batch}</small></td>
                      <td className="px-4 py-3 font-semibold text-[#173b32]">{product.available}</td>
                      <td className="px-4 py-3"><input type="text" inputMode="numeric" pattern="[0-9]*" aria-label={`Counted available stock for ${product.article || product.code || product.name}`} value={counts[product.id] ?? ''} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCounts((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, '') }))} className="w-28 h-10 px-3 rounded-lg border border-[#dfe4dc] text-[#173b32] focus:outline-none focus:border-[#155b4b] focus:ring-2 focus:ring-[#155b4b]/15" /></td>
                      <td className="px-4 py-3 font-medium text-[#173b32]">{product.cost}</td>
                    </tr>
                  ))}
                  {!products.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-[#718078]">No stock items to review.</td></tr>}
                </tbody>
              </table>
            </div>
            {reviewError && <p className="px-5 py-2 text-sm text-red-600" role="alert">{reviewError}</p>}
            <div className="px-5 py-4 border-t border-[#edf0eb] flex justify-end gap-3">
              <button type="button" disabled={reviewSaving} onClick={closeReview} className="h-10 px-4 rounded-lg border border-[#dfe4dc] text-[#52645c] font-semibold disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={reviewSaving || !products.length} className="h-10 px-5 rounded-lg bg-[#155b4b] text-white font-semibold disabled:opacity-50">{reviewSaving ? 'Saving…' : 'Save stock count'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
