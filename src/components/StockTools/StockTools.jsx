export default function StockTools({ query, onQueryChange, onReview, onExport }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
      <input
        type="search"
        placeholder="Search article, brand, batch or supplier..."
        className="w-full sm:max-w-md h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white text-[#173b32] text-sm sm:text-base placeholder:text-[#7b857e] focus:outline-none focus:border-[#155b4b] focus:ring-3 focus:ring-[#155b4b]/15 shadow-xs"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button
        type="button"
        className="h-11 sm:h-12 px-4 rounded-xl border border-[#dfe4dc] bg-white hover:bg-[#f6f8f1] text-[#173b32] text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        onClick={onExport}
      >
        Export stock CSV
      </button>
      <button
        type="button"
        className="h-11 sm:h-12 px-4 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
        onClick={onReview}
      >
        Review stock
      </button>
    </div>
  )
}
