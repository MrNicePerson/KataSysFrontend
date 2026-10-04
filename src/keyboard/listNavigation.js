const EDITABLE = 'input, select, textarea, [contenteditable], [role="textbox"], [role="combobox"]'

export function handleKeyboardListKeyDown(event) {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
  if (event.target?.closest?.(EDITABLE)) return false
  const list = event.target?.closest?.('[data-keyboard-list]')
  const row = event.target?.closest?.('[data-keyboard-row]')
  if (!list || !row || !list.contains(row)) return false
  const rows = [...list.querySelectorAll('[data-keyboard-row]')].filter((item) => !item.hidden)
  const index = rows.indexOf(row)
  if (index < 0) return false
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const next = rows[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (!next) return false
    event.preventDefault()
    next.focus()
    return true
  }
  if (event.key === 'Enter' && !event.repeat && event.target === row) {
    const primary = row.querySelector('[data-keyboard-primary]:not(:disabled)')
    if (!primary) return false
    event.preventDefault()
    primary.click()
    return true
  }
  return false
}

export function installKeyboardListNavigation(doc) {
  doc.addEventListener('keydown', handleKeyboardListKeyDown)
  return () => doc.removeEventListener('keydown', handleKeyboardListKeyDown)
}
