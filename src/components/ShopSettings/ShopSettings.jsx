import { useState } from 'react'

const defaults = { shopName: 'Kapra Khata', stockThreshold: '10', receiptFooter: 'Shukriya! Apna bill sambhal kar rakhein.' }

export default function ShopSettings({ value = {}, onSave }) {
  const settings = { ...defaults, ...value }
  const [formKey, setFormKey] = useState(0)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSettings = {
      shopName: formData.get('shopName').trim(),
      stockThreshold: formData.get('stockThreshold'),
      receiptFooter: formData.get('receiptFooter').trim(),
    }
    try {
      const saved = await onSave?.(nextSettings)
      if (!saved) throw new Error('Settings were not saved. Check the error message above and try again.')
    } catch (error) {
      window.alert(error.message)
      return
    }
    setSaved(true)
    setFormKey((key) => key + 1)
  }

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb] mb-4">
        Shop &amp; receipts
      </h2>
      <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
          Shop name
          <input
            name="shopName"
            defaultValue={settings.shopName}
            onChange={() => setSaved(false)}
            required
            className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
          Low-stock alert threshold
          <input
            name="stockThreshold"
            type="number"
            min="0"
            defaultValue={settings.stockThreshold}
            onChange={() => setSaved(false)}
            required
            className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
          Receipt footer
          <input
            name="receiptFooter"
            defaultValue={settings.receiptFooter}
            onChange={() => setSaved(false)}
            className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
          />
        </label>

        <button
          type="submit"
          className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
        >
          {saved ? 'Settings saved' : 'Save settings'}
        </button>
      </form>
    </section>
  )
}
