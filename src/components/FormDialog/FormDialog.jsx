import { useEffect, useRef, useState } from 'react'
import { useKeyboardScope } from '../../keyboard/useKeyboardScope.js'

export default function FormDialog({ title, fields, onClose, onSave }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)
  const keyboard = useKeyboardScope({ onEscape: onClose, trapFocus: true })
  useEffect(() => {
    const opener = document.activeElement
    keyboard.ref.current?.querySelector('input, select, textarea')?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(fields.map((field) => {
      const value = formData.get(field.name)
      return [field.name, field.type === 'number' ? Number(value) : String(value ?? '').trim()]
    }))
    try {
      const saved = await onSave(values)
      if (saved === null || saved === false) return
      setError('')
    } catch (issue) {
      setError(issue.message || 'Could not save this record.')
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#203832]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={keyboard.ref}
        onKeyDown={keyboard.onKeyDown}
        className="w-full max-w-lg p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#edf0eb]">
          <h2 className="text-[#173b32] text-xl font-bold">{title}</h2>
          <button
            type="button"
            className="w-8 h-8 grid place-items-center rounded-lg text-2xl text-[#718078] hover:bg-[#f6f8f1] cursor-pointer"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="p-3 rounded-xl bg-red-50 text-red-700 text-xs sm:text-sm font-medium border border-red-200" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-4">
            {fields.map((field) => (
              <label className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]" key={field.name}>
                <span>{field.label}</span>
                {field.options ? (
                  <select
                    name={field.name}
                    defaultValue={field.defaultValue ?? field.options[0].value}
                    required={field.required !== false}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  >
                    {field.options.map((option) => (
                      <option value={option.value} key={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type ?? 'text'}
                    min={field.min}
                    step={field.step}
                    defaultValue={field.defaultValue}
                    required={field.required !== false}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b]"
                  />
                )}
              </label>
            ))}
          </div>

          <div data-keyboard-horizontal className="flex items-center justify-end gap-3 pt-4 border-t border-[#edf0eb]">
            <button
              className="px-4 py-2 rounded-xl border border-[#dfe4dc] text-xs sm:text-sm font-semibold text-[#12332d] hover:bg-[#f6f8f1] cursor-pointer"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer active:scale-98"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
