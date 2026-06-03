import z from 'zod';
import { apiRequest, apiUpload, apiUrl, specialParam } from './client';
import type { Coordinates, MediaKind, PendingMediaItem, TmdbCollectionDetails, TmdbEpisodeDetails, TmdbMovieDetails, TmdbSeasonDetails, TmdbShowDetails } from '../types/api';

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

export const uploadMedia = async ({ file, title, description, genres, kind, episodeNumber, thumbnail, thumbnailFocalPoint, collectionId }: UploadMediaParams, special = false): Promise<{ message: string; }> => {
  const sp = specialParam(special);
  const raw = await apiRequest<unknown>(`/media/upload/initiate${sp}`, {
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

  return apiRequest<{ message: string; }>(`/media/upload/complete${sp}`, {
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

export const updateMedia = async ({ id, title, description, genres, kind, episodeNumber, thumbnailFocalPoint, thumbnail, collectionId }: UpdateMediaParams, special = false) => {
  const body = buildMediaUpdateBody({ title, description, genres, kind, episodeNumber, thumbnailFocalPoint, collectionId });
  const sp = specialParam(special);

  if (collectionId === null && !thumbnail) {
    return apiRequest<{ message: string; }>(`/media/${id}${sp}`, {
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

  const result = await apiUpload<{ message: string; }>(`/media/${id}${sp}`, formData, 'PUT');

  if (collectionId === null) {
    return apiRequest<{ message: string; }>(`/media/${id}${sp}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return result;
};

export const deleteMedia = (id: string, special = false) =>
  apiRequest<{ message: string; }>(`/media/${id}${specialParam(special)}`, { method: 'DELETE' });

export const getUploadingMedia = (special = false) =>
  apiRequest<PendingMediaItem[]>(`/media/uploading${specialParam(special)}`);

export const mediaThumbnailUrl = (id: string, special = false) =>
  apiUrl(`/media/${id}/thumbnail${specialParam(special)}`);

export const mediaStreamUrl = (path: string, special = false) =>
  apiUrl(`/media/stream/${path}${specialParam(special)}`);

export const searchTmdbMovie = (title: string, year?: number) => {
  const params = new URLSearchParams({ title });
  if (year !== undefined) params.set('year', String(year));
  return apiRequest<TmdbMovieDetails>(`/media/tmdb/movie?${params}`);
};

export const fetchTmdbCollection = (id: number) =>
  apiRequest<TmdbCollectionDetails>(`/media/tmdb/collection?id=${id}`);

export const searchTmdbShow = (title: string, year: number) => {
  const params = new URLSearchParams({ title, year: String(year) });
  return apiRequest<TmdbShowDetails>(`/media/tmdb/show?${params}`);
};

export const searchTmdbEpisode = (showTitle: string, showYear: number, seasonNumber: number, episodeNumber: number) => {
  const params = new URLSearchParams({
    showTitle,
    showYear: String(showYear),
    seasonNumber: String(seasonNumber),
    episodeNumber: String(episodeNumber),
  });
  return apiRequest<TmdbEpisodeDetails>(`/media/tmdb/episode?${params}`);
};

export const searchTmdbSeason = (showTitle: string, showYear: number, seasonNumber: number) => {
  const params = new URLSearchParams({
    showTitle,
    showYear: String(showYear),
    seasonNumber: String(seasonNumber),
  });
  return apiRequest<TmdbSeasonDetails>(`/media/tmdb/season?${params}`);
};

export const addSubtitle = async (
  mediaId: string,
  file: File,
  language: string,
  title: string,
  special = false,
): Promise<void> => {
  const sp = specialParam(special);
  const { subtitleId, uploadUrl } = await apiRequest<{ subtitleId: string; uploadUrl: string }>(
    `/media/${mediaId}/subtitle/initiate${sp}`,
    { method: 'POST' },
  );
  await putToStorage(uploadUrl, file);
  await apiRequest(`/media/${mediaId}/subtitle/complete${sp}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtitleId, language, title }),
  });
};

export const updateSubtitle = (
  mediaId: string,
  subtitleId: string,
  fields: { enabled?: boolean; title?: string },
  special = false,
) =>
  apiRequest(`/media/${mediaId}/subtitle/${subtitleId}${specialParam(special)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });


export const fetchTmdbPoster = async (url: string): Promise<Blob> => {
  const params = new URLSearchParams({ url });
  const response = await fetch(apiUrl(`/media/tmdb/poster?${params}`), { credentials: 'include' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
};
