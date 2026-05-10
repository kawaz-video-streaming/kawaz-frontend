import { useQuery } from '@tanstack/react-query'
import z from 'zod'
import { apiRequest, specialParam } from '../api/client'
import { useAuth } from '../auth/useAuth'
import type { VideoListItem } from '../types/api'

const mediaListItemSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  genres: z.array(z.string()).default([]),
  kind: z.enum(['movie', 'episode']).optional(),
  episodeNumber: z.coerce.number().optional(),
  thumbnailFocalPoint: z.object({ x: z.number(), y: z.number() }).default({ x: 0.5, y: 0.5 }),
  collectionId: z.string().optional(),
  metadata: z.object({
    durationInMs: z.number(),
  }).optional(),
}).loose()

export const useVideos = () => {
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useQuery<VideoListItem[]>({
    queryKey: ['videos', special],
    queryFn: async () => {
      const raw = await apiRequest<unknown[]>(`/media${specialParam(special)}`)
      return raw.map(item => {
        const { _id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, collectionId, metadata } = mediaListItemSchema.parse(item)
        return { _id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, durationInMs: metadata?.durationInMs ?? 0, collectionId }
      })
    },
    retry: false,
  })
}
