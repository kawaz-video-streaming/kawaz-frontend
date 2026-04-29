import { apiRequest, apiUpload } from './client'
import type { CollectionKind, Coordinates } from '../types/api'

const appendGenres = (formData: FormData, genres: string[]) => {
  genres.forEach((id, index) => formData.append(`genres[${index}]`, id))
}

export interface CreateCollectionParams {
  title: string
  description?: string
  genres: string[]
  kind: CollectionKind
  seasonNumber?: number
  thumbnail: File
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export const createCollection = ({ title, description, genres, kind, seasonNumber, thumbnail, thumbnailFocalPoint, collectionId }: CreateCollectionParams) => {
  const formData = new FormData()
  formData.append('title', title)
  if (description) formData.append('description', description)
  appendGenres(formData, genres)
  formData.append('kind', kind)
  if (seasonNumber !== undefined) formData.append('seasonNumber', String(seasonNumber))
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
  genres: string[]
  kind: CollectionKind
  seasonNumber?: number | null
  thumbnailFocalPoint: Coordinates
  thumbnail?: File
  collectionId?: string | null  // null = remove parent
}

const buildCollectionUpdateBody = ({
  title,
  description,
  genres,
  kind,
  seasonNumber,
  thumbnailFocalPoint,
  collectionId,
}: Omit<UpdateCollectionParams, 'id' | 'thumbnail'>) => ({
  title,
  ...(description !== undefined ? { description } : {}),
  genres,
  kind,
  ...(seasonNumber !== undefined ? { seasonNumber } : {}),
  thumbnailFocalPoint,
  ...(collectionId !== undefined ? { collectionId } : {}),
})

export const updateCollection = async ({ id, title, description, genres, kind, seasonNumber, thumbnailFocalPoint, thumbnail, collectionId }: UpdateCollectionParams) => {
  const body = buildCollectionUpdateBody({ title, description, genres, kind, seasonNumber, thumbnailFocalPoint, collectionId })

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
  appendGenres(formData, genres)
  formData.append('kind', kind)
  if (seasonNumber !== undefined && seasonNumber !== null) formData.append('seasonNumber', String(seasonNumber))
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
