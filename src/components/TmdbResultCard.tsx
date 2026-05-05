import { Loader2 } from 'lucide-react';
import type { TmdbGenre } from '../types/api';

interface TmdbResultCardProps {
  imageUrl?: string | null;
  imageAlt: string;
  imageClassName: string;
  title: string;
  subtitle?: string;
  metaLine?: string;
  overview?: string;
  genres?: TmdbGenre[];
  onApply: () => void;
  applying: boolean;
  footer?: React.ReactNode;
}

export const TmdbResultCard = ({
  imageUrl, imageAlt, imageClassName,
  title, subtitle, metaLine, overview, genres,
  onApply, applying, footer,
}: TmdbResultCardProps) => (
  <>
    <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
      {imageUrl && (
        <img src={imageUrl} alt={imageAlt} className={`shrink-0 rounded object-cover ${imageClassName}`} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold leading-tight">
          {title}
          {subtitle && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">{subtitle}</span>
          )}
        </p>
        {metaLine && <p className="text-xs text-muted-foreground">{metaLine}</p>}
        {overview && <p className="line-clamp-2 text-xs text-muted-foreground">{overview}</p>}
        {genres && genres.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {genres.map((g) => (
              <span key={g.id} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={applying}
        className="shrink-0 self-start rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {applying ? <Loader2 size={12} className="animate-spin" /> : 'Use this'}
      </button>
    </div>
    {footer}
  </>
);
