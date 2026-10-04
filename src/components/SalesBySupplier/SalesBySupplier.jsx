export default function SalesBySupplier({ database }) {
  const totals = new Map()
  for (const sale of database.sales) {
    for (const item of sale.items) {
      const product = database.products.find((entry) => entry.id === item.productId)
      const supplier = database.suppliers.find((entry) => entry.id === product?.supplierId)
      const name = supplier?.name || 'Unassigned supplier'
      totals.set(name, (totals.get(name) || 0) + Number(item.lineTotal ?? Number(item.quantity || 0) * Number(item.unitPrice ?? item.price ?? 0)))
    }
  }
  for (const item of database.returns.filter((entry) => entry.refundType !== 'sale-adjustment')) {
    const product = database.products.find((entry) => entry.id === item.productId)
    const supplier = database.suppliers.find((entry) => entry.id === product?.supplierId)
    const name = supplier?.name || 'Unassigned supplier'
    totals.set(name, (totals.get(name) || 0) - Number(item.amount || 0))
  }
  const rows = [...totals].sort((a, b) => b[1] - a[1])
  const maximum = Math.max(1, ...rows.map(([, value]) => value))

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
        Sales by supplier
      </h2>
      <div className="space-y-3">
        {rows.length ? (
          rows.map(([name, value]) => (
            <div className="space-y-1" key={name}>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="font-semibold text-[#173b32]">{name}</span>
                <strong className="text-[#155b4b]">Rs. {value.toLocaleString()}</strong>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#eef4e8] overflow-hidden">
                <div
                  className="h-full bg-[#155b4b] rounded-full transition-all duration-300"
                  style={{ width: `${(Math.max(0, value) / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs sm:text-sm text-[#718078] py-4 text-center">No sales recorded.</p>
        )}
      </div>
      <p className="text-xs text-[#718078] pt-2 border-t border-[#edf0eb]">
        Net sales after returns and bill discounts.
      </p>
    </section>
  )
}
