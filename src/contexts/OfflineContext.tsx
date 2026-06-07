import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  listOfflineEntries,
  removeOfflineEntry,
  storeVideo,
  type OfflineEntry,
  type OfflineMetadata,
  type StoreOperation,
} from '../lib/offlineStorage';
import { isNative, isTV } from '../lib/platform';

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
  const operationRef = useRef<StoreOperation | null>(null);
  const isProcessingRef = useRef(false);

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
      .catch(err => { if (err?.message !== 'Aborted') console.error('Download failed:', err); })
      .finally(() => {
        queueRef.current = queueRef.current.filter(q => q.mediaId !== item.mediaId);
        operationRef.current = null;
        isProcessingRef.current = false;
        setDownloadQueue(prev => prev.filter(d => d.mediaId !== item.mediaId));
        processNext();
      });
  }, []);

  const startDownload = useCallback((mediaId: string, playUrl: string, thumbnailUrl: string, special: boolean, metadata: OfflineMetadata) => {
    if (entriesRef.current.some(e => e.mediaId === mediaId)) return;
    if (queueRef.current.some(q => q.mediaId === mediaId)) return;

    queueRef.current = [...queueRef.current, { mediaId, playUrl, thumbnailUrl, special, metadata }];
    setDownloadQueue(prev => [...prev, { mediaId, title: metadata.title, progress: 0, status: 'queued' }]);
    processNext();
  }, [processNext]);

  const cancelDownload = useCallback((mediaId: string) => {
    const isActive = queueRef.current[0]?.mediaId === mediaId && isProcessingRef.current;

    queueRef.current = queueRef.current.filter(q => q.mediaId !== mediaId);
    setDownloadQueue(prev => prev.filter(d => d.mediaId !== mediaId));

    if (isActive) {
      operationRef.current?.abort();
      operationRef.current = null;
      isProcessingRef.current = false;
      processNext();
    }
  }, [processNext]);

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
