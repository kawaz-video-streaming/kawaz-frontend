import { apiRequest, apiUpload } from './client'
import type { Coordinates } from '../types/api'

const appendTags = (formData: FormData, tags: string[]) => {
  tags.forEach((tag, index) => formData.append(`tags[${index}]`, tag))
}

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
  appendTags(formData, tags)
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

const buildCollectionUpdateBody = ({
  title,
  description,
  tags,
  thumbnailFocalPoint,
  collectionId,
}: Omit<UpdateCollectionParams, 'id' | 'thumbnail'>) => ({
  title,
  ...(description !== undefined ? { description } : {}),
  tags,
  thumbnailFocalPoint,
  ...(collectionId !== undefined ? { collectionId } : {}),
})

export const updateCollection = async ({ id, title, description, tags, thumbnailFocalPoint, thumbnail, collectionId }: UpdateCollectionParams) => {
  const body = buildCollectionUpdateBody({ title, description, tags, thumbnailFocalPoint, collectionId })

  if (collectionId === null && !thumbnail) {
    return apiRequest<{ message: string }>(`/mediaCollection/${id}`, {
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

  const result = await apiUpload<{ message: string }>(`/mediaCollection/${id}`, formData, 'PUT')

  if (collectionId === null) {
    return apiRequest<{ message: string }>(`/mediaCollection/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  return result
}

export const deleteCollection = (id: string) =>
  apiRequest<{ message: string }>(`/mediaCollection/${id}`, { method: 'DELETE' })
