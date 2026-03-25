import { useParams } from 'react-router'
import { useVideo } from '../hooks/useVideo'
import { VideoPlayer } from '../components/VideoPlayer'
import { Badge } from '../components/ui/badge'

export const VideoPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: video, isError, isLoading } = useVideo(id ?? '')

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (isError || !video) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p>Video not available yet.</p>
        <p className="mt-1 text-sm">
          This page will be ready once kawaz-backend exposes the video detail route.
        </p>
      </div>
    )
  }

  return (
    <div>
      <VideoPlayer
        manifestUrl={`${import.meta.env.VITE_VOD_URL}/stream/${video.playUrl}`}
        className="mb-6"
      />
      <h1 className="text-2xl font-semibold">{video.title}</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        {video.audioStreams.map((stream, i) => (
          <Badge key={i} variant="secondary">
            {stream.language}
          </Badge>
        ))}
        {video.subtitleStreams.map((stream, i) => (
          <Badge key={i} variant="outline">
            {stream.language}
          </Badge>
        ))}
      </div>
    </div>
  )
}
