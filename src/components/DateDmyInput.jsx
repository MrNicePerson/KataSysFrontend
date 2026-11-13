import { useEffect, useRef, useState } from 'react'
import { formatDmyDate, parseDmyDate } from '../data/dateDmy.js'

export default function DateDmyInput({ value = '', onChange, className = '', onInvalid, ...props }) {
  const [text, setText] = useState(() => formatDmyDate(value))
  const inputRef = useRef(null)
  useEffect(() => setText(formatDmyDate(value)), [value])
  const change = (event) => {
    const next = event.target.value
    setText(next)
    const canonical = next.trim() ? parseDmyDate(next) : ''
    inputRef.current?.setCustomValidity(next.trim() && !canonical ? 'Enter a real date in D/M/YYYY format.' : '')
    if (canonical || !next.trim()) onChange?.({ target: { value: canonical }, currentTarget: { value: canonical } })
  }
  return <input {...props} ref={inputRef} type="text" inputMode="numeric" placeholder="D/M/YYYY" value={text} onChange={change} onBlur={() => { if (text.trim() && !parseDmyDate(text)) onInvalid?.('Enter a real date in D/M/YYYY format.') }} className={className} />
}
