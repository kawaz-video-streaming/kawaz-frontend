import { useParams } from 'react-router'
import { Mic, Captions } from 'lucide-react'
import { useVideo } from '../hooks/useVideo'
import { VideoPlayer } from '../components/VideoPlayer'

export const VideoPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: video, isError, isLoading } = useVideo(id ?? '')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
      </div>
    )
  }

  if (isError || !video) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold">Video not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This video may still be processing or the ID is incorrect.
        </p>
      </div>
    )
  }

  return (
    <div>
      <VideoPlayer
        manifestUrl={`${import.meta.env.VITE_BACKEND_URL}/media/videos/${video.playUrl}`}
        chaptersUrl={video.chaptersUrl ? `${import.meta.env.VITE_BACKEND_URL}/media/videos/${video.chaptersUrl}` : undefined}
        className="mb-6 overflow-hidden rounded-xl"
      />

      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>

        {(video.audioStreams.length > 0 || video.subtitleStreams.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {video.audioStreams.length > 0 && (
              <div className="flex items-center gap-2">
                <Mic size={14} className="shrink-0" />
                <span>{video.audioStreams.map(s => s.language).join(', ')}</span>
              </div>
            )}
            {video.subtitleStreams.length > 0 && (
              <div className="flex items-center gap-2">
                <Captions size={14} className="shrink-0" />
                <span>{video.subtitleStreams.map(s => s.language).join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
