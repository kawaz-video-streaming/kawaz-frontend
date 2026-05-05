import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Coordinates, TmdbEpisodeDetails } from '../types/api';
import { fetchTmdbPoster, searchTmdbEpisode } from '../api/media';

interface Options {
  thumbnailPreview: string | null;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setEpisodeNumber: (v: string) => void;
  setThumbnail: (v: File) => void;
  setThumbnailPreview: (v: string) => void;
  setThumbnailFocalPoint: (v: Coordinates) => void;
}

export const useTmdbEpisodeSearch = ({
  thumbnailPreview,
  setTitle, setDescription, setEpisodeNumber,
  setThumbnail, setThumbnailPreview, setThumbnailFocalPoint,
}: Options) => {
  const [showTitle, setShowTitle] = useState('');
  const [showYear, setShowYear] = useState('');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [result, setResult] = useState<TmdbEpisodeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const handleSearch = async () => {
    const title = showTitle.trim();
    const yr = parseInt(showYear, 10);
    const s = parseInt(season, 10);
    const ep = parseInt(episode, 10);
    if (!title || isNaN(yr) || isNaN(s) || isNaN(ep)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await searchTmdbEpisode(title, yr, s, ep));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (r: TmdbEpisodeDetails) => {
    setTitle(r.name);
    setDescription(r.overview);
    setEpisodeNumber(String(r.episode_number));
    if (!r.still_url) return;
    setApplying(true);
    try {
      const blob = await fetchTmdbPoster(r.still_url);
      const ext = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `${r.name}-still.${ext}`, { type: blob.type });
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
      setApplying(false);
    }
  };

  const reset = useCallback(() => {
    setShowTitle('');
    setShowYear('');
    setSeason('');
    setEpisode('');
    setResult(null);
    setError(null);
  }, []);

  return {
    showTitle, setShowTitle,
    showYear, setShowYear,
    season, setSeason,
    episode, setEpisode,
    result,
    loading,
    error,
    applying,
    handleSearch,
    handleApply,
    reset,
  };
};
