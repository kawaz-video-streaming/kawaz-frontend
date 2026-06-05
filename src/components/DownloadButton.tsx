import { ArrowDownToLine, Check, Clock, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { useOffline } from '../contexts/OfflineContext';
import type { OfflineMetadata } from '../lib/offlineStorage';

interface DownloadButtonProps {
  mediaId: string;
  metadata: OfflineMetadata;
  playUrl: string;
  thumbnailUrl: string;
  special: boolean;
  className?: string;
  /** Icon-only mode for card overlays */
  compact?: boolean;
}

export const DownloadButton = ({
  mediaId,
  metadata,
  playUrl,
  thumbnailUrl,
  special,
  className,
  compact = false,
}: DownloadButtonProps) => {
  const { downloadQueue, startDownload, cancelDownload, deleteEntry, getOfflineUri, isDownloaded, isDownloading, isQueued } =
    useOffline();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const downloading = isDownloading(mediaId);
  const queued = isQueued(mediaId);
  const downloaded = isDownloaded(mediaId);
  const progress = downloading ? (downloadQueue.find(d => d.mediaId === mediaId)?.progress ?? 0) : 0;

  const r = 9;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);

  if (queued) {
    if (compact) {
      return (
        <button
          onClick={e => { e.stopPropagation(); cancelDownload(mediaId); }}
          className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm', className)}
          aria-label="Remove from queue"
        >
          <Clock size={12} className="text-white/80" />
        </button>
      );
    }
    return (
      <button
        onClick={() => cancelDownload(mediaId)}
        className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', className)}
        aria-label="Remove from queue"
      >
        <Clock size={13} />
        <span>Queued</span>
        <X size={11} className="opacity-60" />
      </button>
    );
  }

  if (downloading) {
    if (compact) {
      return (
        <button
          onClick={e => { e.stopPropagation(); cancelDownload(mediaId); }}
          className={cn('relative flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm', className)}
          aria-label="Cancel download"
        >
          <svg className="-rotate-90 absolute inset-0" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="2" />
            <circle cx="14" cy="14" r={r} fill="none" stroke="#ef4444" strokeWidth="2"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
          </svg>
          <X size={10} className="text-white" />
        </button>
      );
    }
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div className="relative flex h-7 w-7 items-center justify-center">
          <svg className="-rotate-90" width="26" height="26" viewBox="0 0 26 26">
            <circle cx="13" cy="13" r={r} fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="2.5" />
            <circle
              cx="13" cy="13" r={r}
              fill="none" stroke="#ef4444" strokeWidth="2.5"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <span className="absolute text-[8px] font-bold tabular-nums text-foreground">{progress}</span>
        </div>
        <button
          onClick={() => cancelDownload(mediaId)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Cancel download"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  if (downloaded) {
    const offlineUri = getOfflineUri(mediaId);

    if (compact) {
      return confirmDelete ? (
        <div className={cn('flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 backdrop-blur-sm', className)}>
          <button
            onClick={async e => { e.stopPropagation(); if (offlineUri) await deleteEntry(offlineUri); setConfirmDelete(false); }}
            className="text-[10px] font-semibold text-red-400"
          >
            Remove
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
            className="text-[10px] font-semibold text-white/70"
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
          className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-green-500/80 backdrop-blur-sm', className)}
          aria-label="Downloaded – tap to remove"
        >
          <Check size={13} className="text-white" />
        </button>
      );
    }

    if (confirmDelete) {
      return (
        <div className={cn('flex items-center gap-1.5', className)}>
          <span className="text-xs text-muted-foreground">Remove download?</span>
          <button
            onClick={async () => {
              if (offlineUri) await deleteEntry(offlineUri);
              setConfirmDelete(false);
            }}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Keep
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirmDelete(true)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/10',
          className,
        )}
        aria-label="Downloaded – tap to remove"
      >
        <Check size={13} />
        <span>Downloaded</span>
        <Trash2 size={11} className="opacity-60" />
      </button>
    );
  }

  if (compact) {
    return (
      <button
        onClick={e => { e.stopPropagation(); startDownload(mediaId, playUrl, thumbnailUrl, special, metadata); }}
        className={cn('flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80', className)}
        aria-label="Download for offline"
      >
        <ArrowDownToLine size={13} className="text-white" />
      </button>
    );
  }

  return (
    <button
      onClick={() => startDownload(mediaId, playUrl, thumbnailUrl, special, metadata)}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
      aria-label="Download for offline"
    >
      <ArrowDownToLine size={13} />
      <span>Download</span>
    </button>
  );
};
