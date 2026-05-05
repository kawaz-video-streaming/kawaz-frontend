import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Coordinates, MediaGenre, TmdbMovieDetails } from '../types/api';
import { fetchTmdbCollection, fetchTmdbPoster, searchTmdbMovie } from '../api/media';
import { useCreateCollection } from './useCreateCollection';

interface Options {
  genreOptions: MediaGenre[] | undefined;
  thumbnailPreview: string | null;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setGenres: (v: string[]) => void;
  setThumbnail: (v: File) => void;
  setThumbnailPreview: (v: string) => void;
  setThumbnailFocalPoint: (v: Coordinates) => void;
}

export const useTmdbMovieSearch = ({
  genreOptions, thumbnailPreview,
  setTitle, setDescription, setGenres,
  setThumbnail, setThumbnailPreview, setThumbnailFocalPoint,
}: Options) => {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [result, setResult] = useState<TmdbMovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [newGenres, setNewGenres] = useState<string[]>([]);
  const [collectionCreating, setCollectionCreating] = useState(false);
  const [collectionCreated, setCollectionCreated] = useState(false);

  const { mutateAsync: createCollection } = useCreateCollection();

  const effectiveNewGenres = newGenres.filter(
    (name) => !(genreOptions ?? []).some((g) => g.name === name),
  );

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCollectionCreated(false);
    try {
      const parsedYear = year ? parseInt(year, 10) : undefined;
      setResult(await searchTmdbMovie(q, parsedYear));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (r: TmdbMovieDetails) => {
    setTitle(r.title);
    setDescription(r.overview);
    const availableNames = new Set((genreOptions ?? []).map((g) => g.name));
    const matched = r.genres.map((g) => g.name).filter((n) => availableNames.has(n));
    const unmatched = r.genres.map((g) => g.name).filter((n) => !availableNames.has(n));
    setGenres([...matched, ...unmatched]);
    setNewGenres(unmatched);
    if (!r.poster_url) return;
    setApplying(true);
    try {
      const blob = await fetchTmdbPoster(r.poster_url);
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `${r.title}-poster.${ext}`, { type: blob.type });
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
      setApplying(false);
    }
  };

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
      const blob = await fetchTmdbPoster(details.poster_url);
      const ext = blob.type.split('/')[1] || 'jpg';
      const posterFile = new File([blob], `${details.name}-poster.${ext}`, { type: blob.type });
      const availableNames = new Set((genreOptions ?? []).map((g) => g.name));
      const matchedGenres = details.genres.map((g) => g.name).filter((n) => availableNames.has(n));
      try {
        await createCollection({
          title: details.name,
          description: details.overview,
          genres: matchedGenres,
          kind: 'collection',
          thumbnail: posterFile,
          thumbnailFocalPoint: { x: 0.5, y: 0.5 },
        });
        setCollectionCreated(true);
      } catch {
        // mutation errors already toasted by useCreateCollection onError
      }
    } catch (err) {
      console.error('[create collection]', err);
      toast.error('Failed to create collection', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
    } finally {
      setCollectionCreating(false);
    }
  };

  const reset = useCallback(() => {
    setQuery('');
    setYear('');
    setResult(null);
    setError(null);
    setNewGenres([]);
    setCollectionCreated(false);
  }, []);

  return {
    query, setQuery,
    year, setYear,
    result,
    loading,
    error,
    applying,
    effectiveNewGenres,
    collectionCreating,
    collectionCreated,
    handleSearch,
    handleApply,
    handleCreateCollection,
    reset,
  };
};
