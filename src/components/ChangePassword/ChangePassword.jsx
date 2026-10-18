import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const initialPasswords = { oldPassword: '', newPassword: '', confirmPassword: '' }

export default function ChangePassword({ onChangePassword }) {
  const [passwords, setPasswords] = useState(initialPasswords)
  const [visible, setVisible] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (field, value) => {
    setPasswords((current) => ({ ...current, [field]: value }))
    setMessage('')
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (passwords.newPassword.length < 12) {
      setError('New password must be at least 12 characters long.')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await onChangePassword?.({
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      })
      setPasswords(initialPasswords)
      setMessage('Password changed successfully.')
    } catch (issue) {
      setError(issue.message || 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    ['oldPassword', 'Old Password'],
    ['newPassword', 'New Password'],
    ['confirmPassword', 'Confirm New Password'],
  ]

  return (
    <section className="p-5 sm:p-7 rounded-2xl bg-white border border-[#e2e6df] shadow-panel">
      <h2 className="text-[#173b32] text-lg sm:text-xl font-bold pb-3 border-b border-[#edf0eb] mb-4">
        Change Password
      </h2>
      <form onSubmit={submit} className="space-y-4">
        {fields.map(([name, label]) => (
          <label key={name} className="flex flex-col gap-1.5 text-xs sm:text-sm font-semibold text-[#173b32]">
            {label}
            <span className="relative">
              <input
                name={name}
                type={visible[name] ? 'text' : 'password'}
                autoComplete={name === 'oldPassword' ? 'current-password' : 'new-password'}
                minLength={name === 'oldPassword' ? undefined : 12}
                value={passwords[name]}
                onChange={(event) => update(name, event.target.value)}
                required
                disabled={saving}
                className="w-full h-11 px-3.5 pr-12 rounded-xl border border-[#dfe4dc] bg-white text-sm text-[#173b32] focus:outline-none focus:border-[#155b4b] disabled:opacity-60"
              />
              <button
                type="button"
                aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                aria-pressed={Boolean(visible[name])}
                onClick={() => setVisible((current) => ({ ...current, [name]: !current[name] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078] hover:text-[#155b4b]"
              >
                {visible[name] ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
        ))}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="text-sm text-[#155b4b]" role="status">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full h-11 rounded-xl bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-xs"
        >
          {saving ? 'Changing password…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
