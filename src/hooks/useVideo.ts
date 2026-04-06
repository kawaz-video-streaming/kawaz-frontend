import { useQuery } from '@tanstack/react-query'
import z from 'zod'
import { apiRequest } from '../api/client'
import type { Video } from '../types/api'

const mediaSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  thumbnailFocalPoint: z.object({ x: z.number(), y: z.number() }).default({ x: 0.5, y: 0.5 }),
  metadata: z.object({
    durationInMs: z.number(),
    playUrl: z.string(),
    chaptersUrl: z.string().optional(),
    thumbnailsUrl: z.string().optional(),
    chapters: z.array(z.object({
      chapterName: z.string(),
      chapterStartTime: z.number(),
      chapterEndTime: z.number(),
    })).optional(),
    videoStreams: z.array(z.object({ title: z.string(), durationInMs: z.number() })),
    audioStreams: z.array(z.object({ language: z.string(), title: z.string(), durationInMs: z.number() })),
    subtitleStreams: z.array(z.object({ language: z.string(), title: z.string(), durationInMs: z.number() })),
  }),
}).loose()

export const useVideo = (id: string) =>
  useQuery<Video>({
    queryKey: ['videos', id],
    queryFn: async () => {
      const raw = await apiRequest<unknown>(`/media/${id}`)
      const { _id, title, description, tags, thumbnailFocalPoint, metadata } = mediaSchema.parse(raw)
      return { _id, title, description, tags, thumbnailFocalPoint, ...metadata }
    },
    retry: false,
    enabled: id.length > 0,
  })
