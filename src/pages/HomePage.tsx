import { useNavigate } from 'react-router'
import { useVideos } from '../hooks/useVideos'

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export const HomePage = () => {
  const navigate = useNavigate()
  const { data: videos, isLoading, isError } = useVideos()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse and watch your content</p>
      </div>

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

      {videos && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <button
              key={video._id}
              onClick={() => void navigate(`/videos/${video._id}`)}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
            >
              <div className="flex aspect-video items-center justify-center bg-accent text-muted-foreground text-xs">
                {video.thumbnailUrl
                  ? <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                  : <span>No preview</span>
                }
              </div>
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate text-sm font-semibold leading-tight">{video.title}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(video.durationInMs)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
