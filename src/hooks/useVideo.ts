import { useQuery } from '@tanstack/react-query';
import z from 'zod';
import { apiRequest, specialParam } from '../api/client';
import { useAuth } from '../auth/useAuth';
import type { Video } from '../types/api';

const mediaSchema = z.object({
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
    subtitleStreams: z.array(z.object({
      language: z.string(),
      title: z.string(),
      durationInMs: z.number(),
      subtitleId: z.string().optional(),
      fileName: z.string().optional(),
      enabled: z.boolean().optional(),
    })),
  }),
}).loose();

export const useVideo = (id: string) => {
  const { isAdmin, specialPool } = useAuth();
  const special = isAdmin && specialPool;
  return useQuery<Video>({
    queryKey: ['videos', id, special],
    queryFn: async () => {
      const raw = await apiRequest<unknown>(`/media/${id}${specialParam(special)}`);
      const { _id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, collectionId, metadata } = mediaSchema.parse(raw);
      return { _id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, collectionId, ...metadata };
    },
    retry: false,
    enabled: id.length > 0,
  });
};
