export default function ProductInputDemo({ products = [] }) {
  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4 mt-6">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
        Try product input
      </h2>
      <p className="text-xs sm:text-sm text-[#718078]">
        Use these product codes with a keyboard-emulating scanner. Enter a code followed by Enter while the New Sale screen is open.
      </p>
      {products.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <div key={product.id} className="p-3 rounded-xl bg-[#fafbf8] border border-[#edf0eb] flex flex-col gap-1 text-xs sm:text-sm">
              <span className="text-[#718078] truncate">{product.name}</span>
              <strong className="font-bold text-[#155b4b]">{product.code}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs sm:text-sm text-[#718078]">No product codes yet. Receive a delivery to add products.</p>
      )}
    </section>
  )
}
