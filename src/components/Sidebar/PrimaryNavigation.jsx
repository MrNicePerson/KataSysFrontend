const links = [
  ['▤', 'Bills & receipts'],
  ['↩', 'Customer returns'],
  ['▧', 'Orders & held bills'],
  ['↗', 'Supplier returns'],
  ['⚠', 'Defects & claims'],
]

export default function PrimaryNavigation({ renderLink }) {
  return <>{links.map(([icon, label]) => renderLink(icon, label))}</>
}

