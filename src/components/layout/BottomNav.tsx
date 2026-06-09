import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { ArrowDownToLine, Database, FolderPlus, Image, Loader2, Mail, LayoutGrid, Tag, Upload, UserPlus, X } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { usePendingMedia } from '../../hooks/usePendingMedia'
import { usePendingUsers } from '../../hooks/usePendingUsers'
import { MediaProcessingPanel } from '../MediaProcessingPanel'
import { PendingSignupsPanel } from '../PendingSignupsPanel'
import { useOffline } from '../../contexts/OfflineContext'

const PANEL_CLASS = 'fixed inset-x-4 bottom-20 z-[60]'

const ADMIN_LINKS = [
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/collections/new', icon: FolderPlus, label: 'New Collection' },
  { to: '/admin/avatars', icon: Image, label: 'Avatars' },
  { to: '/admin/genres', icon: Tag, label: 'Genres' },
  { to: '/admin/newsletter', icon: Mail, label: 'Newsletter' },
]

export const BottomNav = () => {
  const { isAdmin, specialPool, toggleSpecialPool } = useAuth()
  const { downloadQueue } = useOffline()
  const location = useLocation()
  const [adminSheetOpen, setAdminSheetOpen] = useState(false)
  const [processingOpen, setProcessingOpen] = useState(false)
  const [signupsOpen, setSignupsOpen] = useState(false)
  const processingRef = useRef<HTMLDivElement>(null)
  const signupsRef = useRef<HTMLDivElement>(null)

  const { data: pendingItems } = usePendingMedia(isAdmin, processingOpen)
  const { data: pendingSignups } = usePendingUsers(isAdmin, signupsOpen)

  useEffect(() => {
    if (!processingOpen) return
    const handler = (e: MouseEvent) => {
      if (processingRef.current && !processingRef.current.contains(e.target as Node))
        setProcessingOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [processingOpen])

  useEffect(() => {
    if (!signupsOpen) return
    const handler = (e: MouseEvent) => {
      if (signupsRef.current && !signupsRef.current.contains(e.target as Node))
        setSignupsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [signupsOpen])

  const isAdminPage = ADMIN_LINKS.some(l => location.pathname === l.to)

  const btnCls = (on: boolean) =>
    `relative flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors ${on ? 'text-red-500' : 'text-muted-foreground'}`

  return (
    <>
      {/* Slide-up admin sheet */}
      {isAdmin && adminSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => setAdminSheetOpen(false)}
          />
          {/* Sheet */}
          <div className={`fixed inset-x-0 bottom-0 z-[80] rounded-t-2xl border-t border-border bg-card pb-safe${Capacitor.isNativePlatform() ? ' portrait:pb-8' : ''}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold">Admin</span>
              <button
                onClick={() => setAdminSheetOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col pb-4">
              {ADMIN_LINKS.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setAdminSheetOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-accent ${location.pathname === to ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden landscape:hidden border-t border-border bg-background/95 backdrop-blur-md${Capacitor.isNativePlatform() ? ' portrait:pb-8' : ''}`}
      >
        <div className="flex items-center justify-around">

          {isAdmin && (
            <>
              <button
                onClick={() => { setAdminSheetOpen(o => !o); setProcessingOpen(false); setSignupsOpen(false) }}
                className={btnCls(adminSheetOpen || isAdminPage)}
                aria-label="Admin menu"
              >
                <LayoutGrid size={18} />
                <span>Admin</span>
              </button>

              <button
                onClick={toggleSpecialPool}
                className={btnCls(specialPool)}
                aria-label={specialPool ? 'Switch to regular pool' : 'Switch to special pool'}
              >
                <span className="relative">
                  <Database size={18} />
                  {specialPool && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-purple-500" />
                  )}
                </span>
                <span>Special</span>
              </button>

              <div ref={processingRef}>
                <button
                  onClick={() => { setProcessingOpen(o => !o); setSignupsOpen(false); setAdminSheetOpen(false) }}
                  className={btnCls(processingOpen)}
                  aria-label="Media processing"
                >
                  <span className="relative">
                    <Loader2
                      size={18}
                      className={pendingItems && pendingItems.length > 0 ? 'animate-spin text-blue-500' : ''}
                    />
                    {pendingItems && pendingItems.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {pendingItems.length > 9 ? '9+' : pendingItems.length}
                      </span>
                    )}
                  </span>
                  <span>Processing</span>
                </button>
                {processingOpen && (
                  <MediaProcessingPanel onClose={() => setProcessingOpen(false)} positionClass={PANEL_CLASS} />
                )}
              </div>

              <div ref={signupsRef}>
                <button
                  onClick={() => { setSignupsOpen(o => !o); setProcessingOpen(false); setAdminSheetOpen(false) }}
                  className={btnCls(signupsOpen)}
                  aria-label="Pending signups"
                >
                  <span className="relative">
                    <UserPlus size={18} />
                    {pendingSignups && pendingSignups.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {pendingSignups.length > 9 ? '9+' : pendingSignups.length}
                      </span>
                    )}
                  </span>
                  <span>Signups</span>
                </button>
                {signupsOpen && (
                  <PendingSignupsPanel onClose={() => setSignupsOpen(false)} positionClass={PANEL_CLASS} />
                )}
              </div>
            </>
          )}

          <Link
            to="/downloads"
            onClick={() => { setAdminSheetOpen(false); setProcessingOpen(false); setSignupsOpen(false) }}
            className={btnCls(location.pathname === '/downloads')}
            aria-label="Downloads"
          >
            <span className="relative">
              <ArrowDownToLine size={18} />
              {downloadQueue.length > 0 && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </span>
            <span>Downloads</span>
          </Link>

        </div>
      </div>
    </>
  )
}
