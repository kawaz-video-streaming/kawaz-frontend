import { useQuery } from '@tanstack/react-query';
import z from 'zod';
import { apiRequest } from '../api/client';
import type { CollectionListItem } from '../types/api';

const collectionSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  genres: z.array(z.string()).default([]),
  kind: z.enum(['show', 'season', 'collection']).optional(),
  seasonNumber: z.number().optional(),
  thumbnailFocalPoint: z.object({ x: z.number(), y: z.number() }).default({ x: 0.5, y: 0.5 }),
  collectionId: z.string().optional(),
}).loose();

export const useCollections = () =>
  useQuery<CollectionListItem[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      const raw = await apiRequest<unknown[]>('/mediaCollection');
      return raw.map((item) => {
        const { _id, title, description, genres, kind, seasonNumber, thumbnailFocalPoint, collectionId } = collectionSchema.parse(item);
        return { _id, title, description, genres, kind, seasonNumber, thumbnailFocalPoint, collectionId };
      });
    },
    retry: false,
  });
