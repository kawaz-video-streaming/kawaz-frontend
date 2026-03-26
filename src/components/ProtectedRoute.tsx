import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'

interface RouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: RouteProps) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const PublicRoute = ({ children }: RouteProps) => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
