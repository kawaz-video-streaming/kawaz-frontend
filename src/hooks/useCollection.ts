import { useQuery } from '@tanstack/react-query';
import z from 'zod';
import { apiRequest, specialParam } from '../api/client';
import { useAuth } from '../auth/useAuth';
import type { CollectionListItem } from '../types/api';

const collectionSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  genres: z.array(z.string()).default([]),
  kind: z.enum(['show', 'season', 'collection']).optional(),
  seasonNumber: z.coerce.number().optional(),
  thumbnailFocalPoint: z.object({ x: z.number(), y: z.number() }).default({ x: 0.5, y: 0.5 }),
  collectionId: z.string().optional(),
}).loose();

export const useCollection = (id: string) => {
  const { isAdmin, specialPool } = useAuth();
  const special = isAdmin && specialPool;
  return useQuery<CollectionListItem>({
    queryKey: ['collections', id, special],
    queryFn: async () => {
      const raw = await apiRequest<unknown>(`/mediaCollection/${id}${specialParam(special)}`);
      const { _id, title, description, genres, kind, seasonNumber, thumbnailFocalPoint, collectionId } = collectionSchema.parse(raw);
      return { _id, title, description, genres, kind, seasonNumber, thumbnailFocalPoint, collectionId };
    },
    retry: false,
    enabled: id.length > 0,
  });
};
