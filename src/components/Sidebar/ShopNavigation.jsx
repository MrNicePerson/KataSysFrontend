const links = [
  ['▤', 'Cheque register'],
  ['−', 'Shop expenses'],
  ['◷', 'Daily closing'],
  ['▥', 'Reports'],
  ['⚙', 'Settings'],
]

export default function ShopNavigation({ renderLink }) {
  return (
    <>
      <p className="mt-5 mb-2 px-3.5 text-[11px] font-bold text-[#839087] tracking-[2px] uppercase">
        SHOP MANAGEMENT
      </p>
      {links.map(([icon, label]) => renderLink(icon, label))}
    </>
  )
}

