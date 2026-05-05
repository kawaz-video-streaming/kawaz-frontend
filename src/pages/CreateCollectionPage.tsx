import { CheckCircle, Image, Loader2, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { CollectionKind, Coordinates, TmdbShowDetails } from '../types/api';
import { useCreateCollection } from '../hooks/useCreateCollection';
import { useCollections } from '../hooks/useCollections';
import { useGenres } from '../hooks/useGenres';
import { useCreateGenre } from '../hooks/useCreateGenre';
import { getFocalCropArea } from '../lib/focalPoints';
import { parsePositiveInt } from '../lib/parsePositiveInt';
import { buildTopographicList } from '../lib/collections';
import { searchTmdbShow } from '../api/media';

const ThumbnailFocalPointPicker = ({
  previewUrl,
  value,
  onChange,
}: {
  previewUrl: string;
  value: Coordinates;
  onChange: (focal: Coordinates) => void;
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number; } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100,
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100,
    });
  };

  const crop = naturalSize ? getFocalCropArea(naturalSize, value, 2 / 3) : null;

  return (
    <div className="relative mx-auto max-w-75 cursor-crosshair overflow-hidden rounded-lg border border-border" onClick={handleClick}>
      <img
        src={previewUrl}
        alt="Thumbnail preview"
        className="block w-full"
        draggable={false}
        onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
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

export const CreateCollectionPage = () => {
  const navigate = useNavigate();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [kind, setKind] = useState<CollectionKind>('show');
  const [seasonNumber, setSeasonNumber] = useState<string>('');
  const [parentCollectionId, setParentCollectionId] = useState<string>('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFocalPoint, setThumbnailFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 });

  // TMDB state (show only)
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbYear, setTmdbYear] = useState('');
  const [tmdbResult, setTmdbResult] = useState<TmdbShowDetails | null>(null);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbApplying, setTmdbApplying] = useState(false);
  const [tmdbNewGenres, setTmdbNewGenres] = useState<string[]>([]);
  const [creatingGenres, setCreatingGenres] = useState<string[]>([]);

  const { mutate: create, isPending, isSuccess, reset } = useCreateCollection();
  const { data: collections } = useCollections();
  const { data: genreOptions } = useGenres();
  const { mutate: createGenre } = useCreateGenre();

  const effectiveNewGenres = tmdbNewGenres.filter(
    (name) => !(genreOptions ?? []).some((g) => g.name === name),
  );

  const parentOptions = kind === 'season'
    ? (collections ?? []).filter((collection) => collection.kind === 'show')
    : kind === 'collection'
      ? buildTopographicList(collections ?? [])
        .map(({ item }) => item)
        .filter((collection) => collection.kind === 'collection')
      : [];

  useEffect(() => {
    if (kind !== 'show') {
      setTmdbResult(null);
      setTmdbError(null);
      setTmdbNewGenres([]);
    }
  }, [kind]);

  useEffect(() => {
    if (kind === 'show' && parentCollectionId) {
      setParentCollectionId('');
      return;
    }
    if (!parentCollectionId) return;
    const selectedParent = (collections ?? []).find((collection) => collection._id === parentCollectionId);
    const isValidParent = kind === 'season'
      ? selectedParent?.kind === 'show'
      : kind === 'collection'
        ? selectedParent?.kind === 'collection'
        : !selectedParent;
    if (!isValidParent) {
      setParentCollectionId('');
      return;
    }
    if (kind === 'season' && selectedParent?.genres?.length) {
      setGenres(selectedParent.genres);
    }
  }, [kind, parentCollectionId, collections]);

  const removeThumbnail = () => {
    setThumbnail(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
    setThumbnailFocalPoint({ x: 0.5, y: 0.5 });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
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

  const toggleGenre = (name: string) =>
    setGenres((prev) => prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]);

  const handleTmdbSearch = async () => {
    const q = tmdbQuery.trim();
    const y = parseInt(tmdbYear, 10);
    if (!q || !tmdbYear || isNaN(y)) return;
    setTmdbLoading(true);
    setTmdbError(null);
    setTmdbResult(null);
    setTmdbNewGenres([]);
    try {
      const result = await searchTmdbShow(q, y);
      setTmdbResult(result);
    } catch (e) {
      setTmdbError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setTmdbLoading(false);
    }
  };

  const applyTmdbShow = async (result: TmdbShowDetails) => {
    setTitle(result.name);
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
        const file = new File([blob], `${result.name}-poster.${ext}`, { type: blob.type });
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

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!title.trim() || !thumbnail) return;
    if (kind === 'season' && !parentCollectionId) {
      toast.error('A season must be nested inside a show', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (kind === 'collection' && parentCollectionId) {
      const selectedParent = (collections ?? []).find((collection) => collection._id === parentCollectionId);
      if (!selectedParent || selectedParent.kind !== 'collection') {
        toast.error('A general collection can only be nested inside another general collection', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
    }
    const parsedSeasonNumber = kind === 'season' ? parsePositiveInt(seasonNumber) : undefined;
    if (parsedSeasonNumber === null) {
      toast.error('Season number must be a whole number greater than 0', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    create(
      {
        title: title.trim(),
        description: description.trim(),
        genres,
        kind,
        seasonNumber: parsedSeasonNumber,
        thumbnail,
        thumbnailFocalPoint,
        collectionId: kind === 'show' ? undefined : (parentCollectionId || undefined),
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setGenres([]);
          setKind('show');
          setSeasonNumber('');
          setParentCollectionId('');
          setTmdbQuery('');
          setTmdbYear('');
          setTmdbResult(null);
          setTmdbNewGenres([]);
          removeThumbnail();
          reset();
          void navigate('/');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">New Collection</h1>
        <p className="mt-1 text-sm text-muted-foreground">Group media into a named collection</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Kind */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Kind <span className="text-red-500">*</span></label>
            <div className="flex gap-3 flex-wrap">
              {(['show', 'season', 'collection'] as CollectionKind[]).map((k) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="col-kind"
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

          {/* TMDB search — show only */}
          {kind === 'show' && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-accent/30 p-4">
              <p className="text-sm font-medium">Search TMDB <span className="text-xs font-normal text-muted-foreground">(optional — auto-fills fields)</span></p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleTmdbSearch())}
                  placeholder="Show title"
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
                  disabled={!tmdbQuery.trim() || !tmdbYear || tmdbLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tmdbLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Search
                </button>
              </div>

              {tmdbError && <p className="text-xs text-red-500">{tmdbError}</p>}

              {tmdbResult && (
                <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
                  {tmdbResult.poster_url && (
                    <img
                      src={tmdbResult.poster_url}
                      alt={tmdbResult.name}
                      className="h-24 w-16 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-sm font-semibold leading-tight">
                      {tmdbResult.name}
                      {tmdbResult.first_air_date && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({tmdbResult.first_air_date.slice(0, 4)})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{tmdbResult.number_of_seasons} season{tmdbResult.number_of_seasons !== 1 ? 's' : ''}</p>
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
                    onClick={() => applyTmdbShow(tmdbResult)}
                    disabled={tmdbApplying}
                    className="shrink-0 self-start rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {tmdbApplying ? <Loader2 size={12} className="animate-spin" /> : 'Use this'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Season number */}
          {kind === 'season' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="col-season-number">Season Number</label>
              <input
                id="col-season-number"
                type="number"
                min={1}
                step={1}
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(e.target.value)}
                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                placeholder="e.g. 1"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              />
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="col-title">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="col-title"
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
            <label className="text-sm font-medium" htmlFor="col-description">
              Description
            </label>
            <textarea
              id="col-description"
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

          {/* Parent collection */}
          {kind !== 'show' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="col-parent">
                {kind === 'season' ? 'Containing show' : 'Containing collection'}
              </label>
              <select
                id="col-parent"
                value={parentCollectionId}
                onChange={(e) => setParentCollectionId(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                required={kind === 'season'}
              >
                <option value="">{kind === 'season' ? '— Select a show —' : '— None (top level collection) —'}</option>
                {parentOptions.map((item) => (
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Click the image to set the focal point.</p>
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

          {isSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={16} />
              Collection created successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={!title.trim() || !thumbnail || isPending}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Creating…' : 'Create Collection'}
          </button>
        </form>
      </div>
    </div>
  );
};
