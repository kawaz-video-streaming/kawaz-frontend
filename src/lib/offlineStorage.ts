import type { offline } from 'shaka-player/dist/shaka-player.ui.js';
import type { AudioStream, Coordinates, MediaKind, SubtitleStream } from '../types/api';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL ?? '';

export type OfflineMetadata = {
  title: string;
  description?: string;
  genres: string[];
  kind?: MediaKind;
  episodeNumber?: number;
  thumbnailFocalPoint: Coordinates;
  collectionId?: string;
  seasonTitle?: string;
  showTitle?: string;
  chaptersUrl?: string;
  thumbnailsUrl?: string;
  durationInMs: number;
  audioStreams?: AudioStream[];
  subtitleStreams?: SubtitleStream[];
};

export type OfflineEntry = {
  offlineUri: string;
  mediaId: string;
  special: boolean;
  size: number;
  downloadedAt: number;
  thumbnailDataUrl?: string;
  chaptersVttText?: string;
  thumbnailsVttText?: string;
  spriteDataUrl?: string;
} & OfflineMetadata;

type AppMetadata = OfflineMetadata & {
  mediaId: string;
  special: boolean;
  downloadedAt: number;
  thumbnailDataUrl?: string;
  chaptersVttText?: string;
  thumbnailsVttText?: string;
  spriteDataUrl?: string;
};

export type StoreOperation = {
  promise: Promise<OfflineEntry>;
  abort: () => void;
};

export interface OfflineThumbnailCue {
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const parseVttTime = (s: string): number => {
  const parts = s.trim().split(':');
  const sec = parseFloat(parts[parts.length - 1]);
  const min = parts.length >= 2 ? parseInt(parts[parts.length - 2]) : 0;
  const hr = parts.length >= 3 ? parseInt(parts[parts.length - 3]) : 0;
  return hr * 3600 + min * 60 + sec;
};

export const parseOfflineThumbnailCues = (vttText: string): OfflineThumbnailCue[] => {
  const cues: OfflineThumbnailCue[] = [];
  const lines = vttText.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (!line.includes(' --> ')) continue;
    const arrowIdx = line.indexOf(' --> ');
    const startTime = parseVttTime(line.slice(0, arrowIdx));
    const endTime = parseVttTime(line.slice(arrowIdx + 5).split(' ')[0]);
    const payload = lines[i + 1]?.trim() ?? '';
    const xywh = payload.split('#xywh=')[1]?.split(',');
    if (xywh?.length === 4) {
      const [x, y, w, h] = xywh.map(v => parseInt(v));
      if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h))
        cues.push({ startTime, endTime, x, y, w, h });
    }
  }
  return cues;
};

const fetchAsDataUrl = async (url: string): Promise<string | undefined> => {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

const buildRequestFilter = (special: boolean) =>
  (_type: number, request: { uris: string[]; allowCrossSiteCredentials: boolean }) => {
    const uri = request.uris[0];
    const isOwn =
      uri.startsWith('/') ||
      uri.startsWith(window.location.origin) ||
      (BACKEND_BASE !== '' && uri.startsWith(BACKEND_BASE));
    if (!isOwn) {
      request.allowCrossSiteCredentials = false;
    } else {
      if (BACKEND_BASE !== '' && uri.startsWith(BACKEND_BASE)) {
        request.allowCrossSiteCredentials = true;
      }
      if (special && !uri.includes('special=true')) {
        request.uris = request.uris.map(u =>
          u + (u.includes('?') ? '&special=true' : '?special=true'),
        );
      }
    }
  };

const selectTracks = async (tracks: offline.OfflineTrack[]): Promise<offline.OfflineTrack[]> => tracks;

const toEntry = (stored: offline.StoredContent, meta: AppMetadata): OfflineEntry => ({
  offlineUri: stored.offlineUri ?? '',
  mediaId: meta.mediaId,
  special: meta.special,
  size: stored.size ?? 0,
  downloadedAt: meta.downloadedAt,
  thumbnailDataUrl: meta.thumbnailDataUrl,
  chaptersVttText: meta.chaptersVttText,
  thumbnailsVttText: meta.thumbnailsVttText,
  spriteDataUrl: meta.spriteDataUrl,
  title: meta.title,
  description: meta.description,
  genres: meta.genres,
  kind: meta.kind,
  episodeNumber: meta.episodeNumber,
  thumbnailFocalPoint: meta.thumbnailFocalPoint,
  collectionId: meta.collectionId,
  seasonTitle: meta.seasonTitle,
  showTitle: meta.showTitle,
  chaptersUrl: meta.chaptersUrl,
  thumbnailsUrl: meta.thumbnailsUrl,
  durationInMs: meta.durationInMs,
  audioStreams: meta.audioStreams,
  subtitleStreams: meta.subtitleStreams,
});

export const listOfflineEntries = async (): Promise<OfflineEntry[]> => {
  const shaka = await import('shaka-player/dist/shaka-player.ui.js');
  const storage = new shaka.offline.Storage();
  try {
    const list = await storage.list();
    return list
      .filter(item => (item.appMetadata as AppMetadata | undefined)?.mediaId)
      .map(item => {
        const meta = item.appMetadata as AppMetadata;
        return toEntry(item, meta);
      });
  } finally {
    await storage.destroy().catch(() => {});
  }
};

export const storeVideo = (
  manifestUrl: string,
  mediaId: string,
  special: boolean,
  metadata: OfflineMetadata,
  thumbnailUrl: string,
  onProgress: (pct: number) => void,
): StoreOperation => {
  let innerAbort: (() => void) | null = null;

  const promise = (async (): Promise<OfflineEntry> => {
    const shaka = await import('shaka-player/dist/shaka-player.ui.js');
    shaka.polyfill.installAll();

    const thumbnailDataUrl = await fetchAsDataUrl(thumbnailUrl);

    let chaptersVttText: string | undefined;
    if (metadata.chaptersUrl) {
      try {
        const res = await fetch(metadata.chaptersUrl, { credentials: 'include' });
        if (res.ok) chaptersVttText = await res.text();
      } catch { /* ignore */ }
    }

    let thumbnailsVttText: string | undefined;
    let spriteDataUrl: string | undefined;
    if (metadata.thumbnailsUrl) {
      try {
        const vttRes = await fetch(metadata.thumbnailsUrl, { credentials: 'include' });
        if (vttRes.ok) {
          thumbnailsVttText = await vttRes.text();
          const spriteUrl = metadata.thumbnailsUrl.replace('thumbnails.vtt', 'thumbnails.jpg');
          spriteDataUrl = await fetchAsDataUrl(spriteUrl);
        }
      } catch { /* ignore */ }
    }

    const player = new shaka.Player();
    const storage = new shaka.offline.Storage(player);
    const meta: AppMetadata = {
      ...metadata,
      mediaId,
      special,
      downloadedAt: Date.now(),
      thumbnailDataUrl,
      chaptersVttText,
      thumbnailsVttText,
      spriteDataUrl,
    };

    storage.configure({
      offline: {
        progressCallback: (_content: offline.StoredContent, progress: number) => {
          onProgress(Math.round(progress * 100));
        },
        trackSelectionCallback: selectTracks,
      },
    });

    player.getNetworkingEngine()?.registerRequestFilter(buildRequestFilter(special));

    const op = storage.store(manifestUrl, meta);
    innerAbort = () => { try { op.abort(); } catch { /* ignore */ } };

    try {
      const stored = await op.promise;
      return toEntry(stored, meta);
    } finally {
      await storage.destroy().catch(() => {});
      await player.destroy().catch(() => {});
    }
  })();

  return {
    promise,
    abort: () => innerAbort?.(),
  };
};

export const removeOfflineEntry = async (offlineUri: string): Promise<void> => {
  const shaka = await import('shaka-player/dist/shaka-player.ui.js');
  const storage = new shaka.offline.Storage();
  try {
    await storage.remove(offlineUri);
  } finally {
    await storage.destroy().catch(() => {});
  }
};
