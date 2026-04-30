import z from 'zod';
import { apiRequest, apiUpload } from './client';
import type { Coordinates, MediaKind, PendingMediaItem } from '../types/api';

export interface UploadMediaParams {
  file: File;
  title: string;
  description: string;
  genres: string[];
  kind: MediaKind;
  episodeNumber?: number;
  thumbnail: File;
  thumbnailFocalPoint: Coordinates;
  collectionId?: string;
}

const initiateUploadResponseSchema = z.object({
  mediaId: z.string(),
  videoUploadUrl: z.string(),
  thumbnailUploadUrl: z.string(),
});

const putToStorage = (url: string, file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Storage upload failed: network error'));
    xhr.send(file);
  });

export const uploadMedia = async ({ file, title, description, genres, kind, episodeNumber, thumbnail, thumbnailFocalPoint, collectionId }: UploadMediaParams): Promise<{ message: string; }> => {
  const raw = await apiRequest<unknown>('/media/upload/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description,
      genres,
      kind,
      ...(episodeNumber !== undefined ? { episodeNumber } : {}),
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
  genres: string[];
  kind: MediaKind;
  episodeNumber?: number | null;
  thumbnailFocalPoint: Coordinates;
  thumbnail?: File;
  collectionId?: string | null;  // null = remove from collection
}

const appendGenres = (formData: FormData, genres: string[]) =>
  genres.forEach(id => formData.append('genres[]', id));

const buildMediaUpdateBody = ({
  title,
  description,
  genres,
  kind,
  episodeNumber,
  thumbnailFocalPoint,
  collectionId,
}: Omit<UpdateMediaParams, 'id' | 'thumbnail'>) => ({
  title,
  ...(description !== undefined ? { description } : {}),
  genres,
  kind,
  ...(episodeNumber !== undefined ? { episodeNumber } : {}),
  thumbnailFocalPoint,
  ...(collectionId !== undefined ? { collectionId } : {}),
});

export const updateMedia = async ({ id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, thumbnail, collectionId }: UpdateMediaParams) => {
  const body = buildMediaUpdateBody({ title, description, genres, kind, episodeNumber, thumbnailFocalPoint, collectionId });

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
  appendGenres(formData, genres);
  formData.append('kind', kind);
  if (episodeNumber !== undefined && episodeNumber !== null) formData.append('episodeNumber', String(episodeNumber));
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
