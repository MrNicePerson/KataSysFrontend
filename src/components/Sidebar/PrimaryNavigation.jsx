const links = [
  ['▤', 'Bills & receipts'],
  ['↩', 'Customer Returns'],
  ['▧', 'Orders & held bills'],
  ['↗', 'Supplier return history'],
  ['⚠', 'Defects & claims'],
]

export default function PrimaryNavigation({ renderLink }) {
  return <>{links.map(([icon, label]) => renderLink(icon, label))}</>
}
