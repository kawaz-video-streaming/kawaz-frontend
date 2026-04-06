import { Captions, Mic, Pencil, Trash2, X, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MEDIA_TAGS } from '../constants/tags'
import type { Coordinates } from '../types/api'
import { useVideo } from '../hooks/useVideo'
import { useUpdateMedia } from '../hooks/useUpdateMedia'
import { useDeleteMedia } from '../hooks/useDeleteMedia'
import { useAuth } from '../auth/useAuth'
import { VideoPlayer } from '../components/VideoPlayer'
import { getFocalCropArea } from '../lib/focalPoints'

const FocalPointPicker = ({
  id,
  value,
  onChange,
}: {
  id: string
  value: Coordinates
  onChange: (focal: Coordinates) => void
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const thumbnailUrl = `${import.meta.env.VITE_BACKEND_URL}/media/${id}/thumbnail`

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onChange({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100,
    })
  }

  const crop = naturalSize ? getFocalCropArea(naturalSize, value) : null

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Thumbnail focal point</label>
      <p className="text-xs text-muted-foreground">Click the image to set which part stays visible in thumbnails.</p>
      <div className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-border" onClick={handleClick}>
        <img src={thumbnailUrl} alt="Thumbnail" className="block w-full" draggable={false} onLoad={handleLoad} />
        {crop && (
          <div
            className="pointer-events-none absolute rounded-sm"
            style={{
              left: `${crop.left * 100}%`, top: `${crop.top * 100}%`,
              width: `${crop.width * 100}%`, height: `${crop.height * 100}%`,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              border: '1.5px solid rgba(255,255,255,0.75)',
            }}
          />
        )}
      </div>
    </div>
  )
}

export const VideoPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: video, isError, isLoading } = useVideo(id ?? '')
  const { mutate: update, isPending: isUpdating } = useUpdateMedia(id ?? '')
  const { mutate: remove, isPending: isDeleting } = useDeleteMedia()

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editFocalPoint, setEditFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const openEdit = () => {
    if (!video) return
    setEditTitle(video.title)
    setEditDescription(video.description ?? '')
    setEditTags(video.tags)
    setEditFocalPoint(video.thumbnailFocalPoint)
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const submitEdit = () => {
    if (!editTitle.trim()) return
    update(
      { title: editTitle.trim(), description: editDescription.trim(), tags: editTags, thumbnailFocalPoint: editFocalPoint },
      { onSuccess: () => setEditing(false) },
    )
  }

  const toggleEditTag = (tag: string) =>
    setEditTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleDelete = () => {
    if (!id) return
    remove(id, { onSuccess: () => void navigate('/') })
  }

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
        manifestUrl={`${import.meta.env.VITE_BACKEND_URL}/media/stream/${video.playUrl}`}
        chaptersUrl={video.chaptersUrl ? `${import.meta.env.VITE_BACKEND_URL}/media/stream/${video.chaptersUrl}` : undefined}
        thumbnailsUrl={video.thumbnailsUrl ? `${import.meta.env.VITE_BACKEND_URL}/media/stream/${video.thumbnailsUrl}` : undefined}
        className="mb-6 overflow-hidden rounded-xl"
      />

      <div className="mt-4">
        {editing ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {MEDIA_TAGS.map((tag) => {
                  const selected = editTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleEditTag(tag)}
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selected
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
                      ].join(' ')}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <FocalPointPicker id={video._id} value={editFocalPoint} onChange={setEditFocalPoint} />

            <div className="flex gap-2">
              <button
                onClick={submitEdit}
                disabled={!editTitle.trim() || isUpdating}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={openEdit}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {video.description && (
              <p className="mt-3 text-sm text-muted-foreground">{video.description}</p>
            )}

            {video.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {video.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}

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
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete video?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">"{video.title}"</span> and all its files. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
