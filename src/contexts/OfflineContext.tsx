import { App } from '@capacitor/app';
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { toast } from 'sonner';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  listOfflineEntries,
  removeOfflineEntry,
  storeVideo,
  type OfflineEntry,
  type OfflineMetadata,
  type StoreOperation,
} from '../lib/offlineStorage';
import { authHeaders } from '../api/client';
import { isAndroid, isIOS, isNative, isTV } from '../lib/platform';

interface DownloadServicePlugin {
  startDownload(options: {
    mediaId: string;
    url: string;
    thumbnailUrl: string;
    token: string;
    special: boolean;
    backendUrl: string;
    metadata: OfflineMetadata;
  }): Promise<void>;
  cancelDownload(options: { mediaId: string }): Promise<void>;
  stopService(): Promise<void>;
  addListener(
    event: 'downloadProgress',
    handler: (data: { mediaId: string; progress: number }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'downloadComplete',
    handler: (data: { mediaId: string; offlineUri: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'downloadError',
    handler: (data: { mediaId: string; message: string }) => void,
  ): Promise<PluginListenerHandle>;
}
const DownloadService = registerPlugin<DownloadServicePlugin>('DownloadService');

interface QueueItem {
  mediaId: string;
  playUrl: string;
  thumbnailUrl: string;
  special: boolean;
  metadata: OfflineMetadata;
}

export interface DownloadProgress {
  mediaId: string;
  title: string;
  progress: number;
  status: 'queued' | 'downloading';
}

interface OfflineContextValue {
  entries: OfflineEntry[];
  entriesLoaded: boolean;
  downloadQueue: DownloadProgress[];
  startDownload: (mediaId: string, playUrl: string, thumbnailUrl: string, special: boolean, metadata: OfflineMetadata) => void;
  cancelDownload: (mediaId: string) => void;
  deleteEntry: (offlineUri: string) => Promise<void>;
  getOfflineUri: (mediaId: string) => string | null;
  isDownloaded: (mediaId: string) => boolean;
  isDownloading: (mediaId: string) => boolean;
  isQueued: (mediaId: string) => boolean;
}

const OfflineContext = createContext<OfflineContextValue>({
  entries: [],
  entriesLoaded: true,
  downloadQueue: [],
  startDownload: () => {},
  cancelDownload: () => {},
  deleteEntry: async () => {},
  getOfflineUri: () => null,
  isDownloaded: () => false,
  isDownloading: () => false,
  isQueued: () => false,
});

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
  const [entries, setEntries] = useState<OfflineEntry[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(!isNative || isTV);
  const [downloadQueue, setDownloadQueue] = useState<DownloadProgress[]>([]);

  const queueRef = useRef<QueueItem[]>([]);
  const entriesRef = useRef<OfflineEntry[]>([]);
  // iOS-only: tracks the in-flight Shaka operation for abort support
  const operationRef = useRef<StoreOperation | null>(null);
  const isProcessingRef = useRef(false);
  const backgroundedRef = useRef(false);

  useEffect(() => {
    if (!isNative || isTV) return;
    void listOfflineEntries().then(loaded => { entriesRef.current = loaded; setEntries(loaded); }).catch(console.error).finally(() => setEntriesLoaded(true));
  }, []);

  // iOS-only: JS-driven sequential download queue
  const processNext = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const item = queueRef.current[0];

    setDownloadQueue(prev =>
      prev.map(d => d.mediaId === item.mediaId ? { ...d, status: 'downloading' } : d),
    );

    const op = storeVideo(item.playUrl, item.mediaId, item.special, item.metadata, item.thumbnailUrl, pct => {
      setDownloadQueue(prev =>
        prev.map(d => d.mediaId === item.mediaId ? { ...d, progress: pct } : d),
      );
    });
    operationRef.current = op;

    op.promise
      .then(entry => { entriesRef.current = [...entriesRef.current, entry]; setEntries(entriesRef.current); })
      .catch(err => { if (!backgroundedRef.current && err?.message !== 'Aborted') console.error('Download failed:', err); })
      .finally(() => {
        operationRef.current = null;
        isProcessingRef.current = false;
        if (backgroundedRef.current) {
          backgroundedRef.current = false;
          setDownloadQueue(prev =>
            prev.map(d => d.mediaId === item.mediaId ? { ...d, status: 'queued', progress: 0 } : d),
          );
        } else {
          queueRef.current = queueRef.current.filter(q => q.mediaId !== item.mediaId);
          setDownloadQueue(prev => prev.filter(d => d.mediaId !== item.mediaId));
          processNext();
        }
      });
  }, []);

  const startDownload = useCallback((mediaId: string, playUrl: string, thumbnailUrl: string, special: boolean, metadata: OfflineMetadata) => {
    if (entriesRef.current.some(e => e.mediaId === mediaId)) return;
    if (queueRef.current.some(q => q.mediaId === mediaId)) return;

    queueRef.current = [...queueRef.current, { mediaId, playUrl, thumbnailUrl, special, metadata }];
    setDownloadQueue(prev => [...prev, { mediaId, title: metadata.title, progress: 0, status: 'queued' }]);

    if (isIOS && queueRef.current.length === 1) {
      toast('Keep the app open to complete the download', { duration: 6000 });
    }

    if (isAndroid) {
      // Hand off to the native service which owns the queue and survives Activity death
      const token = authHeaders()['Authorization']?.slice(7) ?? '';
      void DownloadService.startDownload({
        mediaId,
        url: playUrl,
        thumbnailUrl,
        token,
        special,
        backendUrl: import.meta.env.VITE_BACKEND_URL ?? '',
        metadata,
      });
      return;
    }

    processNext();
  }, [processNext]);

  const cancelDownload = useCallback((mediaId: string) => {
    queueRef.current = queueRef.current.filter(q => q.mediaId !== mediaId);
    setDownloadQueue(prev => prev.filter(d => d.mediaId !== mediaId));

    if (isAndroid) {
      void DownloadService.cancelDownload({ mediaId });
      return;
    }

    const isActive = operationRef.current !== null && isProcessingRef.current;
    if (isActive) {
      operationRef.current?.abort();
      operationRef.current = null;
      isProcessingRef.current = false;
      processNext();
    }
  }, [processNext]);

  // iOS: abort download when backgrounded, resume when foregrounded
  useEffect(() => {
    if (!isIOS) return;

    let handle: { remove: () => void } | null = null;

    void App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && isProcessingRef.current) {
        backgroundedRef.current = true;
        operationRef.current?.abort();
        toast('Download paused — return to the app to resume', { duration: 4000 });
      } else if (isActive) {
        setTimeout(() => {
          if (!isProcessingRef.current && queueRef.current.length > 0) processNext();
        }, 300);
      }
    }).then(h => { handle = h; });

    return () => { handle?.remove(); };
  }, [processNext]);

  // Android: receive events from the native foreground service
  useEffect(() => {
    if (!isAndroid) return;

    const handles: PluginListenerHandle[] = [];

    void DownloadService.addListener('downloadProgress', ({ mediaId, progress }) => {
      setDownloadQueue(prev => prev.map(d =>
        d.mediaId === mediaId ? { ...d, progress, status: 'downloading' } : d,
      ));
    }).then(h => handles.push(h));

    void DownloadService.addListener('downloadComplete', ({ mediaId }) => {
      void listOfflineEntries().then(loaded => { entriesRef.current = loaded; setEntries(loaded); });
      queueRef.current = queueRef.current.filter(q => q.mediaId !== mediaId);
      setDownloadQueue(prev => prev.filter(d => d.mediaId !== mediaId));
    }).then(h => handles.push(h));

    void DownloadService.addListener('downloadError', ({ mediaId }) => {
      queueRef.current = queueRef.current.filter(q => q.mediaId !== mediaId);
      setDownloadQueue(prev => prev.filter(d => d.mediaId !== mediaId));
    }).then(h => handles.push(h));

    return () => { handles.forEach(h => h.remove()); };
  }, []);

  // Android: persist queue to localStorage — survives Activity destruction (swipe from recents)
  useEffect(() => {
    if (!isAndroid) return;
    if (queueRef.current.length > 0) {
      localStorage.setItem('kawaz_download_queue', JSON.stringify(queueRef.current));
    } else {
      localStorage.removeItem('kawaz_download_queue');
    }
  }, [downloadQueue]);

  // Android: on next launch, re-submit any items that didn't finish before the Activity was killed
  useEffect(() => {
    if (!isAndroid || !entriesLoaded) return;
    const saved = localStorage.getItem('kawaz_download_queue');
    if (!saved) return;
    localStorage.removeItem('kawaz_download_queue');
    try {
      const items = JSON.parse(saved) as QueueItem[];
      const token = authHeaders()['Authorization']?.slice(7) ?? '';
      const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
      for (const item of items) {
        if (entriesRef.current.some(e => e.mediaId === item.mediaId)) continue;
        if (queueRef.current.some(q => q.mediaId === item.mediaId)) continue;
        queueRef.current = [...queueRef.current, item];
        setDownloadQueue(prev => [...prev, { mediaId: item.mediaId, title: item.metadata.title, progress: 0, status: 'queued' }]);
        void DownloadService.startDownload({
          mediaId: item.mediaId,
          url: item.playUrl,
          thumbnailUrl: item.thumbnailUrl,
          token,
          special: item.special,
          backendUrl,
          metadata: item.metadata,
        });
      }
    } catch { /* ignore */ }
  }, [entriesLoaded]);

  const deleteEntry = async (offlineUri: string) => {
    await removeOfflineEntry(offlineUri);
    entriesRef.current = entriesRef.current.filter(e => e.offlineUri !== offlineUri);
    setEntries(entriesRef.current);
  };

  const getOfflineUri = (mediaId: string) =>
    entries.find(e => e.mediaId === mediaId)?.offlineUri ?? null;

  const isDownloaded = (mediaId: string) => entries.some(e => e.mediaId === mediaId);

  const isDownloading = (mediaId: string) =>
    downloadQueue.some(d => d.mediaId === mediaId && d.status === 'downloading');

  const isQueued = (mediaId: string) =>
    downloadQueue.some(d => d.mediaId === mediaId && d.status === 'queued');

  return (
    <OfflineContext.Provider
      value={{
        entries,
        entriesLoaded,
        downloadQueue,
        startDownload,
        cancelDownload,
        deleteEntry,
        getOfflineUri,
        isDownloaded,
        isDownloading,
        isQueued,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
