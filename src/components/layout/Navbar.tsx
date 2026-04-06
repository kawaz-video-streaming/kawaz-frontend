import { Link, useNavigate } from 'react-router'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { useTheme } from '../../theme/ThemeContext'

export const Navbar = () => {
  const { logout, isAdmin, username } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    void navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Navigation Links */}
        <div className="flex items-center gap-6">
          {isAdmin && (
            <Link to="/upload" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Upload
            </Link>
          )}
        </div>

        {/* Center: Kawaz+ Logo & Welcome Message */}
        <div className="flex flex-col items-center">
          <Link to="/" className="text-lg font-extrabold tracking-tight">
            Kawaz<span className="text-red-500">+</span>
          </Link>
          <p className="text-xs text-muted-foreground">Welcome back, <span className="font-semibold text-foreground">{username}</span>! 👋</p>
        </div>

        {/* Right: Theme Toggle & Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg p-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </nav >
  )
}
