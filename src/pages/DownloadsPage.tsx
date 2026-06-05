import { Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useOffline } from '../contexts/OfflineContext';
import type { OfflineEntry } from '../lib/offlineStorage';

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

const formatDuration = (ms: number): string => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatDate = (ts: number): string => {
  if (!ts) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ts));
};

const EntryRow = ({
  entry,
  confirmUri,
  setConfirmUri,
  deleteEntry,
}: {
  entry: OfflineEntry;
  confirmUri: string | null;
  setConfirmUri: (uri: string | null) => void;
  deleteEntry: (uri: string) => Promise<void>;
}) => (
  <div
    key={entry.offlineUri}
    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
  >
    {entry.thumbnailDataUrl ? (
      <img
        src={entry.thumbnailDataUrl}
        alt={entry.title}
        className="h-16 w-12 shrink-0 rounded-lg bg-muted object-cover"
      />
    ) : (
      <div className="h-16 w-12 shrink-0 rounded-lg bg-muted" />
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium">{entry.title}</p>
      <p className="text-xs text-muted-foreground">
        {formatBytes(entry.size)}
        {entry.durationInMs ? ` · ${formatDuration(entry.durationInMs)}` : ''}
        {entry.downloadedAt ? ` · ${formatDate(entry.downloadedAt)}` : ''}
      </p>
      {entry.genres.length > 0 && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.genres.join(', ')}</p>
      )}
    </div>

    <div className="flex shrink-0 items-center gap-1">
      <Link
        to={`/videos/${entry.mediaId}`}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Play"
      >
        <Play size={16} />
      </Link>

      {confirmUri === entry.offlineUri ? (
        <>
          <button
            onClick={async () => {
              await deleteEntry(entry.offlineUri);
              setConfirmUri(null);
            }}
            className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            Remove
          </button>
          <button
            onClick={() => setConfirmUri(null)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Keep
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmUri(entry.offlineUri)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
          aria-label="Delete download"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  </div>
);

export const DownloadsPage = () => {
  const { entries, downloadQueue, deleteEntry, cancelDownload } = useOffline();
  const [confirmUri, setConfirmUri] = useState<string | null>(null);

  const totalBytes = entries.reduce((sum, e) => sum + e.size, 0);

  const episodeEntries = entries.filter(e => e.kind === 'episode');
  const otherEntries = entries.filter(e => e.kind !== 'episode');

  // Build show → season → episodes tree
  const showMap = new Map<string, Map<string, OfflineEntry[]>>();
  for (const entry of episodeEntries) {
    const showKey = entry.showTitle ?? '';
    const seasonKey = entry.seasonTitle ?? '';
    if (!showMap.has(showKey)) showMap.set(showKey, new Map());
    const seasonMap = showMap.get(showKey)!;
    if (!seasonMap.has(seasonKey)) seasonMap.set(seasonKey, []);
    seasonMap.get(seasonKey)!.push(entry);
  }
  for (const seasonMap of showMap.values()) {
    for (const eps of seasonMap.values()) {
      eps.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    }
  }
  const shows = [...showMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Downloads</h1>
        {entries.length > 0 && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatBytes(totalBytes)} used
          </span>
        )}
      </div>

      {downloadQueue.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {downloadQueue.map(item => (
            <div key={item.mediaId} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              {item.status === 'downloading' ? (
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-red-500" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-border" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.status === 'downloading' ? `Downloading… ${item.progress}%` : 'Queued'}
                </p>
              </div>
              <button
                onClick={() => cancelDownload(item.mediaId)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && downloadQueue.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No downloads yet. Open a video and tap Download.
        </p>
      )}

      {/* TV shows grouped by show → season */}
      {shows.map(([showKey, seasonMap]) => (
        <div key={showKey} className="mb-6">
          <h2 className="mb-3 text-base font-semibold">
            {showKey || 'Unknown Show'}
          </h2>
          {[...seasonMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([seasonKey, eps]) => (
            <div key={seasonKey} className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground pl-1">
                {seasonKey || 'Unknown Season'}
              </h3>
              <div className="flex flex-col gap-3">
                {eps.map(entry => (
                  <EntryRow
                    key={entry.offlineUri}
                    entry={entry}
                    confirmUri={confirmUri}
                    setConfirmUri={setConfirmUri}
                    deleteEntry={deleteEntry}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Movies and other non-episode content */}
      {otherEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          {otherEntries.map(entry => (
            <EntryRow
              key={entry.offlineUri}
              entry={entry}
              confirmUri={confirmUri}
              setConfirmUri={setConfirmUri}
              deleteEntry={deleteEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
};
