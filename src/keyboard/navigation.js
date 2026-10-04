const FOCUSABLE = 'input, select, textarea, button, a[href], summary, [tabindex]'
const FIELD_TYPES = new Set(['text', 'number', 'email', 'tel', 'url', 'password', 'search', 'date', 'time', 'datetime-local'])
const VERTICAL_FIELD_TYPES = new Set(['text', 'email', 'tel', 'url', 'password'])

export function isAvailableControl(element) {
  if (!element || element.disabled || element.readOnly || element.tabIndex < 0) return false
  if (element.closest?.('[hidden], [inert], [aria-hidden="true"], fieldset[disabled]')) return false
  const closedDetails = element.closest?.('details:not([open])')
  if (closedDetails && element !== closedDetails.querySelector('summary')) return false
  const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element)
  return style?.display !== 'none' && style?.visibility !== 'hidden'
}

function isEnterField(element) {
  if (element.dataset?.keyboardNative !== undefined || element.isContentEditable) return false
  if (element.matches?.('textarea')) return false
  if (element.matches?.('select')) return !element.multiple
  if (element.matches?.('input[type="radio"], input[type="checkbox"]')) return true
  return element.matches?.('input') && FIELD_TYPES.has(element.type || 'text') && !isCustomChoice(element)
}

function isCustomChoice(element) {
  return element.getAttribute?.('aria-expanded') === 'true' ||
    element.getAttribute?.('aria-autocomplete') !== null && element.getAttribute?.('aria-autocomplete') !== undefined ||
    element.getAttribute?.('role') === 'combobox' || Boolean(element.getAttribute?.('list'))
}

function isLogicalControl(element) {
  return isAvailableControl(element) && (
    element.matches?.('select:not([multiple])') ||
    element.matches?.('textarea') ||
    element.matches?.('input') && (FIELD_TYPES.has(element.type || 'text') || element.type === 'radio' || element.type === 'checkbox') ||
    element.matches?.('button[type="submit"], button:not([type])') ||
    element.dataset?.enterNext !== undefined
  )
}

function logicalControls(scope, current) {
  const form = current.closest?.('form')
  const container = form && scope.contains(form) ? form : scope
  return [...container.querySelectorAll(FOCUSABLE)].filter(isLogicalControl)
}

export function adjacentControl(scope, current, direction) {
  const controls = logicalControls(scope, current)
  const currentIndex = controls.indexOf(current)
  return currentIndex < 0 ? null : controls[currentIndex + direction] || null
}

export function nextEnterControl(scope, current) {
  const controls = logicalControls(scope, current)
  const index = controls.indexOf(current)
  if (index < 0) return null
  let next = index + 1
  if (current.type === 'radio' && current.name) {
    while (controls[next]?.type === 'radio' && controls[next].name === current.name) next++
  }
  return controls[next] || null
}

export function handleKeyboardScopeKeyDown(event, { scope, onEscape, trapFocus = false } = {}) {
  if (!scope || event.defaultPrevented || event.isComposing || event.key === 'Process') return false
  if (!scope.contains(event.target)) return false
  if (event.key === 'Tab' && trapFocus) {
    const controls = [...scope.querySelectorAll(FOCUSABLE)].filter(isAvailableControl)
    const first = controls[0]
    const last = controls.at(-1)
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
  if (event.key === 'Escape' && onEscape) {
    if (event.target.getAttribute?.('aria-expanded') === 'true') return false
    event.preventDefault()
    onEscape()
    return true
  }
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || !isAvailableControl(event.target)) return false
  let next = null
  if (event.key === 'Enter' && isEnterField(event.target)) {
    next = nextEnterControl(scope, event.target)
    if ((event.target.type === 'radio' || event.target.type === 'checkbox') && next) {
      event.preventDefault()
      event.target.click()
      next.focus()
      return true
    }
    // An Enter used to finish a field must never implicitly submit a form.
    // Saving remains an explicit activation of the focused action.
    if (!next) {
      event.preventDefault()
      return true
    }
  }
  if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
      event.target.matches?.('input') && VERTICAL_FIELD_TYPES.has(event.target.type || 'text') &&
      event.target.dataset?.keyboardNative === undefined && !isCustomChoice(event.target)) {
    next = adjacentControl(scope, event.target, event.key === 'ArrowDown' ? 1 : -1)
  }
  if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      event.target.matches?.('button') && event.target.closest?.('[data-keyboard-horizontal]')) {
    const group = event.target.closest('[data-keyboard-horizontal]')
    const buttons = [...group.querySelectorAll('button')].filter(isAvailableControl)
    next = buttons[buttons.indexOf(event.target) + (event.key === 'ArrowRight' ? 1 : -1)] || null
  }
  if (!next) return false
  event.preventDefault()
  next.focus()
  return true
}

export function installGlobalKeyboardNavigation(doc) {
  const onKeyDown = (event) => {
    const scope = event.target?.closest?.('form, [data-keyboard-scope], main')
    if (scope && scope.dataset?.keyboardNative === undefined) handleKeyboardScopeKeyDown(event, { scope })
  }
  doc.addEventListener('keydown', onKeyDown)
  return () => doc.removeEventListener('keydown', onKeyDown)
}
