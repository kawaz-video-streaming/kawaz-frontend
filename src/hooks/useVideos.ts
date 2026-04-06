import { useQuery } from '@tanstack/react-query'
import z from 'zod'
import { apiRequest } from '../api/client'
import type { VideoListItem } from '../types/api'

const mediaListItemSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  thumbnailFocalPoint: z.object({ x: z.number(), y: z.number() }).default({ x: 0.5, y: 0.5 }),
  metadata: z.object({
    durationInMs: z.number(),
  }).optional(),
}).loose()

export const useVideos = () =>
  useQuery<VideoListItem[]>({
    queryKey: ['videos'],
    queryFn: async () => {
      const raw = await apiRequest<unknown[]>('/media')
      return raw.map(item => {
        const { _id, title, description, tags, thumbnailFocalPoint, metadata } = mediaListItemSchema.parse(item)
        return { _id, title, description, tags, thumbnailFocalPoint, durationInMs: metadata?.durationInMs ?? 0 }
      })
    },
    retry: false,
  })
