export default function CustomerInvoice({
  customers = [],
  selectedCustomerId = 'walk-in',
  onCustomerChange,
  onNewCustomer,
  paidInvoiceNumber,
  onPaidInvoiceNumberChange,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
}) {
  const customer = customers.find((entry) => entry.id === selectedCustomerId)
  const khata =
    selectedCustomerId === 'walk-in'
      ? 0
      : Number(customer?.balance ?? customer?.openingBalance ?? 0)

  return (
    <section data-keyboard-scope className="p-4 sm:p-6 lg:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel hover:border-[#155b4b]/20 hover:shadow-panel-hover transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-[#173b32] text-lg sm:text-xl lg:text-2xl font-semibold leading-tight">
          Customer &amp; invoice
        </h2>
        <button
          className="px-3.5 py-2 rounded-xl border border-[#e2e6df] bg-white text-[#12332d] hover:bg-[#f6f8f1] hover:border-[#cbd7cf] text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-95"
          type="button"
          onClick={onNewCustomer}
        >
          + New customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="flex flex-col">
          <label htmlFor="customer-select" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Customer / retailer
          </label>
          <select
            id="customer-select"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all cursor-pointer"
            value={selectedCustomerId}
            onChange={(event) => onCustomerChange(event.target.value)}
          >
            <option value="walk-in">Walk-in customer</option>
            {customers.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs sm:text-sm text-[#718078] font-medium">
            Existing khata: <span className="font-semibold text-[#173b32]">Rs. {khata.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="pad-invoice" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Pad invoice number (optional)
          </label>
          <input
            id="pad-invoice"
            type="text"
            placeholder="e.g. 1042"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={paidInvoiceNumber}
            onChange={(event) => onPaidInvoiceNumberChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="customer-phone" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Mobile number
          </label>
          <input
            id="customer-phone"
            type="tel"
            placeholder="0300 1234567"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="address" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Address
          </label>
          <input
            id="address"
            type="text"
            placeholder="Market / shop location"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
          />
        </div>
      </div>
    </section>
  )
}
