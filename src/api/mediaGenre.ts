import { apiRequest } from './client'
import type { MediaGenre } from '../types/api'

export const getGenres = () =>
    apiRequest<MediaGenre[]>('/mediaGenre')

export const createGenre = (name: string) =>
    apiRequest<{ message: string }>('/mediaGenre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })

export const deleteGenre = (name: string) =>
    apiRequest<{ message: string }>('/mediaGenre', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    })
