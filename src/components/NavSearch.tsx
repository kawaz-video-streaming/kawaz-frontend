import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Search, X, FolderOpen } from 'lucide-react'
import { useVideos } from '../hooks/useVideos'
import { useCollections } from '../hooks/useCollections'
import type { VideoListItem, CollectionListItem } from '../types/api'

type SearchItem =
  | { type: 'video'; data: VideoListItem }
  | { type: 'collection'; data: CollectionListItem }

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface NavSearchProps {
  open: boolean
  onClose: () => void
}

export const NavSearch = ({ open, onClose }: NavSearchProps) => {
  const navigate = useNavigate()
  const { data: videos } = useVideos()
  const { data: collections } = useCollections()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const trimmed = query.trim().toLowerCase()

  const topLevelItems: SearchItem[] = [
    ...(collections?.filter((c) => !c.collectionId) ?? []).map((c): SearchItem => ({ type: 'collection', data: c })),
    ...(videos?.filter((v) => !v.collectionId) ?? []).map((v): SearchItem => ({ type: 'video', data: v })),
  ]

  const results = trimmed
    ? topLevelItems.filter(
        (item) =>
          item.data.title.toLowerCase().includes(trimmed) ||
          (item.data.description ?? '').toLowerCase().includes(trimmed),
      )
    : null

  const handleSelect = (item: SearchItem) => {
    onClose()
    void navigate(item.type === 'collection' ? `/collections/${item.data._id}` : `/videos/${item.data._id}`)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-8">
        <Search size={20} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search videos and collections..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close search"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8">
        {results === null ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            Start typing to search your library.
          </p>
        ) : results.length === 0 ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-border/50 py-2">
            {results.map((item) => (
              <li key={`${item.type}-${item.data._id}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-4 py-3 text-left transition-colors hover:bg-accent/50 rounded-xl px-3"
                >
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={
                        item.type === 'collection'
                          ? `/api/mediaCollection/${item.data._id}/thumbnail`
                          : `/api/media/${item.data._id}/thumbnail`
                      }
                      alt={item.data.title}
                      className="h-full w-full object-cover"
                    />
                    {item.type === 'collection' && (
                      <div className="absolute bottom-1 left-1">
                        <span className="flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white/90">
                          <FolderOpen size={9} />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.data.title}</p>
                    {item.type === 'video' && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDuration((item.data as VideoListItem).durationInMs)}
                      </p>
                    )}
                    {item.data.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.data.description}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  )
}
