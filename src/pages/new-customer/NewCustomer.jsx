import { useState } from 'react'

export default function NewCustomer({ onCancel, onSave }) {
  const [error, setError] = useState('')
  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    try {
      const saved = await onSave({
        name: formData.get('name').trim(),
        phone: formData.get('phone').trim(),
        address: formData.get('address').trim(),
        city: formData.get('city').trim(),
        openingBalance: Number(formData.get('openingBalance')),
      })
      if (!saved) {
        setError('Could not save the customer. Check the error message above and try again.')
        return
      }
      setError('')
    } catch (issue) {
      setError(issue.message || 'Could not save the customer.')
    }
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="p-5 sm:p-8 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[#edf0eb]">
          <h1 className="text-[#173b32] text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            New customer
          </h1>
          <button
            className="w-9 h-9 grid place-items-center rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] hover:text-[#173b32] cursor-pointer transition-colors"
            type="button"
            aria-label="Close"
            onClick={onCancel}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[#173b32] text-sm sm:text-base font-semibold">Full name / business *</span>
              <input
                autoFocus
                name="name"
                type="text"
                required
                placeholder="e.g. Ali Traders"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[#173b32] text-sm sm:text-base font-semibold">Phone</span>
              <input
                name="phone"
                type="tel"
                placeholder="0300 1234567"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[#173b32] text-sm sm:text-base font-semibold">City</span>
              <input
                name="city"
                type="text"
                placeholder="Lahore / Faisalabad"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[#173b32] text-sm sm:text-base font-semibold">Address</span>
              <input
                name="address"
                type="text"
                placeholder="Shop #, Market, Area"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
              />
            </label>

            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[#173b32] text-sm sm:text-base font-semibold">Opening balance (negative for advance)</span>
              <input
                name="openingBalance"
                type="number"
                step="1"
                defaultValue="0"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15"
              />
            </label>
          </div>

          <p className="text-xs sm:text-sm text-[#718078]">
            Positive balance means customer owes the shop.
          </p>

          {error && (
            <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs sm:text-sm font-medium border border-red-200" role="alert">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              className="w-full h-12 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-sm sm:text-base font-bold shadow-md cursor-pointer transition-all active:scale-98"
              type="submit"
            >
              Save customer
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
