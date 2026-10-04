import { receivingLabel } from '../../data/receiving.js'

const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`

export default function ReceivingDetails({ purchase, supplier }) {
  if (!purchase) return null
  const items = purchase.items || []
  const facts = [
    ['Batch Number', receivingLabel(purchase) || 'Not recorded'],
    ['Supplier', purchase.supplier || supplier?.name || 'Not recorded'],
    ['Supplier Code', purchase.supplierCode || supplier?.supplierCode || 'Not recorded'],
    ['Receive Date', purchase.date || 'Not recorded'],
    ['Receive Stock Bill', purchase.id || 'Not recorded'],
    ['Quantity Received', `${items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} suits`],
  ]
  return <div className="space-y-4 text-sm">
    <div className="grid grid-cols-2 gap-2">
      {facts.map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb] min-w-0">
        <span className="text-[#718078] text-[11px] uppercase tracking-wider block mb-1">{label}</span>
        <strong className="text-[#173b32] font-semibold break-words">{value}</strong>
      </div>)}
    </div>
    <div className="rounded-xl border border-[#e2e6df] overflow-x-auto">
      <table className="w-full text-left text-xs min-w-[560px]">
        <thead className="bg-[#f7faf5] text-[#718078] uppercase text-[11px]"><tr>
          <th className="p-3">Products received</th><th className="p-3">Quantity</th><th className="p-3">Purchase cost / suit</th><th className="p-3">Sale price / suit</th><th className="p-3">Purchase amount</th>
        </tr></thead>
        <tbody className="divide-y divide-[#edf0eb]">{items.map((item, index) => <tr key={item.lineId || index}>
          <td className="p-3 font-semibold text-[#173b32]">{item.productName || item.code || 'Product'}</td>
          <td className="p-3">{item.quantity}</td><td className="p-3">{money(item.unitCost)}</td><td className="p-3">{money(item.salePrice)}</td>
          <td className="p-3">{money(Number(item.quantity || 0) * Number(item.unitCost || 0))}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex justify-between border-t border-[#edf0eb] pt-3 font-bold text-[#173b32]"><span>Total purchase amount</span><span>{money(purchase.total)}</span></div>
  </div>
}
