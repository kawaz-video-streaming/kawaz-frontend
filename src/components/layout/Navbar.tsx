import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'

export const Navbar = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    void navigate('/login')
  }

  return (
    <nav className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-semibold">
            Kawaz
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Videos
          </Link>
          <Link to="/upload" className="text-sm text-muted-foreground hover:text-foreground">
            Upload
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="cursor-pointer text-sm text-muted-foreground hover:font-semibold hover:text-foreground"
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
