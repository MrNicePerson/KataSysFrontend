import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { formatDmyDate, parseDmyDate } from '../data/dateDmy.js'

export default function DateDmyInput({ value, defaultValue = '', onChange, className = '', name, required, onBlur, ...props }) {
  const current = value ?? defaultValue
  const [text, setText] = useState(() => formatDmyDate(current))
  const textRef = useRef(null)
  const pickerRef = useRef(null)
  useEffect(() => setText(formatDmyDate(current)), [current])
  const change = (event) => {
    const next = event.target.value
    setText(next)
    const iso = parseDmyDate(next)
    textRef.current?.setCustomValidity(next.trim() && !iso ? 'Enter a real date in D/M/YYYY format.' : '')
    if (iso || !next.trim()) onChange?.({ target: { value: iso }, currentTarget: { value: iso } })
  }
  const choose = (event) => {
    const iso = event.target.value
    setText(formatDmyDate(iso))
    textRef.current?.setCustomValidity('')
    onChange?.({ target: { value: iso }, currentTarget: { value: iso } })
  }
  const openCalendar = () => {
    try {
      if (pickerRef.current?.showPicker) pickerRef.current.showPicker()
      else pickerRef.current?.click()
    }
    catch { pickerRef.current?.click() }
  }
  return <span className="relative inline-block align-middle">
    <input {...props} ref={textRef} type="text" inputMode="numeric" placeholder="D/M/YYYY" value={text} required={required} onChange={change} onBlur={(event) => { onBlur?.(event); const valid = !text.trim() || Boolean(parseDmyDate(text)); textRef.current?.setCustomValidity(valid ? '' : 'Enter a real date in D/M/YYYY format.') }} className={`${className} pr-9`} />
    <button type="button" aria-label="Open calendar" title="Open calendar" onClick={openCalendar} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#718078] hover:bg-[#edf5ee]"><CalendarDays size={15} /></button>
    <input ref={pickerRef} type="date" name={name} value={parseDmyDate(text)} onChange={choose} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0" />
  </span>
}
