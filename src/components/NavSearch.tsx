import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, FolderOpen } from 'lucide-react'
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

export const NavSearch = () => {
  const navigate = useNavigate()
  const { data: videos } = useVideos()
  const { data: collections } = useCollections()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    setOpen(false)
    setQuery('')
    void navigate(item.type === 'collection' ? `/collections/${item.data._id}` : `/videos/${item.data._id}`)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative w-28 sm:w-40 md:w-52">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          className="h-8 w-full rounded-lg border border-border bg-accent/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:border-red-500/60 focus:bg-background focus:outline-none focus:ring-1 focus:ring-red-500/30"
        />
      </div>

      {open && results !== null && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="max-h-[480px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
              {results.map((item) => (
                <li key={`${item.type}-${item.data._id}`} className="border-b border-border/50 last:border-0">
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/60"
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
      )}
    </div>
  )
}
