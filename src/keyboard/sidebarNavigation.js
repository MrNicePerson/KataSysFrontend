export function isTextEditingTarget(target) {
  return Boolean(target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"]'))
}

export function navigationReturnTarget(opener, menuButton, { changedPage = false, doc } = {}) {
  return !changedPage && opener?.isConnected && opener !== doc?.body ? opener : menuButton
}

export function createTripleRightShortcut(onOpen, { now = Date.now, interval = 750, canOpen = () => true } = {}) {
  let count = 0
  let lastRight = 0
  return (event) => {
    if (event.key !== 'ArrowRight' || event.repeat || event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        isTextEditingTarget(event.target) || !canOpen()) {
      count = 0
      return false
    }
    const timestamp = now()
    count = timestamp - lastRight <= interval ? count + 1 : 1
    lastRight = timestamp
    if (count < 3) return false
    count = 0
    event.preventDefault()
    onOpen()
    return true
  }
}

export function handleSidebarKeyDown(event, { items, onClose, closeButton, nav } = {}) {
  if (event.defaultPrevented) return false
  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    event.preventDefault()
    onClose()
    return true
  }
  if (event.key === 'Tab') {
    const focusables = [closeButton, ...items].filter((item) => item && !item.disabled)
    const first = focusables[0]
    const last = focusables.at(-1)
    if (event.shiftKey && event.target === first) {
      event.preventDefault()
      last?.focus()
      return true
    }
    if (!event.shiftKey && event.target === last) {
      event.preventDefault()
      first?.focus()
      return true
    }
    return false
  }
  if (!nav?.contains(event.target)) return false
  if (event.key === 'Enter' || event.key === ' ') {
    // Buttons already activate with Enter and Space.
    return false
  }
  if (event.key === 'ArrowRight') return false // No submenus in the current navigation.
  const index = items.indexOf(event.target)
  if (index < 0) return false
  let next = null
  if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
  if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length]
  if (event.key === 'Home') next = items[0]
  if (event.key === 'End') next = items.at(-1)
  if (!next) return false
  event.preventDefault()
  next.focus()
  return true
}
