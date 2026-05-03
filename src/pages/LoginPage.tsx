import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Input } from '../components/ui/input'
import { useAuth } from '../auth/useAuth'

type Mode = 'login' | 'signup' | 'forgot'

const validateUsername = (v: string) => v.length >= 3
const validatePassword = (v: string) => v.length >= 12
const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export const LoginPage = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inlineMessage, setInlineMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const usernameValid = validateUsername(username)
  const passwordValid = validatePassword(password)
  const emailValid = validateEmail(email)
  const canSubmit =
    mode === 'forgot'
      ? emailValid
      : usernameValid && passwordValid && (mode === 'login' || emailValid)

  const switchMode = (next: Mode) => {
    setMode(next)
    setInlineMessage(null)
  }

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setInlineMessage(null)

    if (mode === 'forgot') {
      try {
        await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        setInlineMessage({ type: 'success', text: 'If that email is registered, a reset link has been sent.' })
      } catch {
        setInlineMessage({ type: 'success', text: 'If that email is registered, a reset link has been sent.' })
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup'
      const body = mode === 'login'
        ? { username, password }
        : { username, password, email }
      const response = await fetch(`/api${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (mode === 'signup' && response.status === 202) {
        setInlineMessage({ type: 'success', text: 'Your account is pending admin approval.' })
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || `Request failed with status ${response.status}`)
      }

      login(undefined, username)
      void navigate('/profiles')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
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
          <p className="mt-3 text-sm text-zinc-400">
            {mode === 'login' ? 'Sign in to continue watching' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {mode === 'forgot' ? (
              <div className="flex flex-col gap-1.5">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={[
                    'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                    emailTouched && !emailValid ? 'bg-red-950/60 border-red-700' : '',
                  ].join(' ')}
                />
                {emailTouched && !emailValid && (
                  <p className="text-xs text-red-400">Enter a valid email address</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setUsernameTouched(true)}
                    className={[
                      'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                      usernameTouched && !usernameValid ? 'bg-red-950/60 border-red-700' : '',
                    ].join(' ')}
                  />
                  {usernameTouched && !usernameValid && (
                    <p className="text-xs text-red-400">Username must be at least 3 characters</p>
                  )}
                </div>

                {mode === 'signup' && (
                  <div className="flex flex-col gap-1.5">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className={[
                        'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                        emailTouched && !emailValid ? 'bg-red-950/60 border-red-700' : '',
                      ].join(' ')}
                    />
                    {emailTouched && !emailValid && (
                      <p className="text-xs text-red-400">Enter a valid email address</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    className={[
                      'border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500',
                      passwordTouched && !passwordValid ? 'bg-red-950/60 border-red-700' : '',
                    ].join(' ')}
                  />
                  {passwordTouched && !passwordValid && (
                    <p className="text-xs text-red-400">Password must be at least 12 characters</p>
                  )}
                </div>
              </>
            )}

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
              {loading
                ? mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'
                : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors -mt-2"
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </button>
            )}

            {mode !== 'forgot' && (
              <>
                <div className="flex items-center gap-3 -my-1">
                  <div className="h-px flex-1 bg-zinc-700" />
                  <span className="text-xs text-zinc-500">or</span>
                  <div className="h-px flex-1 bg-zinc-700" />
                </div>

                <a
                  href="/auth/google/login"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </a>
              </>
            )}

            <button
              type="button"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => switchMode(mode === 'forgot' ? 'login' : mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : 'Back to sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
