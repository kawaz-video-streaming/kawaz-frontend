import { CheckCircle, FileVideo, UploadCloud, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type SyntheticEvent } from 'react'
import { toast } from 'sonner'
import { Progress } from '../components/ui/progress'
import { useUploadMedia } from '../hooks/useUploadMedia'

const MAX_SIZE = 10 * 1024 ** 3 // 10 GB

const formatSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(2)} KB`
}

export const UploadPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { mutate: upload, isPending, isSuccess, reset } = useUploadMedia()

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
    reset()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null)
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

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    upload(selectedFile)
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add new content to the library</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {isPending && <Progress value={30} className="animate-pulse" />}

          {isSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={16} />
              Upload started. Processing in background.
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isPending}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
}
