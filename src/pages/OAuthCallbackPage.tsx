import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'

export const OAuthCallbackPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const pending = new URLSearchParams(window.location.search).get('pending') === 'true'
    if (pending) {
      void navigate('/login?pending=true', { replace: true })
    } else {
      login()
      void navigate('/profiles', { replace: true })
    }
  }, [login, navigate])

  return null
}
