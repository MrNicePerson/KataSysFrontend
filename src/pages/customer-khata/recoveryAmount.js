export function normalizeRecoveryAmount(value) {
  const text = String(value ?? '')
  return text.replace(/^0+(?=\d)/, '')
}

export function recoveryLines(customers, amounts) {
  return customers.flatMap((customer) => {
    const amount = Number(amounts[customer.id] ?? 0)
    return Number.isFinite(amount) && amount > 0 ? [{ accountId: customer.id, amount }] : []
  })
}

export function focusNextRecoveryField(event, root) {
  if (event.key !== 'Enter' || event.isComposing || !root) return false
  event.preventDefault()
  event.stopPropagation()
  const inputs = [...root.querySelectorAll('[data-recovery-amount]')]
  inputs[inputs.indexOf(event.currentTarget) + 1]?.focus()
  return true
}
