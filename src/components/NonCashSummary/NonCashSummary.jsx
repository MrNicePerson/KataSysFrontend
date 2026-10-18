export default function NonCashSummary() {
  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel space-y-4">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb]">
        Non-cash summary
      </h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs sm:text-sm text-[#29443b]">
          <span>Bank movement</span>
          <strong className="font-bold">Rs. 0</strong>
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm text-[#29443b]">
          <span>Pending cheques</span>
          <strong className="font-bold">Rs. 0</strong>
        </div>
      </div>
      <p className="text-xs text-[#718078] pt-2 border-t border-[#edf0eb]">
        Pending cheques are not included in cash counted or khata settlement until cleared.
      </p>
    </section>
  )
}
