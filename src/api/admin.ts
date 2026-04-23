import { apiRequest } from './client'
import type { PendingUser } from '../types/api'

export const getPendingUsers = () => apiRequest<PendingUser[]>('/admin/pending')

export const approveUser = (username: string) =>
  apiRequest<{ message: string }>(`/admin/pending/${encodeURIComponent(username)}/approve`, { method: 'POST' })

export const denyUser = (username: string) =>
  apiRequest<{ message: string }>(`/admin/pending/${encodeURIComponent(username)}/deny`, { method: 'POST' })
