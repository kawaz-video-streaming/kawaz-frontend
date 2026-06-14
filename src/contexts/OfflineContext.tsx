import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
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
import { isAndroid, isIOS, isNative, isTV } from '../lib/platform';

const DownloadService = registerPlugin<{ setActive(o: { active: boolean }): Promise<void> }>('DownloadService');

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

    if (isAndroid && queueRef.current.length === 1) {
      toast('Downloading in the background', { duration: 4000 });
    } else if (isIOS && queueRef.current.length === 1) {
      toast('Keep the app open to complete the download', { duration: 6000 });
    }

    processNext();
  }, [processNext]);

  const cancelDownload = useCallback((mediaId: string) => {
    queueRef.current = queueRef.current.filter(q => q.mediaId !== mediaId);
    setDownloadQueue(prev => prev.filter(d => d.mediaId !== mediaId));

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

  // Android: persist queue + keep WebView JS timers alive while downloads are in progress
  useEffect(() => {
    if (!isAndroid) return;
    if (queueRef.current.length > 0) {
      localStorage.setItem('kawaz_download_queue', JSON.stringify(queueRef.current));
      void DownloadService.setActive({ active: true });
    } else {
      localStorage.removeItem('kawaz_download_queue');
      void DownloadService.setActive({ active: false });
    }
  }, [downloadQueue]);

  // Android: on next launch, re-queue any items that didn't finish before the app was killed
  useEffect(() => {
    if (!isAndroid || !entriesLoaded) return;
    const saved = localStorage.getItem('kawaz_download_queue');
    if (!saved) return;
    localStorage.removeItem('kawaz_download_queue');
    try {
      const items = JSON.parse(saved) as QueueItem[];
      for (const item of items) {
        startDownload(item.mediaId, item.playUrl, item.thumbnailUrl, item.special, item.metadata);
      }
    } catch { /* ignore */ }
  }, [entriesLoaded, startDownload]);

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
