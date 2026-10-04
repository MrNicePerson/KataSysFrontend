export default function SidebarBrand({ onClose, closeButtonRef }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#edf0eb]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 grid place-items-center rounded-xl bg-[#155b4b] text-white font-bold text-xl shadow-xs select-none">
          K
        </div>
        <strong className="text-[#173b32] text-xl font-bold tracking-tight">Kapra Khata</strong>
      </div>
      <button
        ref={closeButtonRef}
        className="w-9 h-9 grid place-items-center rounded-lg text-2xl leading-none text-[#718078] hover:bg-[#f6f8f1] hover:text-[#173b32] cursor-pointer transition-colors"
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
}

