import { apiRequest } from './client'
import type { ContinueWatchingItem, Profile, WatchlistEntry, WatchlistItemKind } from '../types/api'

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

export const deleteAccount = () =>
  apiRequest<{ message: string }>('/user/account', { method: 'DELETE' })

export const updateWatchProgress = (profileName: string, mediaId: string, positionInMs: number) =>
  apiRequest<{ message: string }>(`/user/profile/${encodeURIComponent(profileName)}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId, positionInMs }),
  })

export const removeWatchProgress = (profileName: string, mediaId: string) =>
  apiRequest<{ message: string }>(
    `/user/profile/${encodeURIComponent(profileName)}/progress/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE' },
  )

export const getContinueWatching = (profileName: string) =>
  apiRequest<ContinueWatchingItem[]>(`/user/profile/${encodeURIComponent(profileName)}/continueWatching`)

export const addToWatchlist = (profileName: string, id: string, kind: WatchlistItemKind) =>
  apiRequest<{ message: string }>(
    `/user/profile/${encodeURIComponent(profileName)}/watchlist/${kind}/${encodeURIComponent(id)}`,
    { method: 'POST' },
  )

export const removeFromWatchlist = (profileName: string, id: string, kind: WatchlistItemKind) =>
  apiRequest<{ message: string }>(
    `/user/profile/${encodeURIComponent(profileName)}/watchlist/${kind}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )

export const getWatchlist = (profileName: string) =>
  apiRequest<WatchlistEntry[]>(`/user/profile/${encodeURIComponent(profileName)}/watchlist`)
