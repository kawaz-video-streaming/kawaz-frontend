import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuth } from '../auth/useAuth'

type Mode = 'login' | 'signup'

export const LoginPage = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const uErr = username.length < 3 ? 'Username must be at least 3 characters' : null
    const pErr = password.length < 12 ? 'Password must be at least 12 characters' : null
    setUsernameError(uErr)
    setPasswordError(pErr)
    if (uErr || pErr) return

    setError(null)
    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/signup'
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(body || `Request failed with status ${response.status}`)
      }
      const { token } = await response.json() as { token: string }
      login(token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Kawaz</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setUsernameError(null) }}
              />
              {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(null) }}
              />
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating account...'
                : mode === 'login' ? 'Sign in' : 'Sign up'}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
