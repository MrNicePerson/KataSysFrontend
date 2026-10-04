import { useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function SignIn({ onSignIn, allowRegistration = false, loading = false }) {
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submissionRef = useRef(false)

  const submit = async (event) => {
    event.preventDefault()
    if (submissionRef.current || loading) return
    submissionRef.current = true
    setSubmitting(true)
    setError('')
    const name = new FormData(event.currentTarget).get('name')
    try {
      await onSignIn({ name, email, password, registration: creatingAdmin })
    } catch (issue) {
      setError(issue.message || 'Could not sign in.')
    } finally {
      submissionRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-[#f3f6f0]">
      <section className="w-full max-w-md p-6 sm:p-8 bg-white border border-[#e2e6df] rounded-2xl shadow-panel">
        <p className="text-[#70847b] text-xs font-bold tracking-[3px] uppercase mb-2">KataSys</p>
        <h1 className="text-[#173b32] text-2xl sm:text-3xl font-bold">{creatingAdmin ? 'Create administrator' : 'Sign in'}</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {creatingAdmin && <label className="block text-sm font-semibold text-[#173b32]">
            Name
            <input name="name" autoComplete="name" className="mt-1.5 w-full h-11 px-3.5 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]" required />
          </label>}
          <label className="block text-sm font-semibold text-[#173b32]">
            Email
            <input
              autoComplete="username"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full h-11 px-3.5 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-[#173b32]">
            Password
            <div className="relative mt-1.5">
              <input
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                minLength={creatingAdmin ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full h-11 px-3.5 pr-11 rounded-lg border border-[#dfe4dc] bg-white text-sm focus:outline-none focus:border-[#155b4b]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1 w-9 h-9 grid place-items-center rounded-md text-[#718078] hover:bg-[#f6f8f1]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full h-11 rounded-lg bg-[#155b4b] hover:bg-[#104b3e] disabled:opacity-60 text-white text-sm font-bold"
          >
            {loading || submitting ? 'Please wait…' : creatingAdmin ? 'Create administrator' : 'Sign in'}
          </button>
        </form>
        {allowRegistration && <button type="button" onClick={() => { setCreatingAdmin((value) => !value); setError('') }} className="mt-4 text-sm font-semibold text-[#155b4b] hover:underline">
          {creatingAdmin ? 'Back to sign in' : 'Set up first administrator'}
        </button>}
      </section>
    </main>
  )
}
