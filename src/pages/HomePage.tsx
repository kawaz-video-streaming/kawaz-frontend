import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

// TODO: replace with a real video grid once kawaz-backend exposes GET /videos
export const HomePage = () => {
  const navigate = useNavigate()
  const [videoId, setVideoId] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!videoId.trim()) return
    void navigate(`/videos/${videoId.trim()}`)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Videos</h1>
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <p className="mb-6 text-sm">Video listing coming soon. Enter a video ID to watch directly.</p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
          <Input
            placeholder="Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          />
          <Button type="submit" disabled={!videoId.trim()}>
            Watch
          </Button>
        </form>
      </div>
    </div>
  )
}
