import { apiRequest } from './client'
import type { PendingUser } from '../types/api'

export const getPendingUsers = () => apiRequest<PendingUser[]>('/admin/pending')

export const approveUser = (username: string, role: 'user' | 'special') =>
  apiRequest<{ message: string }>(`/admin/pending/${encodeURIComponent(username)}/approve/${role}`, { method: 'POST' })

export const denyUser = (username: string) =>
  apiRequest<{ message: string }>(`/admin/pending/${encodeURIComponent(username)}/deny`, { method: 'POST' })

export const sendNewsletter = (subject: string, body: string) =>
  apiRequest<{ message: string }>('/admin/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body }),
  })
