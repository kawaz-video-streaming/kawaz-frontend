import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth()

  // TODO: remove bypass once kawaz-backend exposes POST /auth/login
  const bypassAuth = true

  if (!bypassAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
