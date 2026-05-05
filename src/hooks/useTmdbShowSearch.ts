import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Coordinates, MediaGenre, TmdbShowDetails } from '../types/api';
import { fetchTmdbPoster, searchTmdbShow } from '../api/media';

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

export const useTmdbShowSearch = ({
  genreOptions, thumbnailPreview,
  setTitle, setDescription, setGenres,
  setThumbnail, setThumbnailPreview, setThumbnailFocalPoint,
}: Options) => {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [result, setResult] = useState<TmdbShowDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [newGenres, setNewGenres] = useState<string[]>([]);

  const effectiveNewGenres = newGenres.filter(
    (name) => !(genreOptions ?? []).some((g) => g.name === name),
  );

  const handleSearch = async () => {
    const q = query.trim();
    const y = parseInt(year, 10);
    if (!q || !year || isNaN(y)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNewGenres([]);
    try {
      setResult(await searchTmdbShow(q, y));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (r: TmdbShowDetails) => {
    setTitle(r.name);
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
      const file = new File([blob], `${r.name}-poster.${ext}`, { type: blob.type });
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

  const reset = useCallback(() => {
    setQuery('');
    setYear('');
    setResult(null);
    setError(null);
    setNewGenres([]);
  }, []);

  return {
    query, setQuery,
    year, setYear,
    result,
    loading,
    error,
    applying,
    effectiveNewGenres,
    handleSearch,
    handleApply,
    reset,
  };
};
