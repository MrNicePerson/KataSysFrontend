import { useEffect, useRef } from 'react'
import SidebarBrand from './SidebarBrand.jsx'
import PrimaryNavigation from './PrimaryNavigation.jsx'
import BusinessNavigation from './BusinessNavigation.jsx'
import ShopNavigation from './ShopNavigation.jsx'
import { handleSidebarKeyDown } from '../../keyboard/sidebarNavigation.js'

const pageForLabel = {
  'New customer': 'new-customer',
  'Bills & receipts': 'bills',
  'Customer returns': 'returns',
  'Orders & held bills': 'orders',
  'Stock & products': 'stock',
  'Receive stock': 'receive',
  'Supplier returns': 'supplier-returns',
  Suppliers: 'suppliers',
  'Customer khata': 'khata',
  'Defects & claims': 'claims',
  'Cheque register': 'cheques',
  'Shop expenses': 'expenses',
  'Daily closing': 'closing',
  Reports: 'reports',
  Settings: 'settings',
}

function NavigationLink({ icon, label, active, onClick }) {
  return (
    <button
      data-nav-item
      className={`w-full flex items-center gap-3.5 min-h-[46px] sm:min-h-[50px] px-3.5 rounded-xl text-left text-sm sm:text-base font-medium transition-colors cursor-pointer focus:bg-[#155b4b] focus:text-white ${
        active
          ? 'bg-[#155b4b] text-white shadow-xs font-semibold'
          : 'text-[#687970] hover:bg-[#f6f8f1] hover:text-[#173b32]'
      }`}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="w-5 grid place-items-center shrink-0 text-base sm:text-lg opacity-90" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

const permissionByLabel = {
  'New sale': 'sales',
  'New customer': 'customers',
  'Bills & receipts': 'sales',
  'Customer returns': 'returns',
  'Orders & held bills': 'orders',
  'Stock & products': 'stock',
  'Receive stock': 'stock',
  'Supplier returns': 'stock',
  'Defects & claims': 'stock',
  Suppliers: 'suppliers',
  'Customer khata': 'customers',
  'Cheque register': 'cheques',
  'Shop expenses': 'finance',
  'Daily closing': 'finance',
  Reports: 'reports',
  Settings: 'settings',
}

export default function Sidebar({ activePage, onClose, onNavigate, permissions = {}, role }) {
  const navRef = useRef(null)
  const closeButtonRef = useRef(null)
  const hasAccess = (label) => role === 'admin' || permissions[permissionByLabel[label]]
  const selectedPage = activePage === 'bill-receipt' ? 'new-sale' : activePage
  useEffect(() => {
    const active = navRef.current?.querySelector('[data-nav-item][aria-current="page"]')
    const target = active || navRef.current?.querySelector('[data-nav-item]') || closeButtonRef.current
    target?.focus()
  }, [])
  const onNavigationKeyDown = (event) => handleSidebarKeyDown(event, {
    items: [...(navRef.current?.querySelectorAll('[data-nav-item]') || [])],
    nav: navRef.current,
    closeButton: closeButtonRef.current,
    onClose,
  })
  const renderLink = (icon, label) => (
    hasAccess(label) &&
    <NavigationLink key={label} icon={icon} label={label} active={selectedPage === pageForLabel[label]} onClick={() => onNavigate(label)} />
  )

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#203832]/30 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col w-[85vw] max-w-[340px] sm:max-w-[360px] p-5 sm:p-6 bg-white shadow-[14px_0_30px_rgba(32,56,50,0.14)] animate-in slide-in-from-left duration-200 ease-out"
        aria-label="Main navigation"
        role="dialog"
        aria-modal="true"
        onKeyDown={onNavigationKeyDown}
      >
        <SidebarBrand onClose={onClose} closeButtonRef={closeButtonRef} />
        <nav ref={navRef} aria-label="Pages" className="flex-1 min-h-0 overflow-y-auto mt-6 pr-1 space-y-1 scrollbar-thin">
          {hasAccess('New sale') && <button
            data-nav-item
            className={`w-full flex items-center gap-3.5 min-h-[46px] sm:min-h-[50px] px-3.5 rounded-xl text-left text-sm sm:text-base font-medium transition-colors cursor-pointer focus:bg-[#155b4b] focus:text-white ${
              selectedPage === 'new-sale'
                ? 'bg-[#155b4b] text-white shadow-xs font-semibold'
                : 'text-[#687970] hover:bg-[#f6f8f1] hover:text-[#173b32]'
            }`}
            type="button"
            onClick={() => onNavigate('New sale')}
            aria-current={selectedPage === 'new-sale' ? 'page' : undefined}
          >
            <span className="w-5 grid place-items-center shrink-0 text-lg font-bold" aria-hidden="true">+</span>
            <span>New sale</span>
          </button>}
          <PrimaryNavigation renderLink={renderLink} />
          <BusinessNavigation renderLink={renderLink} />
          <ShopNavigation renderLink={renderLink} />
        </nav>
      </aside>
    </>
  )
}
