import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Input } from '../components/ui/input'
import { useAuth } from '../auth/useAuth'

type Mode = 'login' | 'signup'

const validateUsername = (v: string) => v.length >= 3
const validatePassword = (v: string) => v.length >= 12

export const LoginPage = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const usernameValid = validateUsername(username)
  const passwordValid = validatePassword(password)
  const canSubmit = usernameValid && passwordValid

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup'
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error || `Request failed with status ${response.status}`)
      }
      const data = await response.json() as { role?: string; username?: string }
      login(data.role, data.username ?? username)
      void navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="absolute inset-0 bg-linear-to-br from-zinc-900 via-zinc-950 to-black" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            Kawaz<span className="text-red-500">+</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            {mode === 'login' ? 'Sign in to continue watching' : 'Create your account'}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="mt-1 w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating account...'
                : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>

            <button
              type="button"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
