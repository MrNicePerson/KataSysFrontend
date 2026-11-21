export default function StockTable({ products = [], onEdit, onDelete }) {
  return (
    <>
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-[#e2e6df] bg-white shadow-panel">
        <table className="w-full text-left text-xs sm:text-sm min-w-[900px]">
          <thead className="bg-[#f7faf5] border-b border-[#e2e6df] text-[#718078] uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="px-4 sm:px-6 py-3.5">Article name</th>
              <th className="px-4 sm:px-6 py-3.5">Supplier / batch</th>
              <th className="px-4 sm:px-6 py-3.5">On hand</th>
              <th className="px-4 sm:px-6 py-3.5">Reserved</th>
              <th className="px-4 sm:px-6 py-3.5">Available</th>
              <th className="px-4 sm:px-6 py-3.5">Defective / quarantine</th>
              <th className="px-4 sm:px-6 py-3.5">Cost per suit / Tan</th>
              <th className="px-4 sm:px-6 py-3.5">Sale price</th>
              {(onEdit || onDelete) && <th className="px-4 sm:px-6 py-3.5">Actions</th>}
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
                      <strong className="block font-bold text-[#173b32] text-sm sm:text-base">{product.productType === 'tan' ? product.name : product.article || product.code || '-'}</strong>
                      {product.productType === 'tan' ? <small className="text-[#718078] text-xs font-medium">TAN · {product.tanType || 'Fabric'} · {product.metersPerTan} meters / Tan</small> : <small className="text-[#718078] text-xs font-medium">Brand Name: {product.name}{product.colour ? ` · ${product.colour}` : ''}</small>}
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-medium text-[#12332d]">{product.supplier}</div>
                  <small className="text-[#718078] text-xs block">{product.batch || product.batchFull}</small>
                </td>
                <td className="px-4 sm:px-6 py-4">{Number(product.stockQuantity || 0)}</td>
                <td className="px-4 sm:px-6 py-4">{Number(product.reservedQuantity || 0)}</td>
                <td className="px-4 sm:px-6 py-4">
                  <span className="px-2.5 py-1 rounded-md bg-[#e8f2e3] text-[#557250] font-bold text-xs">
                    {product.available}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4"><span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-bold text-xs">{product.defective || '0'}</span>{product.defectOnly && <small className="ml-2 text-[#718078]">Defective only</small>}</td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="font-semibold text-[#173b32]">{product.productType === 'tan' ? `Rs. ${Number(product.averageCost || 0).toLocaleString()} / Tan` : product.cost}{product.productType === 'tan' ? <small className="block mt-1 text-xs font-medium text-[#52645c]">Buy price / meter: Rs. {Number(product.buyPricePerMeter || 0).toLocaleString()}</small> : null}</div>
                </td>
                <td className="px-4 sm:px-6 py-4 font-semibold text-[#173b32]">Rs. {Number(product.salePrice || 0).toLocaleString()}{product.productType === 'tan' ? <small className="block mt-1 text-xs font-medium text-[#52645c]">Sale price / meter: Rs. {Number(product.salePricePerMeter || 0).toLocaleString()}</small> : ' / suit'}</td>
                {(onEdit || onDelete) && <td className="px-4 sm:px-6 py-4"><div className="flex gap-2">{onEdit && <button type="button" onClick={() => onEdit(product)} className="rounded-lg border border-[#155b4b] px-3 py-2 font-semibold text-[#155b4b] hover:bg-[#e8f2e3]">Edit</button>}{onDelete && <button type="button" onClick={() => onDelete(product)} className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50">Delete</button>}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  )
}
