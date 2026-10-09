export default function StockTable({ products = [] }) {
  return (
    <>
      <div className="w-full overflow-x-auto rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Article name</th>
              <th className="px-4 sm:px-6 py-3.5">Supplier / batch</th>
              <th className="px-4 sm:px-6 py-3.5">Available stock</th>
              <th className="px-4 sm:px-6 py-3.5">Cost per suit</th>
            </tr>
          </thead>
          <tbody data-keyboard-list className="divide-y divide-[#edf0eb]">
            {products.map((product) => (
              <tr key={product.id} data-keyboard-row tabIndex={0} className="hover:bg-[#f8faf7] transition-colors">
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#eaf3e7] text-[#155b4b] grid place-items-center font-bold text-sm">
                      ✧
                    </span>
                    <div>
                      <strong className="block font-bold text-[#173b32] text-sm sm:text-base">{product.article || product.code || '—'}</strong>
                      <small className="text-[#718078] text-xs font-medium">Brand Name: {product.name}{product.colour ? ` · ${product.colour}` : ''}</small>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-medium text-[#12332d]">{product.supplier}</div>
                  <small className="text-[#718078] text-xs block">{product.batch || product.batchFull}</small>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md bg-[#e8f2e3] text-[#557250] font-bold text-xs">
                    {product.available}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-semibold text-[#173b32]">{product.cost}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  )
}
