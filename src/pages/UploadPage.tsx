import { CheckCircle, FileVideo, Image, Loader2, Plus, Search, UploadCloud, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { Coordinates, MediaKind, TmdbEpisodeDetails, TmdbMovieDetails } from '../types/api';
import { useUploadMedia } from '../hooks/useUploadMedia';
import { useCollections } from '../hooks/useCollections';
import { useGenres } from '../hooks/useGenres';
import { useCreateGenre } from '../hooks/useCreateGenre';
import { useCreateCollection } from '../hooks/useCreateCollection';
import { getFocalCropArea } from '../lib/focalPoints';
import { buildTopographicList, buildSeasonGroups } from '../lib/collections';
import { parsePositiveInt } from '../lib/parsePositiveInt';
import { searchTmdbMovie, fetchTmdbCollection, searchTmdbEpisode } from '../api/media';

const MAX_SIZE = 10 * 1024 ** 3; // 10 GB

const formatSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
};

const ThumbnailFocalPointPicker = ({
  previewUrl,
  value,
  onChange,
  aspectRatio = 2 / 3,
}: {
  previewUrl: string;
  value: Coordinates;
  onChange: (focal: Coordinates) => void;
  aspectRatio?: number;
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number; } | null>(null);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100,
    });
  };

  const crop = naturalSize ? getFocalCropArea(naturalSize, value, aspectRatio) : null;

  return (
    <div className="relative mx-auto max-w-75 cursor-crosshair overflow-hidden rounded-lg border border-border" onClick={handleClick}>
      <img src={previewUrl} alt="Thumbnail preview" className="block w-full" draggable={false} onLoad={handleLoad} />
      {crop && (
        <div
          className="pointer-events-none absolute rounded-sm"
          style={{
            left: `${crop.left * 100}%`, top: `${crop.top * 100}%`,
            width: `${crop.width * 100}%`, height: `${crop.height * 100}%`,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            border: '1.5px solid rgba(255,255,255,0.75)',
          }}
        />
      )}
    </div>
  );
};

export const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [kind, setKind] = useState<MediaKind>('movie');
  const [episodeNumber, setEpisodeNumber] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFocalPoint, setThumbnailFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 });
  const [collectionId, setCollectionId] = useState<string>('');

  // TMDB state
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbYear, setTmdbYear] = useState('');
  const [tmdbResult, setTmdbResult] = useState<TmdbMovieDetails | null>(null);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbApplying, setTmdbApplying] = useState(false);
  const [tmdbNewGenres, setTmdbNewGenres] = useState<string[]>([]);
  const [creatingGenres, setCreatingGenres] = useState<string[]>([]);

  // Episode TMDB state
  const [epShowTitle, setEpShowTitle] = useState('');
  const [epShowYear, setEpShowYear] = useState('');
  const [epSeason, setEpSeason] = useState('');
  const [epEpisode, setEpEpisode] = useState('');
  const [epTmdbResult, setEpTmdbResult] = useState<TmdbEpisodeDetails | null>(null);
  const [epTmdbLoading, setEpTmdbLoading] = useState(false);
  const [epTmdbError, setEpTmdbError] = useState<string | null>(null);
  const [epTmdbApplying, setEpTmdbApplying] = useState(false);

  const [collectionCreating, setCollectionCreating] = useState(false);
  const [collectionCreated, setCollectionCreated] = useState(false);

  const { mutate: upload, isPending, isSuccess, reset } = useUploadMedia();
  const { data: collections } = useCollections();
  const { data: genreOptions } = useGenres();
  const { mutate: createGenre } = useCreateGenre();
  const { mutate: createCollection } = useCreateCollection();

  const handleCreateCollection = async (id: number) => {
    setCollectionCreating(true);
    try {
      const details = await fetchTmdbCollection(id);
      if (!details.poster_url) {
        toast.error('Could not fetch collection poster', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
      const response = await fetch(`/api/media/tmdb/poster?url=${encodeURIComponent(details.poster_url)}`, { credentials: 'include' });
      if (!response.ok) {
        toast.error('Could not fetch collection poster', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
      const blob = await response.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const posterFile = new File([blob], `${details.name}-poster.${ext}`, { type: blob.type });
      const availableNames = new Set((genreOptions ?? []).map((g) => g.name));
      const matchedGenres = details.genres.map((g) => g.name).filter((n) => availableNames.has(n));
      createCollection(
        {
          title: details.name,
          description: details.overview,
          genres: matchedGenres,
          kind: 'collection',
          thumbnail: posterFile,
          thumbnailFocalPoint: { x: 0.5, y: 0.5 },
        },
        { onSuccess: () => setCollectionCreated(true) },
      );
    } catch (err) {
      console.error('[create collection]', err);
      toast.error('Failed to create collection', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
    } finally {
      setCollectionCreating(false);
    }
  };

  const effectiveNewGenres = tmdbNewGenres.filter(
    (name) => !(genreOptions ?? []).some((g) => g.name === name),
  );

  const collectionOptions = useMemo(() => kind === 'episode'
    ? (collections ?? []).filter((collection) => collection.kind === 'season')
    : buildTopographicList(collections ?? [])
      .map(({ item }) => item)
      .filter((collection) => collection.kind === 'collection'),
  [kind, collections]);

  const seasonGroups = useMemo(() => buildSeasonGroups(collections ?? []), [collections]);

  useEffect(() => {
    if (!collectionId) return;
    const selectedCollection = (collections ?? []).find((collection) => collection._id === collectionId);
    const isValidSelection = kind === 'episode'
      ? selectedCollection?.kind === 'season'
      : selectedCollection?.kind === 'collection';
    if (!isValidSelection) {
      setCollectionId('');
      return;
    }
    if (kind === 'episode' && selectedCollection?.genres?.length) {
      setGenres(selectedCollection.genres);
    }
  }, [kind, collectionId, collections]);

  useEffect(() => {
    if (kind !== 'movie') {
      setTmdbResult(null);
      setTmdbError(null);
      setTmdbNewGenres([]);
      setCollectionCreated(false);
    }
    if (kind !== 'episode') {
      setEpTmdbResult(null);
      setEpTmdbError(null);
    }
  }, [kind]);

  useEffect(() => {
    if (!isPending) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isPending]);

  const applyFile = (file: File | null) => {
    if (file && !file.type.startsWith('video/')) {
      toast.error('Only video files are supported', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (file && file.size > MAX_SIZE) {
      toast.error('File exceeds the 10 GB limit', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    setSelectedFile(file);
    if (!file) {
      setTitle('');
      setDescription('');
      setGenres([]);
      setKind('movie');
      setEpisodeNumber('');
      setCollectionId('');
      setTmdbQuery('');
      setTmdbYear('');
      setTmdbResult(null);
      setTmdbError(null);
      setTmdbNewGenres([]);
      setCollectionCreated(false);
      setEpShowTitle('');
      setEpShowYear('');
      setEpSeason('');
      setEpEpisode('');
      setEpTmdbResult(null);
      setEpTmdbError(null);
      removeThumbnail();
    }
    reset();
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
    setThumbnailFocalPoint({ x: 0.5, y: 0.5 });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    applyFile(e.target.files?.[0] ?? null);
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported for thumbnails', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setThumbnailFocalPoint({ x: 0.5, y: 0.5 });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const toggleGenre = (name: string) =>
    setGenres((prev) => prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]);

  const handleTmdbSearch = async () => {
    const q = tmdbQuery.trim();
    if (!q) return;
    setTmdbLoading(true);
    setTmdbError(null);
    setTmdbResult(null);
    setCollectionCreated(false);
    try {
      const year = tmdbYear ? parseInt(tmdbYear, 10) : undefined;
      const result = await searchTmdbMovie(q, year);
      setTmdbResult(result);
    } catch (e) {
      setTmdbError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setTmdbLoading(false);
    }
  };

  const applyTmdbResult = async (result: TmdbMovieDetails) => {
    setTitle(result.title);
    setDescription(result.overview);

    const availableNames = new Set((genreOptions ?? []).map((g) => g.name));
    const matched = result.genres.map((g) => g.name).filter((n) => availableNames.has(n));
    const unmatched = result.genres.map((g) => g.name).filter((n) => !availableNames.has(n));
    setGenres([...matched, ...unmatched]);
    setTmdbNewGenres(unmatched);

    if (result.poster_url) {
      setTmdbApplying(true);
      try {
        const response = await fetch(`/api/media/tmdb/poster?url=${encodeURIComponent(result.poster_url)}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `${result.title}-poster.${ext}`, { type: blob.type });
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setThumbnail(file);
        setThumbnailPreview(URL.createObjectURL(file));
        setThumbnailFocalPoint({ x: 0.5, y: 0.5 });
      } catch (err) {
        console.error('[TMDB poster fetch]', err);
        toast.error('Could not fetch poster — add a thumbnail manually', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
      } finally {
        setTmdbApplying(false);
      }
    }
  };

  const handleEpTmdbSearch = async () => {
    const showTitle = epShowTitle.trim();
    const showYear = parseInt(epShowYear, 10);
    const season = parseInt(epSeason, 10);
    const episode = parseInt(epEpisode, 10);
    if (!showTitle || isNaN(showYear) || isNaN(season) || isNaN(episode)) return;
    setEpTmdbLoading(true);
    setEpTmdbError(null);
    setEpTmdbResult(null);
    try {
      const result = await searchTmdbEpisode(showTitle, showYear, season, episode);
      setEpTmdbResult(result);
    } catch (e) {
      setEpTmdbError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setEpTmdbLoading(false);
    }
  };

  const applyEpTmdbResult = async (result: TmdbEpisodeDetails) => {
    setTitle(result.name);
    setDescription(result.overview);
    setEpisodeNumber(String(result.episode_number));
    if (result.still_url) {
      setEpTmdbApplying(true);
      try {
        const response = await fetch(`/api/media/tmdb/poster?url=${encodeURIComponent(result.still_url)}`, { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `${result.name}-still.${ext}`, { type: blob.type });
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setThumbnail(file);
        setThumbnailPreview(URL.createObjectURL(file));
        setThumbnailFocalPoint({ x: 0.5, y: 0.5 });
      } catch (err) {
        console.error('[TMDB still fetch]', err);
        toast.error('Could not fetch episode still — add a thumbnail manually', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
      } finally {
        setEpTmdbApplying(false);
      }
    }
  };

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!selectedFile || !title.trim() || !thumbnail) return;
    if (kind === 'episode' && !collectionId) {
      toast.error('An episode must belong to a season', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (kind === 'movie' && collectionId) {
      const selectedCollection = (collections ?? []).find((collection) => collection._id === collectionId);
      if (!selectedCollection || selectedCollection.kind !== 'collection') {
        toast.error('A movie can only belong to a general collection', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
    }
    const parsedEpisodeNumber = kind === 'episode' ? parsePositiveInt(episodeNumber) : undefined;
    if (parsedEpisodeNumber === null) {
      toast.error('Episode number must be a whole number greater than 0', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    upload(
      { file: selectedFile, title: title.trim(), description: description.trim(), genres, kind, episodeNumber: parsedEpisodeNumber, thumbnail, thumbnailFocalPoint, collectionId: collectionId || undefined },
      { onSuccess: () => void navigate('/') },
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add new content to the library</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isPending ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={36} className="animate-spin text-red-500" />
              <div className="text-center">
                <p className="text-sm font-semibold">Uploading…</p>
                <p className="mt-1 text-xs text-muted-foreground">Please don't close or refresh the page.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Video file picker */}
              <div
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={[
                  'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors',
                  !selectedFile ? 'cursor-pointer' : '',
                  isDragging
                    ? 'border-red-500 bg-red-500/5'
                    : selectedFile
                      ? 'border-border'
                      : 'border-border hover:border-red-500/50 hover:bg-accent/50',
                ].join(' ')}
              >
                {selectedFile ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); applyFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X size={16} />
                    </button>
                    <FileVideo size={32} className="text-red-500" />
                    <div className="text-center">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} className={isDragging ? 'text-red-500' : 'text-muted-foreground'} />
                    <div className="text-center">
                      <p className="text-sm font-medium">{isDragging ? 'Drop to select' : 'Click or drag a file here'}</p>
                      <p className="text-xs text-muted-foreground">Video files supported</p>
                    </div>
                  </>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />

              {/* Metadata form — shown after a file is selected */}
              {selectedFile && (
                <>
                  {/* Kind */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Kind <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      {(['movie', 'episode'] as MediaKind[]).map((k) => (
                        <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="media-kind"
                            value={k}
                            checked={kind === k}
                            onChange={() => setKind(k)}
                            className="accent-red-500"
                          />
                          {k.charAt(0).toUpperCase() + k.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* TMDB search — movie only */}
                  {kind === 'movie' && (
                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-accent/30 p-4">
                      <p className="text-sm font-medium">Search TMDB <span className="text-xs font-normal text-muted-foreground">(optional — auto-fills fields)</span></p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tmdbQuery}
                          onChange={(e) => setTmdbQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleTmdbSearch())}
                          placeholder="Movie title"
                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <input
                          type="number"
                          value={tmdbYear}
                          onChange={(e) => setTmdbYear(e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          placeholder="Year"
                          min={1900}
                          max={2100}
                          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <button
                          type="button"
                          onClick={handleTmdbSearch}
                          disabled={!tmdbQuery.trim() || tmdbLoading}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {tmdbLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          Search
                        </button>
                      </div>

                      {tmdbError && (
                        <p className="text-xs text-red-500">{tmdbError}</p>
                      )}

                      {tmdbResult && (
                        <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
                          {tmdbResult.poster_url && (
                            <img
                              src={tmdbResult.poster_url}
                              alt={tmdbResult.title}
                              className="h-24 w-16 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <p className="text-sm font-semibold leading-tight">
                              {tmdbResult.title}
                              {tmdbResult.release_date && (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  ({tmdbResult.release_date.slice(0, 4)})
                                </span>
                              )}
                            </p>
                            {tmdbResult.overview && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{tmdbResult.overview}</p>
                            )}
                            {tmdbResult.genres.length > 0 && (
                              <div className="mt-auto flex flex-wrap gap-1 pt-1">
                                {tmdbResult.genres.map((g) => (
                                  <span key={g.id} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                    {g.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => applyTmdbResult(tmdbResult)}
                            disabled={tmdbApplying}
                            className="shrink-0 self-start rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {tmdbApplying ? <Loader2 size={12} className="animate-spin" /> : 'Use this'}
                          </button>
                        </div>
                      )}

                      {tmdbResult?.belongs_to_collection && (
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                          <span>
                            Part of collection: <strong className="text-foreground">{tmdbResult.belongs_to_collection.name}</strong>
                          </span>
                          {collectionCreated ? (
                            <span className="shrink-0 font-medium text-green-600 dark:text-green-400">Created ✓</span>
                          ) : (
                            <button
                              type="button"
                              disabled={collectionCreating}
                              onClick={() => handleCreateCollection(tmdbResult.belongs_to_collection!.id)}
                              className="shrink-0 font-medium text-red-500 hover:underline disabled:opacity-40"
                            >
                              {collectionCreating ? <Loader2 size={12} className="animate-spin" /> : 'Create collection'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TMDB search — episode only */}
                  {kind === 'episode' && (
                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-accent/30 p-4">
                      <p className="text-sm font-medium">Search TMDB <span className="text-xs font-normal text-muted-foreground">(optional — auto-fills fields)</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={epShowTitle}
                          onChange={(e) => setEpShowTitle(e.target.value)}
                          placeholder="Show title"
                          className="col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <input
                          type="number"
                          value={epShowYear}
                          onChange={(e) => setEpShowYear(e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          placeholder="Show year"
                          min={1900} max={2100}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <input
                          type="number"
                          value={epSeason}
                          onChange={(e) => setEpSeason(e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          placeholder="Season #"
                          min={1}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <input
                          type="number"
                          value={epEpisode}
                          onChange={(e) => setEpEpisode(e.target.value)}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          placeholder="Episode #"
                          min={1}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        />
                        <button
                          type="button"
                          onClick={handleEpTmdbSearch}
                          disabled={!epShowTitle.trim() || !epShowYear || !epSeason || !epEpisode || epTmdbLoading}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {epTmdbLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          Search
                        </button>
                      </div>

                      {epTmdbError && <p className="text-xs text-red-500">{epTmdbError}</p>}

                      {epTmdbResult && (
                        <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
                          {epTmdbResult.still_url && (
                            <img
                              src={epTmdbResult.still_url}
                              alt={epTmdbResult.name}
                              className="h-16 w-28 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <p className="text-sm font-semibold leading-tight">
                              {epTmdbResult.name}
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                S{String(epTmdbResult.season_number).padStart(2, '0')}E{String(epTmdbResult.episode_number).padStart(2, '0')}
                              </span>
                            </p>
                            {epTmdbResult.overview && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{epTmdbResult.overview}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => applyEpTmdbResult(epTmdbResult)}
                            disabled={epTmdbApplying}
                            className="shrink-0 self-start rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {epTmdbApplying ? <Loader2 size={12} className="animate-spin" /> : 'Use this'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Episode number */}
                  {kind === 'episode' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium" htmlFor="episode-number">Episode Number</label>
                      <input
                        id="episode-number"
                        type="number"
                        min={1}
                        step={1}
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        placeholder="e.g. 1"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="media-title">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="media-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title"
                      required
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" htmlFor="media-description">
                      Description
                    </label>
                    <textarea
                      id="media-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a description (optional)"
                      rows={3}
                      className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    />
                  </div>

                  {/* Genres */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Genres</label>
                    <div className="flex flex-wrap gap-2">
                      {(genreOptions ?? []).map((genre) => {
                        const selected = genres.includes(genre.name);
                        return (
                          <button
                            key={genre._id}
                            type="button"
                            onClick={() => toggleGenre(genre.name)}
                            className={[
                              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                              selected
                                ? 'border-red-500 bg-red-500/10 text-red-500'
                                : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
                            ].join(' ')}
                          >
                            {genre.name}
                          </button>
                        );
                      })}
                      {effectiveNewGenres.map((name) => {
                        const selected = genres.includes(name);
                        const isCreating = creatingGenres.includes(name);
                        return (
                          <div key={name} className="flex items-center">
                            <button
                              type="button"
                              onClick={() => toggleGenre(name)}
                              title="From TMDB — not yet in the genre library"
                              className={[
                                'rounded-l-full border border-dashed border-r-0 py-1 pl-3 pr-2 text-xs font-medium transition-colors',
                                selected
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'border-border bg-background text-muted-foreground hover:border-amber-500/50 hover:text-foreground',
                              ].join(' ')}
                            >
                              {name}
                            </button>
                            <button
                              type="button"
                              disabled={isCreating}
                              title="Add to genre library"
                              onClick={() => {
                                setCreatingGenres((prev) => [...prev, name]);
                                createGenre(name, {
                                  onSettled: () => setCreatingGenres((prev) => prev.filter((g) => g !== name)),
                                });
                              }}
                              className={[
                                'rounded-r-full border border-dashed py-1 pl-1.5 pr-2.5 text-xs transition-colors',
                                selected
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                  : 'border-border bg-background text-muted-foreground hover:border-amber-500/50 hover:text-foreground',
                                isCreating ? 'opacity-50 cursor-not-allowed' : '',
                              ].join(' ')}
                            >
                              {isCreating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Collection */}
                  {collectionOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium" htmlFor="upload-collection">
                        {kind === 'episode' ? 'Containing season' : 'Containing collection'}
                      </label>
                      <select
                        id="upload-collection"
                        value={collectionId}
                        onChange={(e) => setCollectionId(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        required={kind === 'episode'}
                      >
                        <option value="">{kind === 'episode' ? '— Select a season —' : '— None (top level movie) —'}</option>
                        {kind === 'episode'
                          ? seasonGroups.map((group) => (
                            <optgroup key={group.key} label={group.label}>
                              {group.seasons.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {group.label === 'Unnested Seasons' ? item.title : `${group.label} — ${item.title}`}
                                </option>
                              ))}
                            </optgroup>
                          ))
                          : collectionOptions.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      Thumbnail <span className="text-red-500">*</span>
                    </label>
                    {thumbnailPreview ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground">Click the image to set the focal point. New media previews vertically.</p>
                          <button
                            type="button"
                            onClick={removeThumbnail}
                            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X size={12} /> Remove
                          </button>
                        </div>
                        <ThumbnailFocalPointPicker
                          previewUrl={thumbnailPreview}
                          value={thumbnailFocalPoint}
                          onChange={setThumbnailFocalPoint}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-red-500/50 hover:bg-accent/50 hover:text-foreground"
                      >
                        <Image size={16} />
                        Choose thumbnail
                      </button>
                    )}
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </div>
                </>
              )}

              {isSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle size={16} />
                  Upload started. Processing in background.
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedFile || !title.trim() || !thumbnail}
                className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Upload
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
