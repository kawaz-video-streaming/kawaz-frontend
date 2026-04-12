import { apiRequest } from './client'
import type { Profile } from '../types/api'

export const getProfiles = () =>
  apiRequest<{ profiles: Profile[] }>('/user/profiles').then((r) => r.profiles)

export const createProfile = (profileName: string, avatarId: string) =>
  apiRequest<{ message: string }>('/user/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileName, avatarId }),
  })

export const updateProfile = (profileName: string, avatarId: string) =>
  apiRequest<{ message: string }>('/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileName, avatarId }),
  })

export const deleteProfile = (name: string) =>
  apiRequest<{ message: string }>(`/user/profile/${encodeURIComponent(name)}`, { method: 'DELETE' })
