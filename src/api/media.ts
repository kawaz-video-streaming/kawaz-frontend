import z from 'zod';
import { apiRequest, apiUpload } from './client';
import type { Coordinates, PendingMediaItem } from '../types/api';

export interface UploadMediaParams {
  file: File;
  title: string;
  description: string;
  tags: string[];
  thumbnail: File;
  thumbnailFocalPoint: Coordinates;
  collectionId?: string;
}

const initiateUploadResponseSchema = z.object({
  mediaId: z.string(),
  videoUploadUrl: z.string(),
  thumbnailUploadUrl: z.string(),
});

const putToStorage = async (url: string, file: File): Promise<void> => {
  const res = await fetch(url, { method: 'PUT', body: file });
  if (!res.ok) {
    throw new Error(`Storage upload failed: ${res.status} ${res.statusText}`);
  }
};

export const uploadMedia = async ({ file, title, description, tags, thumbnail, thumbnailFocalPoint, collectionId }: UploadMediaParams): Promise<{ message: string; }> => {
  const raw = await apiRequest<unknown>('/media/upload/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description,
      tags,
      thumbnailFocalPoint,
      ...(collectionId ? { collectionId } : {}),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  });
  const { mediaId, videoUploadUrl, thumbnailUploadUrl } = initiateUploadResponseSchema.parse(raw);

  await putToStorage(videoUploadUrl, file);
  await putToStorage(thumbnailUploadUrl, thumbnail);

  return apiRequest<{ message: string; }>('/media/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaId }),
  });
};

export interface UpdateMediaParams {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  thumbnailFocalPoint: Coordinates;
  thumbnail?: File;
  collectionId?: string | null;  // null = remove from collection
}

const appendTags = (formData: FormData, tags: string[]) =>
  tags.forEach(tag => formData.append('tags[]', tag));

const buildMediaUpdateBody = ({
  title,
  description,
  tags,
  thumbnailFocalPoint,
  collectionId,
}: Omit<UpdateMediaParams, 'id' | 'thumbnail'>) => ({
  title,
  ...(description !== undefined ? { description } : {}),
  tags,
  thumbnailFocalPoint,
  ...(collectionId !== undefined ? { collectionId } : {}),
});

export const updateMedia = async ({ id, title, description, tags, thumbnailFocalPoint, thumbnail, collectionId }: UpdateMediaParams) => {
  const body = buildMediaUpdateBody({ title, description, tags, thumbnailFocalPoint, collectionId });

  if (collectionId === null && !thumbnail) {
    return apiRequest<{ message: string; }>(`/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const formData = new FormData();
  formData.append('title', title);
  if (description !== undefined) formData.append('description', description);
  appendTags(formData, tags);
  formData.append('thumbnailFocalPoint[x]', String(thumbnailFocalPoint.x));
  formData.append('thumbnailFocalPoint[y]', String(thumbnailFocalPoint.y));
  if (thumbnail) formData.append('thumbnail', thumbnail);
  if (typeof collectionId === 'string') formData.append('collectionId', collectionId);

  const result = await apiUpload<{ message: string; }>(`/media/${id}`, formData, 'PUT');

  if (collectionId === null) {
    return apiRequest<{ message: string; }>(`/media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return result;
};

export const deleteMedia = (id: string) =>
  apiRequest<{ message: string; }>(`/media/${id}`, { method: 'DELETE' });

export const getUploadingMedia = () => apiRequest<PendingMediaItem[]>('/media/uploading');
