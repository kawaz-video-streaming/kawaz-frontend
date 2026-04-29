import { Captions, ChevronLeft, ChevronRight, Image, Mic, Pencil, Trash2, X, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Coordinates, MediaKind } from '../types/api';
import { useVideo } from '../hooks/useVideo';
import { useVideos } from '../hooks/useVideos';
import { useUpdateMedia } from '../hooks/useUpdateMedia';
import { useDeleteMedia } from '../hooks/useDeleteMedia';
import { useCollections } from '../hooks/useCollections';
import { useGenres } from '../hooks/useGenres';
import { useAuth } from '../auth/useAuth';
import { VideoPlayer } from '../components/VideoPlayer';
import { getFocalCropArea } from '../lib/focalPoints';
import { buildTopographicList } from '../lib/collections';
import { toast } from 'sonner';

const FocalPointPicker = ({
  src,
  value,
  onChange,
  aspectRatio = 2 / 3,
}: {
  src: string;
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
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Click the image to set which part stays visible in thumbnails.</p>
      <div className={`relative mx-auto cursor-crosshair overflow-hidden rounded-lg border border-border ${aspectRatio >= 1 ? 'max-w-[450px]' : 'max-w-[300px]'}`} onClick={handleClick}>
        <img src={src} alt="Thumbnail" className="block w-full" draggable={false} onLoad={handleLoad} />
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
    </div>
  );
};

export const VideoPage = () => {
  const { id, collectionId: routeCollectionId } = useParams<{ id: string; collectionId?: string; }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: video, isError, isLoading } = useVideo(id ?? '');
  const { mutate: update, isPending: isUpdating } = useUpdateMedia(id ?? '');
  const { mutate: remove, isPending: isDeleting } = useDeleteMedia();
  const { data: collections } = useCollections();
  const { data: allVideos } = useVideos();
  const { data: genreOptions } = useGenres();

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editKind, setEditKind] = useState<MediaKind>('movie');
  const [editEpisodeNumber, setEditEpisodeNumber] = useState<string>('');
  const [editFocalPoint, setEditFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 });
  const [editCollectionId, setEditCollectionId] = useState<string>('');
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const collectionOptions = editKind === 'episode'
    ? (collections ?? []).filter((collection) => collection.kind === 'season')
    : buildTopographicList(collections ?? [])
      .map(({ item }) => item)
      .filter((collection) => collection.kind === 'collection');

  const seasonGroups = (() => {
    const allCollections = collections ?? [];
    const titleById = new Map(allCollections.map((collection) => [collection._id, collection.title]));
    const groups = new Map<string, { label: string; seasons: typeof collectionOptions; }>();

    allCollections
      .filter((collection) => collection.kind === 'season')
      .forEach((season) => {
        const groupKey = season.collectionId ?? '__ungrouped__';
        const groupLabel = season.collectionId
          ? (titleById.get(season.collectionId) ?? 'Unknown Show')
          : 'Unnested Seasons';

        if (!groups.has(groupKey)) {
          groups.set(groupKey, { label: groupLabel, seasons: [] });
        }

        groups.get(groupKey)?.seasons.push(season);
      });

    return [...groups.entries()]
      .map(([key, value]) => ({
        key,
        label: value.label,
        seasons: [...value.seasons].sort((a, b) => a.title.localeCompare(b.title)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  useEffect(() => {
    if (!editCollectionId) return;
    const selectedCollection = (collections ?? []).find((collection) => collection._id === editCollectionId);
    const isValidSelection = editKind === 'episode'
      ? selectedCollection?.kind === 'season'
      : selectedCollection?.kind === 'collection';
    if (!isValidSelection) {
      setEditCollectionId('');
    }
  }, [editKind, editCollectionId, collections]);

  useEffect(() => {
    setEditing(false);
    setShowDeleteConfirm(false);
    if (newThumbnailPreview) {
      URL.revokeObjectURL(newThumbnailPreview);
    }
    setNewThumbnail(null);
    setNewThumbnailPreview(null);
  }, [id]);

  const openEdit = () => {
    if (!video) return;
    setEditTitle(video.title);
    setEditDescription(video.description ?? '');
    setEditGenres(video.genres);
    setEditKind(video.kind ?? 'movie');
    setEditEpisodeNumber(video.episodeNumber !== undefined ? String(video.episodeNumber) : '');
    setEditFocalPoint(video.thumbnailFocalPoint);
    setEditCollectionId(video.collectionId ?? '');
    setNewThumbnail(null);
    setNewThumbnailPreview(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    if (newThumbnailPreview) URL.revokeObjectURL(newThumbnailPreview);
    setNewThumbnail(null);
    setNewThumbnailPreview(null);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (newThumbnailPreview) URL.revokeObjectURL(newThumbnailPreview);
    setNewThumbnail(file);
    setNewThumbnailPreview(URL.createObjectURL(file));
    setEditFocalPoint({ x: 0.5, y: 0.5 });
  };

  const removeNewThumbnail = () => {
    if (newThumbnailPreview) URL.revokeObjectURL(newThumbnailPreview);
    setNewThumbnail(null);
    setNewThumbnailPreview(null);
    setEditFocalPoint(video?.thumbnailFocalPoint ?? { x: 0.5, y: 0.5 });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const parseEpisodeNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed;
  };

  const submitEdit = () => {
    if (!editTitle.trim()) return;
    const rawCollectionId = editCollectionId === '' ? null : editCollectionId;
    const originalCollectionId = video?.collectionId ?? null;
    const collectionId = editKind === 'episode' ? (rawCollectionId ?? originalCollectionId) : rawCollectionId;
    if (editKind === 'episode' && !collectionId) {
      toast.error('An episode must belong to a season', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (editKind === 'movie' && collectionId) {
      const selectedCollection = (collections ?? []).find((collection) => collection._id === collectionId);
      if (!selectedCollection || selectedCollection.kind !== 'collection') {
        toast.error('A movie can only belong to a general collection', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
    }
    const parsedEpisodeNumber = editKind === 'episode' ? parseEpisodeNumber(editEpisodeNumber) : undefined;
    if (parsedEpisodeNumber === null) {
      toast.error('Episode number must be a whole number greater than 0', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    update(
      {
        title: editTitle.trim(),
        description: editDescription.trim(),
        genres: editGenres,
        kind: editKind,
        episodeNumber: parsedEpisodeNumber,
        thumbnailFocalPoint: editFocalPoint,
        thumbnail: newThumbnail ?? undefined,
        collectionId: editKind === 'episode'
          ? (collectionId as string)
          : (collectionId !== originalCollectionId ? collectionId : undefined),
      },
      {
        onSuccess: () => {
          setEditing(false);
          if (newThumbnailPreview) URL.revokeObjectURL(newThumbnailPreview);
          setNewThumbnail(null);
          setNewThumbnailPreview(null);
        },
      },
    );
  };

  useEffect(() => {
    if (!isDeleting) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDeleting]);

  const toggleEditGenre = (id: string) =>
    setEditGenres((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const handleDelete = () => {
    if (!id) return;
    remove(id, {
      onSuccess: () => void navigate(routeCollectionId ? `/collections/${routeCollectionId}` : '/'),
    });
  };

  const siblings = allVideos
    ?.filter((v) => v.collectionId === routeCollectionId)
    .sort((a, b) => a.title.localeCompare(b.title)) ?? [];
  const currentIndex = siblings.findIndex((v) => v._id === id);
  const prevVideo = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextVideo = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold">Video not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This video may still be processing or the ID is incorrect.
        </p>
      </div>
    );
  }

  const thumbnailSrc = `/api/media/${video._id}/thumbnail`;
  const thumbnailAspectRatio = editCollectionId ? 16 / 9 : 2 / 3;

  return (
    <div className="mx-auto max-w-6xl">
      {routeCollectionId && collections && (() => {
        const chain: { _id: string; title: string; }[] = [];
        let currentId: string | undefined = routeCollectionId;
        while (currentId) {
          const col = collections.find((c) => c._id === currentId);
          if (!col) break;
          chain.unshift(col);
          currentId = col.collectionId;
        }
        if (chain.length === 0) return null;
        return (
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
            {chain.map((col) => (
              <>
                <ChevronRight key={`sep-${col._id}`} size={14} />
                <Link key={col._id} to={`/collections/${col._id}`} className="transition-colors hover:text-foreground">
                  {col.title}
                </Link>
              </>
            ))}
            <ChevronRight size={14} />
            <span className="text-foreground">{video.title}</span>
          </nav>
        );
      })()}

      <VideoPlayer
        manifestUrl={`/api/media/stream/${video.playUrl}`}
        chaptersUrl={video.chaptersUrl ? `/api/media/stream/${video.chaptersUrl}` : undefined}
        thumbnailsUrl={video.thumbnailsUrl ? `/api/media/stream/${video.thumbnailsUrl}` : undefined}
        className="mb-6 rounded-xl"
      />

      {routeCollectionId && (prevVideo || nextVideo) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {prevVideo ? (
            <Link
              to={`/collections/${routeCollectionId}/videos/${prevVideo._id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500 hover:text-foreground"
            >
              <ChevronLeft size={16} />
              <span className="max-w-[180px] truncate">{prevVideo.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {nextVideo ? (
            <Link
              to={`/collections/${routeCollectionId}/videos/${nextVideo._id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-500 hover:text-foreground"
            >
              <span className="max-w-[180px] truncate">{nextVideo.title}</span>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}

      <div className="mt-4">
        {editing ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Kind</label>
              <div className="flex gap-3">
                {(['movie', 'episode'] as MediaKind[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="edit-kind"
                      value={k}
                      checked={editKind === k}
                      onChange={() => setEditKind(k)}
                      className="accent-red-500"
                    />
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            {editKind === 'episode' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Episode Number</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={editEpisodeNumber}
                  onChange={(e) => setEditEpisodeNumber(e.target.value)}
                  onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                  placeholder="e.g. 1"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Genres</label>
              <div className="flex flex-wrap gap-2">
                {(genreOptions ?? []).map((genre) => {
                  const selected = editGenres.includes(genre.name);
                  return (
                    <button
                      key={genre._id}
                      type="button"
                      onClick={() => toggleEditGenre(genre.name)}
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

            {collectionOptions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{editKind === 'episode' ? 'Containing season' : 'Containing collection'}</label>
                <select
                  value={editCollectionId}
                  onChange={(e) => setEditCollectionId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  required={editKind === 'episode'}
                >
                  <option value="">{editKind === 'episode' ? '— Select a season —' : '— None (top level movie) —'}</option>
                  {editKind === 'episode'
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Thumbnail</label>
                {newThumbnail ? (
                  <button
                    type="button"
                    onClick={removeNewThumbnail}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X size={12} /> Revert to original
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Image size={12} /> Replace thumbnail
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editCollectionId
                  ? 'Nested media previews horizontally.'
                  : 'Top-level media previews vertically.'}
              </p>
              <FocalPointPicker
                src={newThumbnailPreview ?? thumbnailSrc}
                value={editFocalPoint}
                onChange={setEditFocalPoint}
                aspectRatio={thumbnailAspectRatio}
              />
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={submitEdit}
                disabled={!editTitle.trim() || isUpdating}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
              {isAdmin && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={openEdit}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {video.description && (
              <p className="mt-3 text-sm text-muted-foreground">{video.description}</p>
            )}

            {video.genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {video.genres.map((name) => (
                  <span key={name} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {name}
                  </span>
                ))}
              </div>
            )}

            {(video.audioStreams.length > 0 || video.subtitleStreams.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {video.audioStreams.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Mic size={14} className="shrink-0" />
                    <span>{video.audioStreams.map(s => s.language).join(', ')}</span>
                  </div>
                )}
                {video.subtitleStreams.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Captions size={14} className="shrink-0" />
                    <span>{video.subtitleStreams.map(s => s.language).join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete video?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently delete <span className="font-medium text-foreground">"{video.title}"</span> and all its files. This cannot be undone.
            </p>
            {isDeleting && (
              <p className="mt-3 text-xs text-yellow-500">Please don't close or refresh the page until deletion finishes.</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
