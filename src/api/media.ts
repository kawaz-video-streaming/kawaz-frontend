import z from 'zod'
import { apiRequest, apiUpload } from './client'
import type { Coordinates, PendingMediaItem } from '../types/api'

const uploadMediaResponseSchema = z.object({
  message: z.string(),
})

export type UploadMediaResponse = z.infer<typeof uploadMediaResponseSchema>

const appendTags = (formData: FormData, tags: string[]) => {
  tags.forEach((tag, index) => formData.append(`tags[${index}]`, tag))
}

export interface UploadMediaParams {
  file: File
  title: string
  description: string
  tags: string[]
  thumbnail: File
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export const uploadMedia = async ({ file, title, description, tags, thumbnail, thumbnailFocalPoint, collectionId }: UploadMediaParams): Promise<UploadMediaResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)
  formData.append('description', description)
  appendTags(formData, tags)
  formData.append('thumbnail', thumbnail)
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x))
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y))
  if (collectionId) formData.append('collectionId', collectionId)
  const raw = await apiUpload<unknown>('/media/upload', formData)
  return uploadMediaResponseSchema.parse(raw)
}

export interface UpdateMediaParams {
  id: string
  title: string
  description?: string
  tags: string[]
  thumbnailFocalPoint: Coordinates
  thumbnail?: File
  collectionId?: string | null  // null = remove from collection
}

const buildMediaUpdateBody = ({
  title,
  description,
  tags,
  thumbnailFocalPoint,
  collectionId,
}: Omit<UpdateMediaParams, 'id' | 'thumbnail'>) => ({
  title,
  ...(description !== undefined ? { description } : {}),
  tags,
  thumbnailFocalPoint,
  ...(collectionId !== undefined ? { collectionId } : {}),
})

export const updateMedia = async ({ id, title, description, tags, thumbnailFocalPoint, thumbnail, collectionId }: UpdateMediaParams) => {
  const body = buildMediaUpdateBody({ title, description, tags, thumbnailFocalPoint, collectionId })

  if (collectionId === null && !thumbnail) {
    return apiRequest<{ message: string }>(`/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const formData = new FormData()
  formData.append('title', title)
  if (description !== undefined) formData.append('description', description)
  appendTags(formData, tags)
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x))
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y))
  if (thumbnail) formData.append('thumbnail', thumbnail)
  if (typeof collectionId === 'string') formData.append('collectionId', collectionId)

  const result = await apiUpload<{ message: string }>(`/media/${id}`, formData, 'PUT')

  if (collectionId === null) {
    return apiRequest<{ message: string }>(`/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  return result
}

export const deleteMedia = (id: string) =>
  apiRequest<{ message: string }>(`/media/${id}`, { method: 'DELETE' })

export const getUploadingMedia = async (): Promise<PendingMediaItem[]> => {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/media/uploading`, {
    credentials: 'include',
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json() as Promise<PendingMediaItem[]>
}
