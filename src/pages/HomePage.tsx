import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MEDIA_TAGS } from '../constants/tags'
import { useVideos } from '../hooks/useVideos'
import { getObjectPositionFromFocalPoint } from '../lib/focalPoints'
import type { Coordinates } from '../types/api'

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const VideoThumbnail = ({
  id,
  title,
  focalPoint,
}: {
  id: string
  title: string
  focalPoint: Coordinates
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  return (
    <img
      src={`${import.meta.env.VITE_BACKEND_URL}/media/${id}/thumbnail`}
      alt={title}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
      onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      style={{
        objectPosition: naturalSize
          ? getObjectPositionFromFocalPoint(naturalSize, focalPoint)
          : `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
      }}
    />
  )
}

export const HomePage = () => {
  const navigate = useNavigate()
  const { data: videos, isLoading, isError } = useVideos()
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = activeTag
    ? videos?.filter((v) => v.tags.includes(activeTag))
    : videos

  return (
    <div>
      {/* Hero bar */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-red-600/20 via-red-500/10 to-transparent px-8 py-10 ring-1 ring-red-500/20">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-red-600/10 blur-2xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-red-500">Kawaz+</p>
        <h1 className="relative mt-1 text-4xl font-extrabold tracking-tight">Watch anything.</h1>
        <p className="relative mt-1.5 text-sm text-muted-foreground">Browse and stream your library.</p>
      </div>

      {/* Tag filter bar */}
      {videos && videos.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              activeTag === null
                ? 'border-red-500 bg-red-500/10 text-red-500'
                : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
            ].join(' ')}
          >
            All
          </button>
          {MEDIA_TAGS.map((tag) => {
            const hasVideos = videos.some((v) => v.tags.includes(tag))
            if (!hasVideos) return null
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  activeTag === tag
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
                ].join(' ')}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
          Failed to load videos.
        </div>
      )}

      {videos && videos.length === 0 && (
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
          No videos yet.
        </div>
      )}

      {filtered && filtered.length === 0 && videos && videos.length > 0 && (
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
          No videos with this tag.
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((video) => (
            <button
              key={video._id}
              onClick={() => void navigate(`/videos/${video._id}`)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
            >
              <div className="relative w-full pt-[56.25%]">
                <VideoThumbnail
                  id={video._id}
                  title={video.title}
                  focalPoint={video.thumbnailFocalPoint}
                />
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="text-sm font-semibold leading-tight">{video.title}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(video.durationInMs)}</p>
                {video.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{video.description}</p>
                )}
                {video.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {video.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
