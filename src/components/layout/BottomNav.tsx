import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { FolderPlus, Image, Loader2, Tag, Upload, UserPlus } from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { usePendingMedia } from '../../hooks/usePendingMedia'
import { usePendingUsers } from '../../hooks/usePendingUsers'
import { MediaProcessingPanel } from '../MediaProcessingPanel'
import { PendingSignupsPanel } from '../PendingSignupsPanel'

const PANEL_CLASS = 'fixed inset-x-4 bottom-20 z-[60]'

export const BottomNav = () => {
  const { isAdmin } = useAuth()
  const location = useLocation()
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

  if (!isAdmin) return null

  const active = (path: string) => location.pathname === path

  const linkCls = (path: string) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${active(path) ? 'text-red-500' : 'text-muted-foreground'}`

  const btnCls = (on: boolean) =>
    `relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${on ? 'text-red-500' : 'text-muted-foreground'}`

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around">
        <Link to="/upload" className={linkCls('/upload')}>
          <Upload size={20} />
          <span>Upload</span>
        </Link>

        <Link to="/collections/new" className={linkCls('/collections/new')}>
          <FolderPlus size={20} />
          <span>Collection</span>
        </Link>

        <Link to="/admin/avatars" className={linkCls('/admin/avatars')}>
          <Image size={20} />
          <span>Avatars</span>
        </Link>

        <Link to="/admin/genres" className={linkCls('/admin/genres')}>
          <Tag size={20} />
          <span>Genres</span>
        </Link>

        <div ref={processingRef}>
          <button
            onClick={() => { setProcessingOpen(o => !o); setSignupsOpen(false) }}
            className={btnCls(processingOpen)}
            aria-label="Media processing"
          >
            <span className="relative">
              <Loader2
                size={20}
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
            onClick={() => { setSignupsOpen(o => !o); setProcessingOpen(false) }}
            className={btnCls(signupsOpen)}
            aria-label="Pending signups"
          >
            <span className="relative">
              <UserPlus size={20} />
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
      </div>
    </div>
  )
}
