import { Menu } from 'lucide-react'

export default function Header({ onMenuClick, onSignOut, user, menuButtonRef }) {
  const initials = (user?.name || 'User').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return (
    <header className="w-full min-h-16 sm:min-h-20 lg:min-h-24 px-4 sm:px-6 lg:px-12 flex items-center gap-3 sm:gap-4 bg-white border-b border-[#e2e6df] shadow-[0_1px_0_rgba(18,51,45,0.02)] sticky top-0 z-30">
      <button
        ref={menuButtonRef}
        className="w-10 h-10 sm:w-12 sm:h-12 grid place-items-center rounded-xl border border-[#e2e6df] bg-white text-[#12332d] hover:bg-[#f8faf7] hover:border-[#cbd7cf] transition-all cursor-pointer shadow-xs active:scale-95"
        type="button"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5 sm:w-[21px] sm:h-[21px]" strokeWidth={1.8} />
      </button>

      <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-13 lg:h-13 grid place-items-center shrink-0 rounded-xl font-bold text-white bg-[#155b4b] text-xl sm:text-2xl lg:text-[28px] shadow-xs select-none" aria-hidden="true">
        K
      </div>

      <div className="flex flex-col">
        <strong className="text-[#173b32] text-lg sm:text-2xl lg:text-[28px] font-bold leading-tight tracking-tight">
          Kapra Khata
        </strong>
        <span className="hidden sm:inline text-[#708078] text-[10px] sm:text-xs font-semibold tracking-[2px] sm:tracking-[3px] uppercase">
          WHOLESALE, SIMPLIFIED
        </span>
      </div>

      <div className="flex-1" />

      <time dateTime={new Date().toISOString().slice(0, 10)} className="hidden md:block text-[#68756f] text-sm lg:text-base font-normal">
        {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
      </time>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 grid place-items-center shrink-0 rounded-full bg-[#f1ebdd] text-[#173b32] font-bold text-xs sm:text-sm lg:text-base select-none">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col gap-0.5">
          <strong className="text-[#173b32] text-xs sm:text-sm font-bold leading-none">{user?.name}</strong>
          <span className="text-[#718078] text-[11px] sm:text-xs leading-none">{user?.role || 'staff'}</span>
        </div>
        <button type="button" onClick={onSignOut} className="ml-1 px-2.5 h-9 rounded-lg border border-[#e2e6df] text-xs font-semibold text-[#52645c] hover:bg-[#f8faf7]">Sign out</button>
      </div>
    </header>
  )
}
