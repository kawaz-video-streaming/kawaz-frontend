import { apiRequest, apiUpload, apiUrl, specialParam } from './client'
import type { Avatar } from '../types/api'

export const getAvatars = (special = false) =>
  apiRequest<Avatar[]>(`/avatar${specialParam(special)}`)

export const avatarImageUrl = (id: string, special = false) =>
  apiUrl(`/avatar/${id}/image${specialParam(special)}`)

export const uploadAvatar = (name: string, categoryId: string, file: File, special = false) => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('categoryId', categoryId)
  formData.append('avatar', file)
  return apiUpload<{ message: string }>(`/avatar${specialParam(special)}`, formData)
}

export const deleteAvatar = (id: string, special = false) =>
  apiRequest<{ message: string }>(`/avatar/${id}${specialParam(special)}`, { method: 'DELETE' })
