export function preventRepeatedActionKey(event) {
  if (!event.repeat || !['Enter', ' ', 'Spacebar'].includes(event.key)) return false
  const target = event.target
  if (!target?.matches?.('button, input[type="submit"], input[type="button"], [role="button"]')) return false
  event.preventDefault()
  event.stopPropagation?.()
  return true
}

export function installActionRepeatGuard(doc) {
  doc.addEventListener('keydown', preventRepeatedActionKey, true)
  return () => doc.removeEventListener('keydown', preventRepeatedActionKey, true)
}
