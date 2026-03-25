import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { useUploadMedia } from '../hooks/useUploadMedia'

export const UploadPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { mutate: upload, isPending, isSuccess, isError, error, reset } = useUploadMedia()

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    reset()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    upload(selectedFile)
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Upload</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload media</CardTitle>
          <CardDescription>Supported formats: video and image files</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              onChange={handleFileChange}
              className="text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} — {(selectedFile.size / 1_000_000).toFixed(2)} MB
              </p>
            )}

            {isPending && <Progress value={30} className="animate-pulse" />}

            {isSuccess && (
              <p className="text-sm text-green-600">Upload started. Processing in background.</p>
            )}

            {isError && (
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'Upload failed'}
              </p>
            )}

            <Button type="submit" disabled={!selectedFile || isPending}>
              {isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
