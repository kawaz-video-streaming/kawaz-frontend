import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sun, Moon, LogOut, UserCircle2, Users, Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { useTheme } from '../../theme/ThemeContext'
import { avatarImageUrl } from '../../api/avatar'
import { usePendingMedia } from '../../hooks/usePendingMedia'
import { usePendingUsers } from '../../hooks/usePendingUsers'
import { MediaProcessingPanel } from '../MediaProcessingPanel'
import { PendingSignupsPanel } from '../PendingSignupsPanel'
import { NavSearch } from '../NavSearch'

export const Navbar = () => {
  const { logout, isAdmin, username, selectedProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [processingOpen, setProcessingOpen] = useState(false)
  const [signupsOpen, setSignupsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef<HTMLDivElement>(null)
  const signupsRef = useRef<HTMLDivElement>(null)
  const { data: pendingItems } = usePendingMedia(isAdmin, processingOpen)
  const { data: pendingSignups } = usePendingUsers(isAdmin, signupsOpen)

  // Close avatar menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close processing panel on outside click
  useEffect(() => {
    if (!processingOpen) return
    const handler = (e: MouseEvent) => {
      if (processingRef.current && !processingRef.current.contains(e.target as Node)) {
        setProcessingOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [processingOpen])

  // Close signups panel on outside click
  useEffect(() => {
    if (!signupsOpen) return
    const handler = (e: MouseEvent) => {
      if (signupsRef.current && !signupsRef.current.contains(e.target as Node)) {
        setSignupsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [signupsOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    void navigate('/login')
  }

  const handleChangeProfile = () => {
    setMenuOpen(false)
    void navigate('/profiles')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center px-3 py-3 sm:px-6">
        {/* Left: Navigation Links — flex-1 so center stays naturally centered */}
        <div className="flex flex-1 items-center gap-3 lg:gap-6">
          {isAdmin && (
            <>
              <Link to="/upload" className="hidden lg:inline text-sm text-muted-foreground transition-colors hover:text-foreground">
                Upload
              </Link>
              <Link to="/collections/new" className="hidden lg:inline text-sm text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
                New Collection
              </Link>
              <Link to="/admin/avatars" className="hidden lg:inline text-sm text-muted-foreground transition-colors hover:text-foreground">
                Avatars
              </Link>
            </>
          )}
        </div>

        {/* Center: Kawaz+ Logo & Welcome Message */}
        <div className="flex shrink-0 items-center gap-2 px-2">
          <Link to="/" className="text-lg font-extrabold tracking-tight whitespace-nowrap">
            Kawaz<span className="text-red-500">+</span>
          </Link>
          <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:block">
            Welcome, <span className="font-semibold text-foreground">{selectedProfile?.name ?? username}</span>
          </span>
        </div>

        {/* Right: Theme Toggle + Processing + Search + Avatar Menu — flex-1 justified end */}
        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Processing panel (admin only) */}
          {isAdmin && (
            <div ref={processingRef} className="relative">
              <button
                onClick={() => setProcessingOpen((o) => !o)}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Media processing status"
              >
                <Loader2 size={16} className={pendingItems && pendingItems.length > 0 ? 'animate-spin text-blue-500' : ''} />
                {pendingItems && pendingItems.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingItems.length > 9 ? '9+' : pendingItems.length}
                  </span>
                )}
              </button>
              {processingOpen && <MediaProcessingPanel onClose={() => setProcessingOpen(false)} />}
            </div>
          )}

          {/* Pending signups panel (admin only) */}
          {isAdmin && (
            <div ref={signupsRef} className="relative">
              <button
                onClick={() => setSignupsOpen((o) => !o)}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Pending signups"
              >
                <UserPlus size={16} />
                {pendingSignups && pendingSignups.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingSignups.length > 9 ? '9+' : pendingSignups.length}
                  </span>
                )}
              </button>
              {signupsOpen && <PendingSignupsPanel onClose={() => setSignupsOpen(false)} />}
            </div>
          )}

          <NavSearch />

          {/* Avatar button + dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-accent text-muted-foreground transition-colors hover:border-red-500/50 hover:text-foreground"
              aria-label="Account menu"
            >
              {selectedProfile ? (
                <img src={avatarImageUrl(selectedProfile.avatarId)} alt={selectedProfile.name} className="h-full w-full object-cover" style={{ transform: 'translateZ(0)', imageRendering: 'auto' }} />
              ) : (
                <UserCircle2 size={18} />
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={handleChangeProfile}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Users size={15} />
                  Change profile
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-red-500"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
