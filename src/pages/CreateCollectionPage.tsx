import { CheckCircle, Image, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { CollectionKind, Coordinates } from '../types/api';
import { useCreateCollection } from '../hooks/useCreateCollection';
import { useCollections } from '../hooks/useCollections';
import { useGenres } from '../hooks/useGenres';
import { getFocalCropArea } from '../lib/focalPoints';
import { buildTopographicList } from '../lib/collections';

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
    <div className="relative mx-auto max-w-[300px] cursor-crosshair overflow-hidden rounded-lg border border-border" onClick={handleClick}>
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
  const { mutate: create, isPending, isSuccess, reset } = useCreateCollection();
  const { data: collections } = useCollections();
  const { data: genreOptions } = useGenres();

  const parentOptions = kind === 'season'
    ? (collections ?? []).filter((collection) => collection.kind === 'show')
    : kind === 'collection'
      ? buildTopographicList(collections ?? [])
        .map(({ item }) => item)
        .filter((collection) => collection.kind === 'collection')
      : [];

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

  const toggleGenre = (id: string) =>
    setGenres((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const parseSeasonNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed;
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
    const parsedSeasonNumber = kind === 'season' ? parseSeasonNumber(seasonNumber) : undefined;
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
            </div>
          </div>

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
