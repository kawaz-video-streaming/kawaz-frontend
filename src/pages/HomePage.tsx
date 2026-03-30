import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'

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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Videos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse and watch your content</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-32 text-center">
        <div className="mb-4 rounded-full bg-accent p-4">
          <Search size={24} className="text-muted-foreground" />
        </div>
        <p className="mb-1 font-medium">No video library yet</p>
        <p className="mb-8 text-sm text-muted-foreground">
          Video listing coming soon. Enter a video ID to watch directly.
        </p>
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
          <input
            placeholder="Video ID"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          />
          <button
            type="submit"
            disabled={!videoId.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Watch
          </button>
        </form>
      </div>
    </div>
  )
}
