import { useCallback, useRef } from 'react'
import { handleKeyboardScopeKeyDown } from './navigation.js'

// Attach ref and onKeyDown to an opted-in form or dialog root.
// Child controls handle their own keys first; this hook respects defaultPrevented.
export function useKeyboardScope({ onEscape, trapFocus = false } = {}) {
  const ref = useRef(null)
  const onKeyDown = useCallback((event) => {
    handleKeyboardScopeKeyDown(event, { scope: ref.current, onEscape, trapFocus })
  }, [onEscape, trapFocus])
  return { ref, onKeyDown }
}
