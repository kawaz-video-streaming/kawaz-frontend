import { Check, ChevronRight, FolderOpen, Image, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import type { CollectionKind, CollectionListItem, Coordinates, VideoListItem } from '../types/api';
import { useCollection } from '../hooks/useCollection';
import { useCollections } from '../hooks/useCollections';
import { useUpdateCollection } from '../hooks/useUpdateCollection';
import { useDeleteCollection } from '../hooks/useDeleteCollection';
import { useVideos } from '../hooks/useVideos';
import { useGenres } from '../hooks/useGenres';
import { useAuth } from '../auth/useAuth';
import { getFocalCropArea, getObjectPositionFromFocalPoint } from '../lib/focalPoints';
import { parsePositiveInt } from '../lib/parsePositiveInt';
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
        <img
          src={src}
          alt="Thumbnail"
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
    </div>
  );
};

const ItemThumbnail = ({
  src,
  title,
  focalPoint,
  aspectRatio,
}: {
  src: string;
  title: string;
  focalPoint: Coordinates;
  aspectRatio: number;
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number; } | null>(null);
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
      onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      style={{
        objectPosition: naturalSize
          ? getObjectPositionFromFocalPoint(naturalSize, focalPoint, aspectRatio)
          : `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
      }}
    />
  );
};

type PageItem =
  | { type: 'collection'; data: CollectionListItem; }
  | { type: 'video'; data: VideoListItem; };

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const CollectionPage = () => {
  const { id } = useParams<{ id: string; }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: collection, isLoading, isError } = useCollection(id ?? '');
  const { data: allCollections } = useCollections();
  const { data: allVideos } = useVideos();
  const { mutate: update, isPending: isUpdating } = useUpdateCollection(id ?? '');
  const { mutate: remove, isPending: isDeleting } = useDeleteCollection();
  const { data: genreOptions } = useGenres();

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editKind, setEditKind] = useState<CollectionKind>('show');
  const [editSeasonNumber, setEditSeasonNumber] = useState<string>('');
  const [editFocalPoint, setEditFocalPoint] = useState<Coordinates>({ x: 0.5, y: 0.5 });
  const [editParentId, setEditParentId] = useState<string>('');
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const descendantIds = (() => {
    if (!id) return new Set<string>();
    const byParent = new Map<string, string[]>();
    for (const collectionItem of allCollections ?? []) {
      if (!collectionItem.collectionId) continue;
      const siblings = byParent.get(collectionItem.collectionId) ?? [];
      siblings.push(collectionItem._id);
      byParent.set(collectionItem.collectionId, siblings);
    }

    const visited = new Set<string>();
    const stack = [...(byParent.get(id) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      for (const childId of byParent.get(current) ?? []) {
        if (!visited.has(childId)) stack.push(childId);
      }
    }

    return visited;
  })();

  const subcollections = allCollections?.filter((c) => c.collectionId === id) ?? [];
  const videos = allVideos?.filter((v) => v.collectionId === id) ?? [];
  const leadingNumber = (title: string) => {
    const m = title.match(/\d+/);
    return m ? parseInt(m[0], 10) : Infinity;
  };

  const items: PageItem[] = [
    ...subcollections.map((collection): PageItem => ({ type: 'collection', data: collection })),
    ...videos.map((video): PageItem => ({ type: 'video', data: video })),
  ].sort((a, b) => {
    if (collection?.kind === 'show' && a.type === 'collection' && b.type === 'collection') {
      const aNum = a.data.seasonNumber ?? leadingNumber(a.data.title);
      const bNum = b.data.seasonNumber ?? leadingNumber(b.data.title);
      if (aNum !== bNum) return aNum - bNum;
    } else if (collection?.kind === 'season' && a.type === 'video' && b.type === 'video') {
      const aNum = a.data.episodeNumber ?? leadingNumber(a.data.title);
      const bNum = b.data.episodeNumber ?? leadingNumber(b.data.title);
      if (aNum !== bNum) return aNum - bNum;
    }
    return a.data.title.localeCompare(b.data.title);
  });

  // Parent collection for breadcrumb
  const parentCollection = collection?.collectionId
    ? allCollections?.find((c) => c._id === collection.collectionId)
    : null;

  // Collections that can be selected as parent.
  const availableParents = (allCollections?.filter((c) => c._id !== id && !descendantIds.has(c._id)) ?? []).filter((collectionItem) =>
    editKind === 'season'
      ? collectionItem.kind === 'show'
      : editKind === 'collection'
        ? collectionItem.kind === 'collection'
        : false,
  );

  useEffect(() => {
    if (editKind === 'show' && editParentId) {
      setEditParentId('');
      return;
    }
    if (!editParentId) return;
    const selectedParent = (allCollections ?? []).find((collectionItem) => collectionItem._id === editParentId);
    const isValidParent = editKind === 'season'
      ? selectedParent?.kind === 'show'
      : editKind === 'collection'
        ? selectedParent?.kind === 'collection'
        : !selectedParent;
    if (!isValidParent) {
      setEditParentId('');
    }
  }, [editKind, editParentId, allCollections]);

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
    if (!collection) return;
    setEditTitle(collection.title);
    setEditDescription(collection.description ?? '');
    setEditGenres(collection.genres);
    setEditKind(collection.kind ?? 'show');
    setEditSeasonNumber(collection.seasonNumber !== undefined ? String(collection.seasonNumber) : '');
    setEditFocalPoint(collection.thumbnailFocalPoint);
    setEditParentId(collection.collectionId ?? '');
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
    setEditFocalPoint(collection?.thumbnailFocalPoint ?? { x: 0.5, y: 0.5 });
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const submitEdit = () => {
    if (!editTitle.trim()) return;
    const originalParentId = collection?.collectionId ?? null;
    const rawParentId = editParentId === '' ? null : editParentId;
    if (editKind === 'season' && !(rawParentId ?? originalParentId)) {
      toast.error('A season must be nested inside a show', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }
    if (editKind === 'collection' && rawParentId) {
      if (descendantIds.has(rawParentId)) {
        toast.error('A collection cannot be nested inside one of its descendants', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
      const selectedParent = (allCollections ?? []).find((collectionItem) => collectionItem._id === rawParentId);
      if (!selectedParent || selectedParent.kind !== 'collection') {
        toast.error('A general collection can only be nested inside another general collection', {
          style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
        });
        return;
      }
    }
    const parsedSeasonNumber = editKind === 'season' ? parsePositiveInt(editSeasonNumber) : undefined;
    if (parsedSeasonNumber === null) {
      toast.error('Season number must be a whole number greater than 0', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
      return;
    }

    const collectionIdForUpdate = editKind === 'season'
      ? (rawParentId ?? originalParentId)!
      : editKind === 'show'
        ? (originalParentId !== null ? null : undefined)
        : (rawParentId !== originalParentId ? rawParentId : undefined);

    update(
      {
        title: editTitle.trim(),
        description: editDescription.trim(),
        genres: editGenres,
        kind: editKind,
        seasonNumber: parsedSeasonNumber,
        thumbnailFocalPoint: editFocalPoint,
        thumbnail: newThumbnail ?? undefined,
        collectionId: collectionIdForUpdate,
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

  const toggleEditGenre = (name: string) =>
    setEditGenres((prev) => prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]);

  const handleDelete = () => {
    if (!id) return;
    remove(id, {
      onSuccess: () => {
        if (collection?.collectionId) {
          void navigate(`/collections/${collection.collectionId}`);
        } else {
          void navigate('/');
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold">Collection not found</p>
      </div>
    );
  }

  const thumbnailSrc = `/api/mediaCollection/${collection._id}/thumbnail`;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">Home</Link>
        {parentCollection && (
          <>
            <ChevronRight size={14} />
            <Link to={`/collections/${parentCollection._id}`} className="transition-colors hover:text-foreground">
              {parentCollection.title}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-foreground">{collection.title}</span>
      </nav>

      {/* Collection header */}
      <div className="mb-6">
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
              <div className="flex gap-3 flex-wrap">
                {(['show', 'season', 'collection'] as CollectionKind[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="edit-col-kind"
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
            {editKind === 'season' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Season Number</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={editSeasonNumber}
                  onChange={(e) => setEditSeasonNumber(e.target.value)}
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
            {editKind !== 'show' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{editKind === 'season' ? 'Containing show' : 'Containing collection'}</label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  required={editKind === 'season'}
                >
                  <option value="">{editKind === 'season' ? '— Select a show —' : '— None (top level collection) —'}</option>
                  {availableParents.map((col) => (
                    <option key={col._id} value={col._id}>{col.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Thumbnail</label>
                {newThumbnail ? (
                  <button type="button" onClick={removeNewThumbnail} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <X size={12} /> Revert to original
                  </button>
                ) : (
                  <button type="button" onClick={() => thumbnailInputRef.current?.click()} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                    <Image size={12} /> Replace thumbnail
                  </button>
                )}
              </div>
              <FocalPointPicker
                src={newThumbnailPreview ?? thumbnailSrc}
                value={editFocalPoint}
                onChange={setEditFocalPoint}
                aspectRatio={2 / 3}
              />
              <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={submitEdit}
                disabled={!editTitle.trim() || isUpdating}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                <Check size={14} /> Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FolderOpen size={24} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{collection.title}</h1>
                {collection.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
                )}
                {collection.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {collection.genres.map((name) => (
                      <span key={name} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
        )}
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) =>
            item.type === 'collection' ? (
              <button
                key={item.data._id}
                onClick={() => void navigate(`/collections/${item.data._id}`)}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
              >
                <div className="relative w-full pt-[150%]">
                  <ItemThumbnail
                    src={`/api/mediaCollection/${item.data._id}/thumbnail`}
                    title={item.data.title}
                    focalPoint={item.data.thumbnailFocalPoint}
                    aspectRatio={2 / 3}
                  />
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                      <FolderOpen size={10} />
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 p-2.5">
                  <p className="text-sm font-semibold leading-tight">{item.data.title}</p>
                  {item.data.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.data.description}</p>
                  )}
                </div>
              </button>
            ) : (
              <button
                key={item.data._id}
                onClick={() => void navigate(`/collections/${id}/videos/${item.data._id}`)}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
              >
                <div className="relative w-full pt-[56.25%]">
                  <ItemThumbnail
                    src={`/api/media/${item.data._id}/thumbnail`}
                    title={item.data.title}
                    focalPoint={item.data.thumbnailFocalPoint}
                    aspectRatio={16 / 9}
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <p className="text-sm font-semibold leading-tight">{item.data.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(item.data.durationInMs)}</p>
                  {item.data.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.data.description}</p>
                  )}
                  {item.data.genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.data.genres.map((name) => (
                        <span key={name} className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ),
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
          This collection is empty.
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete collection?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">"{collection.title}"</span> must be empty before it can be deleted. All media and subcollections must be removed first.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium transition-colors hover:bg-accent"
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
