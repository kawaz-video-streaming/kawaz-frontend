import { useState, type SyntheticEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Input } from '../components/ui/input'

const validatePassword = (v: string) => v.length >= 12

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inlineMessage, setInlineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const newPasswordValid = validatePassword(newPassword)
  const passwordsMatch = newPassword === confirmPassword
  const canSubmit = newPasswordValid && passwordsMatch && confirmPassword.length > 0

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!canSubmit || !token) return

    setLoading(true)
    setInlineMessage(null)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || 'Failed to reset password')
      }

      setInlineMessage({ type: 'success', text: 'Password updated successfully. Redirecting to login...' })
      setTimeout(() => void navigate('/login'), 2000)
    } catch (err) {
      setInlineMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reset password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-zinc-950 to-black" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            Kawaz<span className="text-red-500">+</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400">Set a new password</p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
          {!token ? (
            <div className="text-center">
              <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300 ring-1 ring-red-700">
                Invalid reset link. Please request a new one.
              </p>
              <button
                type="button"
                className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={() => void navigate('/login')}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setNewPasswordTouched(true)}
                  className={[
                    'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                    newPasswordTouched && !newPasswordValid ? 'bg-red-950/60 border-red-700' : '',
                  ].join(' ')}
                />
                {newPasswordTouched && !newPasswordValid && (
                  <p className="text-xs text-red-400">Password must be at least 12 characters</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmPasswordTouched(true)}
                  className={[
                    'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                    confirmPasswordTouched && confirmPassword.length > 0 && !passwordsMatch ? 'bg-red-950/60 border-red-700' : '',
                  ].join(' ')}
                />
                {confirmPasswordTouched && confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              {inlineMessage && (
                <p className={[
                  'rounded-lg px-3 py-2 text-sm text-center',
                  inlineMessage.type === 'success'
                    ? 'bg-green-950/60 text-green-300 ring-1 ring-green-700'
                    : 'bg-red-950/60 text-red-300 ring-1 ring-red-700',
                ].join(' ')}>
                  {inlineMessage.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="mt-1 w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Updating...' : 'Set new password'}
              </button>

              <button
                type="button"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={() => void navigate('/login')}
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
