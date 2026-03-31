import { useQuery } from '@tanstack/react-query'
import z from 'zod'
import { apiRequest } from '../api/client'
import type { Video } from '../types/api'

const videoSchema = z.object({
  _id: z.string(),
  title: z.string(),
  durationInMs: z.number(),
  playUrl: z.string(),
  chaptersUrl: z.string().optional(),
  videoStreams: z.array(z.object({ title: z.string(), durationInMs: z.number() })),
  audioStreams: z.array(z.object({ language: z.string(), title: z.string(), durationInMs: z.number() })),
  subtitleStreams: z.array(z.object({ language: z.string(), title: z.string(), durationInMs: z.number() })),
}).loose()

export const useVideo = (id: string) =>
  useQuery<Video>({
    queryKey: ['videos', id],
    queryFn: async () => {
      const raw = await apiRequest<unknown>(`/media/videos/${id}`)
      return videoSchema.parse(raw) as Video
    },
    retry: false,
    enabled: id.length > 0,
  })
