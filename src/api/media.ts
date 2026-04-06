import z from 'zod'
import { apiRequest, apiUpload } from './client'
import type { Coordinates } from '../types/api'

const uploadMediaResponseSchema = z.object({
  message: z.string(),
})

export type UploadMediaResponse = z.infer<typeof uploadMediaResponseSchema>

export interface UploadMediaParams {
  file: File
  title: string
  description: string
  tags: string[]
  thumbnail: File
  thumbnailFocalPoint: Coordinates
}

export const uploadMedia = async ({ file, title, description, tags, thumbnail, thumbnailFocalPoint }: UploadMediaParams): Promise<UploadMediaResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)
  formData.append('description', description)
  tags.forEach((tag) => formData.append('tags', tag))
  formData.append('thumbnail', thumbnail)
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x))
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y))
  const raw = await apiUpload<unknown>('/media/upload', formData)
  return uploadMediaResponseSchema.parse(raw)
}

export interface UpdateMediaParams {
  id: string
  title: string
  description?: string
  tags: string[]
  thumbnailFocalPoint: Coordinates
}

export const updateMedia = ({ id, title, description, tags, thumbnailFocalPoint }: UpdateMediaParams) =>
  apiRequest<{ message: string }>(`/media/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, tags, thumbnailFocalPoint }),
  })

export const deleteMedia = (id: string) =>
  apiRequest<{ message: string }>(`/media/${id}`, { method: 'DELETE' })
