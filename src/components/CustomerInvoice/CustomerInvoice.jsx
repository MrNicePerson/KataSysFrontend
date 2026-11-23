import { useState } from 'react'

export default function CustomerInvoice({
  customers = [],
  selectedCustomerId = 'walk-in',
  customerName = '',
  onCustomerNameChange,
  onCustomerChange,
  onNewCustomer,
  paidInvoiceNumber,
  onPaidInvoiceNumberChange,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
}) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const customer = customers.find((entry) => entry.id === selectedCustomerId)
  const shownName = customer?.name || customerName
  const matches = customers.filter((entry) => entry.active !== false && shownName.trim() && `${entry.name} ${entry.phone || ''} ${entry.address || entry.city || ''}`.toLowerCase().includes(shownName.trim().toLowerCase())).slice(0, 6)
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
          <label htmlFor="customer-select" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">Customer / retailer</label>
          <div className="relative">
            <input id="customer-select" role="combobox" aria-autocomplete="list" aria-expanded={suggestionsOpen} aria-controls="customer-suggestions" autoComplete="off" placeholder="Type a customer name or phone" className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all" value={shownName} onFocus={() => setSuggestionsOpen(true)} onBlur={() => setTimeout(() => setSuggestionsOpen(false), 120)} onChange={(event) => { onCustomerNameChange(event.target.value); setSuggestionsOpen(true) }} />
            {suggestionsOpen && <div id="customer-suggestions" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dfe4dc] bg-white p-1 shadow-lg">
              {matches.map((entry) => <button key={entry.id} type="button" role="option" aria-selected={String(entry.id) === String(selectedCustomerId)} onMouseDown={(event) => event.preventDefault()} onClick={() => { onCustomerNameChange(entry.name); onCustomerChange(entry.id); setSuggestionsOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#173b32] hover:bg-[#f1f6ea]"><strong>{entry.name}</strong>{(entry.phone || entry.address || entry.city) && <small className="ml-2 text-[#718078]">{[entry.phone, entry.address || entry.city].filter(Boolean).join(' · ')}</small>}</button>)}
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onCustomerChange('walk-in'); setSuggestionsOpen(false) }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#155b4b] hover:bg-[#f1f6ea]">Use as walk-in customer</button>
            </div>}
          </div>
          <span className="mt-1 text-xs text-[#718078]">Type a saved customer to select automatically, or use this sale as walk-in.</span>
          <div className="mt-2 text-xs sm:text-sm text-[#718078] font-medium">
            Existing khata: <span className="font-semibold text-[#173b32]">Rs. {khata.toLocaleString()}</span>
          </div>
          {!customer && <p className="mt-1 text-xs text-[#718078]">If this walk-in sale has an unpaid balance, the customer will be saved in Customer Khata.</p>}
        </div>

        <div className="flex flex-col">
          <label htmlFor="pad-invoice" className="text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Invoice number
            <span className="block mt-0.5 text-xs font-medium text-[#718078]">Pad invoice number (optional)</span>
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
