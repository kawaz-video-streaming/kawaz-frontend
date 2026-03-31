import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiRequest } from '../api/client'

const AUTH_KEY = 'kawaz_authed'

interface AuthContextValue {
  isAuthenticated: boolean
  isAdmin: boolean
  username: string | null
  login: (role?: string, username?: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(AUTH_KEY) === 'true'
  )
  // Role and username are kept in memory only — not persisted — so they cannot be spoofed via localStorage.
  const [role, setRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  // On mount, if we think the user is authenticated, verify with the server and restore role + username.
  // The cookie is sent automatically; the backend is the source of truth.
  useEffect(() => {
    if (!isAuthenticated) return
    apiRequest<{ role?: string; username?: string }>('/auth/me')
      .then((data) => {
        setRole(data.role ?? null)
        setUsername(data.username ?? null)
      })
      .catch(() => {
        localStorage.removeItem(AUTH_KEY)
        setIsAuthenticated(false)
      })
  }, [isAuthenticated])

  const login = useCallback((newRole?: string, newUsername?: string) => {
    localStorage.setItem(AUTH_KEY, 'true')
    setIsAuthenticated(true)
    setRole(newRole ?? null)
    setUsername(newUsername ?? null)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    setRole(null)
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin: role === 'admin', username, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
