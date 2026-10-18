import { useEffect, useState } from 'react'

export default function LanguageSettings({ value = 'en', onSave }) {
  const [language, setLanguage] = useState(value)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setLanguage(value), [value])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const saved = await onSave(language)
      if (!saved) throw new Error('Language could not be saved.')
      setMessage('Language saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold mb-4">Application language</h2>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1 flex flex-col gap-1.5 text-sm font-semibold text-[#173b32]">
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-[#dfe4dc] bg-white text-sm">
            <option value="en">English</option>
            <option value="ur">اردو</option>
          </select>
        </label>
        <button type="submit" disabled={saving || language === value} className="h-11 px-5 rounded-xl bg-[#155b4b] disabled:opacity-60 text-white text-sm font-semibold">
          {saving ? 'Saving…' : 'Save language'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-[#155b4b]" role="status">{message}</p>}
    </section>
  )
}
