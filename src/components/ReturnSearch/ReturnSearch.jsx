export default function ReturnSearch({ customers = [] }) {
  return (
    <section className="p-4 sm:p-6 rounded-2xl bg-white border border-[#e2e6df] shadow-panel mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
          Retailer / customer
          <select
            defaultValue=""
            className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
          >
            <option value="" disabled>Choose retailer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
          Item name / article
          <input
            placeholder="Type the returned item name"
            className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b]"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-[#718078]">Choose the retailer to see only their purchases.</p>
    </section>
  )
}
