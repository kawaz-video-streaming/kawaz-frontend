// TODO: remove this file once kawaz-backend proxies vod routes — use api/client.ts instead
import z from 'zod'
import type { Video } from '../types/api'

const vodRequest = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${import.meta.env.VITE_VOD_URL}${path}`)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

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

export const getVideo = async (id: string): Promise<Video> => {
  const raw = await vodRequest<unknown>(`/video/${id}`)
  return videoSchema.parse(raw) as Video
}
