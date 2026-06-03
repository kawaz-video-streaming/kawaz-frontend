import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Coordinates, TmdbSeasonDetails } from '../types/api';
import { fetchTmdbPoster, searchTmdbSeason } from '../api/media';

interface Options {
  thumbnailPreview: string | null;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setSeasonNumber: (v: string) => void;
  setThumbnail: (v: File) => void;
  setThumbnailPreview: (v: string) => void;
  setThumbnailFocalPoint: (v: Coordinates) => void;
}

export const useTmdbSeasonSearch = ({
  thumbnailPreview,
  setTitle, setDescription, setSeasonNumber,
  setThumbnail, setThumbnailPreview, setThumbnailFocalPoint,
}: Options) => {
  const [showTitle, setShowTitle] = useState('');
  const [showYear, setShowYear] = useState('');
  const [season, setSeason] = useState('');
  const [result, setResult] = useState<TmdbSeasonDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const handleSearch = async () => {
    const title = showTitle.trim();
    const yr = parseInt(showYear, 10);
    const s = parseInt(season, 10);
    if (!title || isNaN(yr) || isNaN(s)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchTmdbSeason(title, yr, s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (r: TmdbSeasonDetails) => {
    setTitle(r.name);
    setDescription(r.overview);
    setSeasonNumber(String(r.season_number));
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
      console.error('[TMDB season poster fetch]', err);
      toast.error('Could not fetch poster — add a thumbnail manually', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
    } finally {
      setApplying(false);
    }
  };

  const reset = useCallback(() => {
    setShowTitle('');
    setShowYear('');
    setSeason('');
    setResult(null);
    setError(null);
  }, []);

  return {
    showTitle, setShowTitle,
    showYear, setShowYear,
    season, setSeason,
    result,
    loading,
    error,
    applying,
    handleSearch,
    handleApply,
    reset,
  };
};
