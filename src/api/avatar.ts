import { apiRequest, apiUpload } from './client'
import type { Avatar } from '../types/api'

export const getAvatars = () =>
  apiRequest<Avatar[]>('/avatar')

export const avatarImageUrl = (id: string) =>
  `/api/avatar/${id}/image`

export const uploadAvatar = (name: string, category: string, file: File) => {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('category', category)
  formData.append('avatar', file)
  return apiUpload<{ message: string }>('/avatar', formData)
}

export const deleteAvatar = (id: string) =>
  apiRequest<{ message: string }>(`/avatar/${id}`, { method: 'DELETE' })
