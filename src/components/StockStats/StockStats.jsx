export default function StockStats({ stats = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {stats.map(([label, value, helper, warning]) => (
        <div
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e2e6df] shadow-panel flex flex-col gap-1 min-w-0"
          key={label}
        >
          <span className="text-xs sm:text-sm font-medium text-[#718078]">{label}</span>
          <strong className="text-lg sm:text-xl lg:text-2xl font-bold text-[#173b32]">{value}</strong>
          {helper && <span className="text-xs leading-snug text-[#718078]">{helper}</span>}
          {warning && <span className="text-xs leading-snug font-semibold text-amber-700">{warning}</span>}
        </div>
      ))}
    </div>
  )
}
