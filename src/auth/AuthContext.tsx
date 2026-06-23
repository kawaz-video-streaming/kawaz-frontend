import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { App } from '@capacitor/app'
import { apiRequest, AuthError, setUnauthorizedHandler, storeToken, clearToken, tokenReady } from '../api/client'
import { clearAuthImageCache } from '../components/AuthImage'
import { isNative } from '../lib/platform'

const AUTH_KEY = 'kawaz_authed'
const PROFILE_KEY = 'kawaz_profile'

export interface SelectedProfile {
  name: string
  avatarId: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  isAdmin: boolean
  username: string | null
  selectedProfile: SelectedProfile | null
  specialPool: boolean
  selectProfile: (profile: SelectedProfile) => void
  toggleSpecialPool: () => void
  login: (role?: string, username?: string, token?: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(AUTH_KEY) === 'true'
  )
  // Role and username are kept in memory only — not persisted — so they cannot be spoofed via localStorage.
  const [role, setRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [specialPool, setSpecialPool] = useState(false)
  const justLoggedInRef = useRef(false)
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(() => {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? JSON.parse(stored) : null
  })

  const validateSession = useCallback(() => {
    // Wait for the Preferences-backed token to finish hydrating into memory first — otherwise a
    // momentarily-missing cookie (the more evictable of the two credentials) would look like an
    // invalid session before the more durable Preferences token even got a chance to be sent.
    void tokenReady.then(() => apiRequest<{ role?: string; username?: string }>('/user/me'))
      .then((data) => {
        setRole(data.role ?? null)
        setUsername(data.username ?? null)
      })
      .catch((err) => {
        if (err instanceof AuthError) {
          localStorage.removeItem(AUTH_KEY)
          setIsAuthenticated(false)
        }
      })
  }, [])

  // On mount, if we think the user is authenticated, verify with the server and restore role + username.
  // The cookie is sent automatically; the backend is the source of truth.
  useEffect(() => {
    if (!isAuthenticated) return
    if (justLoggedInRef.current) {
      justLoggedInRef.current = false
      return
    }
    validateSession()
  }, [isAuthenticated, validateSession])

  // Native sessions can sit backgrounded for days without the app ever remounting, so the mount-time
  // check above never re-fires on its own — re-validate whenever the app comes back to the foreground.
  useEffect(() => {
    if (!isNative) return
    let handle: { remove: () => void } | null = null
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isAuthenticated) validateSession()
    }).then((h) => { handle = h })
    return () => handle?.remove()
  }, [isAuthenticated, validateSession])

  // Any 401 anywhere (not just /user/me) re-checks against /user/me rather than logging out directly —
  // some endpoints (e.g. requireAdmin) also respond 401 for permission reasons, not just an invalid token.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (isAuthenticated) validateSession()
    })
    return () => setUnauthorizedHandler(() => {})
  }, [isAuthenticated, validateSession])

  const login = useCallback((newRole?: string, newUsername?: string, token?: string) => {
    justLoggedInRef.current = true
    localStorage.setItem(AUTH_KEY, 'true')
    setIsAuthenticated(true)
    setRole(newRole ?? null)
    setUsername(newUsername ?? null)
    if (token) storeToken(token)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    clearToken()
    clearAuthImageCache()
    setIsAuthenticated(false)
    setRole(null)
    setUsername(null)
    setSelectedProfile(null)
    setSpecialPool(false)
    localStorage.removeItem(PROFILE_KEY)
    queryClient.clear()
  }, [queryClient])

  const toggleSpecialPool = useCallback(() => setSpecialPool((p) => !p), [])

  const selectProfile = useCallback((profile: SelectedProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    setSelectedProfile(profile)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin: role === 'admin', username, selectedProfile, specialPool, selectProfile, toggleSpecialPool, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
