import { useRef } from 'react'

/** A number input that replaces an untouched default zero on first entry. */
export default function DefaultZeroInput({ value, defaultValue, onChange, onFocus, ...props }) {
  const lastValue = useRef(String(value ?? defaultValue ?? ''))
  const untouchedZero = useRef(lastValue.current === '0')

  if (value !== undefined && String(value ?? '') !== lastValue.current) {
    lastValue.current = String(value ?? '')
    untouchedZero.current = lastValue.current === '0'
  }

  const handleFocus = (event) => {
    if (event.currentTarget.value === '0') {
      try { event.currentTarget.select() } catch { /* Some browsers cannot select number input text. */ }
    }
    onFocus?.(event)
  }

  const handleChange = (event) => {
    let next = event.target.value
    if (untouchedZero.current && lastValue.current === '0' && /^0\d+$/.test(next)) {
      next = next.slice(1)
      event.target.value = next
    }
    lastValue.current = next
    untouchedZero.current = false
    onChange?.(event)
  }

  return (
    <input
      {...props}
      type="number"
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  )
}
