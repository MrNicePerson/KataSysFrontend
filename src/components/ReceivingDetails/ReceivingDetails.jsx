import { Printer } from 'lucide-react'
import { receivingLabel } from '../../data/receiving.js'

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`
const articleOf = (item) => item.articleName || item.articleNumber || item.article || item.code

export default function ReceivingDetails({ purchase, supplier, cheques = [] }) {
  if (!purchase) return null
  const items = purchase.items || []
  const payments = purchase.payments || {}
  const paid = Number(purchase.paid ?? (Number(payments.cash || 0) + Number(payments.bank || payments.bankTransfer || 0)))
  const purchaseCheques = [
    ...(Array.isArray(purchase.cheques) ? purchase.cheques : []),
    ...cheques.filter((entry) => entry.referenceId === purchase.id || entry.purchaseId === purchase.id),
  ].filter((entry, index, all) => all.findIndex((candidate) => candidate.id ? candidate.id === entry.id : candidate.number === entry.number && candidate.bank === entry.bank && Number(candidate.amount) === Number(entry.amount)) === index)
  const cheque = purchaseCheques.length
    ? purchaseCheques.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    : Number(payments.cheque || 0)
  const facts = [
    ['Receiving Bill No.', receivingLabel(purchase) || 'Not recorded'],
    ['Pad Number', purchase.padNumber || 'Not recorded'],
    ['Supplier', purchase.supplier || supplier?.name || 'Not recorded'],
    ['Supplier Code', purchase.supplierCode || supplier?.supplierCode || 'Not recorded'],
    ['Receive Date', purchase.date || 'Not recorded'],
    ['Record ID', purchase.id || 'Not recorded'],
    ['Quantity Received', `${items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} suits`],
  ]
  return <>
    <style>{`@media print {
      @page { size: A4 portrait; margin: 7mm; }
      body * { visibility: hidden !important; }
      #receiving-stock-bill, #receiving-stock-bill * { visibility: visible !important; }
      #receiving-stock-bill { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; color: #111 !important; font: 8pt Arial, sans-serif !important; }
      #receiving-stock-bill > * { margin-top: 4px !important; margin-bottom: 4px !important; }
      #receiving-stock-bill .receiving-print-box { padding: 4px !important; }
      #receiving-stock-bill footer { padding-top: 12px !important; }
      #receiving-stock-bill .receiving-print-controls { display: none !important; }
      #receiving-stock-bill .receiving-print-box { background: #fff !important; border-color: #999 !important; border-radius: 0 !important; }
      #receiving-stock-bill table { min-width: 0 !important; width: 100% !important; border-collapse: collapse !important; }
      #receiving-stock-bill th, #receiving-stock-bill td { border: 1px solid #777 !important; padding: 3px !important; color: #111 !important; }
      #receiving-stock-bill tr { break-inside: avoid; page-break-inside: avoid; }
    }`}</style>
    <div id="receiving-stock-bill" className="space-y-4 text-sm bg-white">
      <div className="receiving-print-controls flex justify-end">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#155b4b] text-white text-sm font-semibold cursor-pointer">
          <Printer size={16} /> Print receiving bill
        </button>
      </div>
      <header className="text-center border-b-2 border-[#173b32] pb-3">
        <h1 className="text-xl font-bold text-[#173b32]">SUPPLIER STOCK RECEIVING BILL</h1>
        <p className="text-xs text-[#718078] mt-1">Stock received from supplier</p>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {facts.map(([label, value]) => <div key={label} className="receiving-print-box p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb] min-w-0">
          <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">{label}</span>
          <strong className="text-[#173b32] font-semibold break-words">{value}</strong>
        </div>)}
      </div>
      <div className="receiving-print-box rounded-xl border border-[#e2e6df] overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[560px]">
          <thead className="bg-[#f7faf5] text-[#718078] uppercase text-[11px]"><tr>
            <th className="p-3">Item / Article</th><th className="p-3">Batch</th><th className="p-3">Qty</th><th className="p-3">Cost / suit</th><th className="p-3">Sale price / suit</th><th className="p-3">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-[#edf0eb]">{items.map((item, index) => <tr key={item.lineId || index}>
          <td className="p-3 font-semibold text-[#173b32]">{articleOf(item) || item.productName || 'Product'}{item.productName && item.productName !== articleOf(item) ? <small className="block font-normal text-[#718078]">Brand: {item.productName}</small> : null}{item.season ? <small className="block font-normal text-[#718078]">{item.season}</small> : null}</td>
            <td className="p-3">{item.batchNumber || receivingLabel(purchase)}</td><td className="p-3">{item.quantity}</td><td className="p-3">{money(item.unitCost)}</td><td className="p-3">{money(item.salePrice)}</td>
            <td className="p-3">{money(Number(item.quantity || 0) * Number(item.unitCost || 0))}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {cheque > 0 && <section className="space-y-2" aria-label="Cheque details">
        <div className="flex justify-between items-center gap-3"><strong className="text-[#173b32]">Cheques ({purchaseCheques.length || 'details not saved'})</strong><strong className="text-[#173b32]">{money(cheque)}</strong></div>
        {purchaseCheques.length ? <div className="receiving-print-box rounded-xl border border-[#e2e6df] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[560px]">
            <thead className="bg-[#f7faf5] text-[#718078] uppercase text-[11px]"><tr>
              <th className="p-3">#</th><th className="p-3">Cheque No.</th><th className="p-3">Bank</th><th className="p-3">Amount</th><th className="p-3">Cheque Date</th><th className="p-3">Clearing Date</th><th className="p-3">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-[#edf0eb]">{purchaseCheques.map((entry, index) => <tr key={entry.id || `${entry.number}-${index}`}>
              <td className="p-3">{index + 1}</td><td className="p-3">{entry.number || '—'}</td><td className="p-3">{entry.bank || '—'}</td><td className="p-3">{money(entry.amount)}</td><td className="p-3">{entry.issued || entry.date || '—'}</td><td className="p-3">{entry.expectedClearanceDate || entry.clearingDate || '—'}</td><td className="p-3">{entry.status || 'Pending'}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="text-xs text-[#718078]">Individual cheque numbers and dates were not saved with this receiving bill.</p>}
      </section>}
      <div className="grid grid-cols-2 gap-3 border-t border-[#edf0eb] pt-3 text-[#173b32]">
        <div><span className="block text-xs text-[#718078]">Amount paid (cash / bank)</span><strong>{money(paid)}</strong></div>
        <div><span className="block text-xs text-[#718078]">Pending cheque</span><strong>{money(cheque)}</strong></div>
      </div>
      <div className="flex justify-between border-t-2 border-[#173b32] pt-3 font-bold text-[#173b32]"><span>Total purchase amount</span><span>{money(purchase.total)}</span></div>
      <div className="flex justify-between font-bold text-[#173b32]"><span>Remaining supplier due (includes pending cheques)</span><span>{money(purchase.due)}</span></div>
      <footer className="grid grid-cols-2 gap-12 pt-12 text-xs text-[#173b32]"><div className="border-t border-[#777] pt-2">Received by</div><div className="border-t border-[#777] pt-2">Supplier signature</div></footer>
    </div>
  </>
}
