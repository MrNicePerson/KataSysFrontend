import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'

export default function AddItem({ onAddItem, products = [] }) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(true)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const quantityRef = useRef(null)
  const priceRef = useRef(null)
  const fieldRef = useRef(null)
  const productRecords = products

  const productDetails = (product) => [
    product.shade || product.colour || product.color,
    product.code || product.articleNumber,
    product.batchNumber,
    `${Number(product.stockQuantity || 0).toLocaleString()} available`,
    `Rs. ${Number(product.salePrice || 0).toLocaleString()}`,
  ].filter(Boolean).join(' · ')

  const matchesQuery = (product, query) => [
    product.name,
    product.shade,
    product.colour,
    product.color,
    product.code,
    product.articleNumber,
    product.batchNumber,
    product.size,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))

  const query = name.trim().toLowerCase()
  const suggestions = productRecords.filter((product) => product.active !== false && (!query || matchesQuery(product, query)))

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!fieldRef.current?.contains(event.target)) setSuggestionsOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const selectProduct = (product) => {
    setSelectedProduct(product)
    setName(product.name)
    setPrice(String(product.salePrice || 0))
    setSuggestionsOpen(false)
    setActiveSuggestion(-1)
    quantityRef.current?.focus()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    const product = selectedProduct || productRecords.find((entry) => entry.name?.trim().toLowerCase() === name.trim().toLowerCase())
    onAddItem({
      productId: product?.id,
      code: product?.code || product?.articleNumber || name.trim(),
      name: product?.name || name.trim(),
      quantity: Number(quantity) || 1,
      price: Number(price) || 0,
    })
    setName('')
    setQuantity(1)
    setPrice('')
    setSelectedProduct(null)
    setSuggestionsOpen(false)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setSuggestionsOpen(true)
      setActiveSuggestion((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setSuggestionsOpen(true)
      setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (suggestions.length && suggestionsOpen) {
        selectProduct(suggestions[activeSuggestion >= 0 ? activeSuggestion : 0])
      } else {
        quantityRef.current?.focus()
      }
    } else if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      setActiveSuggestion(-1)
    }
  }

  return (
    <section className="p-4 sm:p-6 lg:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel hover:border-[#155b4b]/20 hover:shadow-panel-hover transition-all">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[#173b32] text-lg sm:text-xl lg:text-2xl font-semibold leading-tight">
          Add an item
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="relative" ref={fieldRef}>
          <label htmlFor="sale-item-search" className="block text-[#173b32] text-sm sm:text-base font-semibold mb-2">
            Item name, article or colour
          </label>
          <input
            id="sale-item-search"
            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            name="name"
            placeholder="Type item name, article or colour..."
            value={name}
            onFocus={() => {
              if (suggestions.length) setSuggestionsOpen(true)
            }}
            onChange={(event) => {
              setName(event.target.value)
              setSelectedProduct(null)
              setActiveSuggestion(-1)
              setSuggestionsOpen(true)
              const normalized = event.target.value.trim().toLowerCase()
              const match = productRecords.find(
                (product) =>
                  product.name?.trim().toLowerCase() === normalized ||
                  product.code?.trim().toLowerCase() === normalized
              )
              setPrice(match ? String(match.salePrice || 0) : '')
            }}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="sale-product-suggestions"
            required
          />

          {suggestionsOpen && suggestions.length > 0 && (
            <div
              className="absolute z-30 left-0 right-0 top-[calc(100%+6px)] max-h-60 overflow-y-auto rounded-xl border border-[#e2e6df] bg-white shadow-xl divide-y divide-[#edf0eb]"
              id="sale-product-suggestions"
              role="listbox"
            >
              {suggestions.map((product, index) => (
                <button
                  className={`w-full p-3.5 sm:p-4 text-left transition-colors flex flex-col gap-0.5 cursor-pointer ${
                    index === (activeSuggestion < 0 ? 0 : activeSuggestion)
                      ? 'bg-[#eef4e8] text-[#12332d]'
                      : 'hover:bg-[#f6f9f2] text-[#12332d]'
                  }`}
                  type="button"
                  key={product.id}
                  role="option"
                  aria-selected={index === (activeSuggestion < 0 ? 0 : activeSuggestion)}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectProduct(product)}
                >
                  <span className="text-sm sm:text-base font-bold text-[#12332d]">{product.name}</span>
                  <span className="text-xs sm:text-[13px] text-[#718078] font-medium">{productDetails(product)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label className="flex flex-col gap-2">
            <span className="text-[#173b32] text-sm sm:text-base font-semibold">Quantity</span>
            <input
              ref={quantityRef}
              name="quantity"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  priceRef.current?.focus()
                }
              }}
              min="1"
              required
              className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[#173b32] text-sm sm:text-base font-semibold">Price per suit</span>
            <input
              ref={priceRef}
              name="price"
              type="number"
              placeholder="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              min="0"
              required
              className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 transition-all"
            />
          </label>

          <button
            className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto h-11 sm:h-12 px-6 flex items-center justify-center gap-2 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-sm sm:text-base font-semibold transition-all cursor-pointer shadow-sm active:scale-98 whitespace-nowrap"
            type="submit"
          >
            <Plus size={18} /> Add to cart →
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs sm:text-[13px] text-[#7e8982]">
        Use ↑ ↓ to choose a result. Enter moves to the next field.
      </p>
    </section>
  )
}
