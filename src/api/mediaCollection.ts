import { apiRequest, apiUpload } from './client'
import type { Coordinates } from '../types/api'

export interface CreateCollectionParams {
  title: string
  description?: string
  tags: string[]
  thumbnail: File
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export const createCollection = ({ title, description, tags, thumbnail, thumbnailFocalPoint, collectionId }: CreateCollectionParams) => {
  const formData = new FormData()
  formData.append('title', title)
  if (description) formData.append('description', description)
  tags.forEach((tag) => formData.append('tags', tag))
  formData.append('thumbnail', thumbnail)
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x))
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y))
  if (collectionId) formData.append('collectionId', collectionId)
  return apiUpload<{ message: string }>('/mediaCollection', formData)
}

export interface UpdateCollectionParams {
  id: string
  title: string
  description?: string
  tags: string[]
  thumbnailFocalPoint: Coordinates
  thumbnail?: File
  collectionId?: string | null  // null = remove parent
}

export const updateCollection = ({ id, title, description, tags, thumbnailFocalPoint, thumbnail, collectionId }: UpdateCollectionParams) => {
  const formData = new FormData()
  formData.append('title', title)
  if (description !== undefined) formData.append('description', description)
  tags.forEach((tag) => formData.append('tags', tag))
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x))
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y))
  if (thumbnail) formData.append('thumbnail', thumbnail)
  if (collectionId !== undefined) formData.append('collectionId', collectionId === null ? 'null' : collectionId)
  return apiUpload<{ message: string }>(`/mediaCollection/${id}`, formData, 'PUT')
}

export const deleteCollection = (id: string) =>
  apiRequest<{ message: string }>(`/mediaCollection/${id}`, { method: 'DELETE' })
