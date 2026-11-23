const links = [
  ['▦', 'Stock & products'],
  ['↓', 'Receive stock'],
  ['▾', 'Suppliers'],
  ['♧', 'Customer khata'],
  ['+', 'New customer'],
]

export default function BusinessNavigation({ renderLink }) {
  return (
    <>
      <p className="mt-5 mb-2 px-3.5 text-[11px] font-bold text-[#839087] tracking-[2px] uppercase">
        MANAGE YOUR BUSINESS
      </p>
      {links.map(([icon, label]) => renderLink(icon, label))}
    </>
  )
}
