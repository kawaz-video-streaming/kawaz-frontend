import { CheckCircle, FileVideo, Image, UploadCloud, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { MEDIA_TAGS } from '../constants/tags'
import type { Coordinates } from '../types/api'
import { Progress } from '../components/ui/progress'
import { useUploadMedia } from '../hooks/useUploadMedia'
import { useCollections } from '../hooks/useCollections'
import { getFocalCropArea } from '../lib/focalPoints'
import { buildTopographicList } from '../lib/collections'

const MAX_SIZE = 10 * 1024 ** 3 // 10 GB

const formatSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(2)} KB`
}

const ThumbnailFocalPointPicker = ({
  previewUrl,
  value,
  onChange,
  aspectRatio = 2 / 3,
}: {
  previewUrl: string
  value: Coordinates
  onChange: (focal: Coordinates) => void
  aspectRatio?: number
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

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

  const crop = naturalSize ? getFocalCropArea(naturalSize, value, aspectRatio) : null

  return (
    <div className="relative w-full cursor-crosshair overflow-hidden rounded-lg border border-border" onClick={handleClick}>
      <img src={previewUrl} alt="Thumbnail preview" className="block w-full" draggable={false} onLoad={handleLoad} />
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
  )
}

export const UploadPage = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailFocalPoint, setThumbnailFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 })
  const [collectionId, setCollectionId] = useState<string>('')
  const { mutate: upload, isPending, isSuccess, reset } = useUploadMedia()
  const { data: collections } = useCollections()

  const applyFile = (file: File | null) => {
    if (file && !file.type.startsWith('video/')) {
      toast.error('Only video files are supported', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
      return
    }
    if (file && file.size > MAX_SIZE) {
      toast.error('File exceeds the 10 GB limit', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
      return
    }
    setSelectedFile(file)
    if (!file) {
      setTitle('')
      setDescription('')
      setTags([])
      setCollectionId('')
      removeThumbnail()
    }
    reset()
  }

  const removeThumbnail = () => {
    setThumbnail(null)
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setThumbnailPreview(null)
    setThumbnailFocalPoint({ x: 0.5, y: 0.5 })
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null)
  }

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported for thumbnails', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
      return
    }
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setThumbnailFocalPoint({ x: 0.5, y: 0.5 })
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) applyFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const toggleTag = (tag: string) =>
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    if (!selectedFile || !title.trim() || !thumbnail) return
    upload(
      { file: selectedFile, title: title.trim(), description: description.trim(), tags, thumbnail, thumbnailFocalPoint, collectionId: collectionId || undefined },
      { onSuccess: () => void navigate('/') },
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add new content to the library</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Video file picker */}
          <div
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors',
              !selectedFile ? 'cursor-pointer' : '',
              isDragging
                ? 'border-red-500 bg-red-500/5'
                : selectedFile
                  ? 'border-border'
                  : 'border-border hover:border-red-500/50 hover:bg-accent/50',
            ].join(' ')}
          >
            {selectedFile ? (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); applyFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
                <FileVideo size={32} className="text-red-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={32} className={isDragging ? 'text-red-500' : 'text-muted-foreground'} />
                <div className="text-center">
                  <p className="text-sm font-medium">{isDragging ? 'Drop to select' : 'Click or drag a file here'}</p>
                  <p className="text-xs text-muted-foreground">Video files supported</p>
                </div>
              </>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />

          {/* Metadata form — shown after a file is selected */}
          {selectedFile && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="media-title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="media-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title"
                  required
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="media-description">
                  Description
                </label>
                <textarea
                  id="media-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description (optional)"
                  rows={3}
                  className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_TAGS.map((tag) => {
                    const selected = tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
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

              {collections && collections.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="upload-collection">
                    Collection
                  </label>
                  <select
                    id="upload-collection"
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <option value="">— None —</option>
                    {buildTopographicList(collections).map(({ item, depth }) => (
                      <option key={item._id} value={item._id}>
                        {'\u00a0\u00a0'.repeat(depth * 2)}{depth > 0 ? '↳ ' : ''}{item.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Thumbnail <span className="text-red-500">*</span>
                </label>
                {thumbnailPreview ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Click the image to set the focal point. New media previews vertically.</p>
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                    <ThumbnailFocalPointPicker
                      previewUrl={thumbnailPreview}
                      value={thumbnailFocalPoint}
                      onChange={setThumbnailFocalPoint}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-accent/50 hover:text-foreground"
                  >
                    <Image size={16} />
                    Choose thumbnail
                  </button>
                )}
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </div>
            </>
          )}

          {isPending && <Progress value={30} className="animate-pulse" />}

          {isSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={16} />
              Upload started. Processing in background.
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || !title.trim() || !thumbnail || isPending}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
}
