import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCreateGenre } from '../hooks/useCreateGenre';

interface NewGenrePillsProps {
  newGenres: string[];
  selectedGenres: string[];
  onToggle: (name: string) => void;
}

export const NewGenrePills = ({ newGenres, selectedGenres, onToggle }: NewGenrePillsProps) => {
  const [creatingGenres, setCreatingGenres] = useState<string[]>([]);
  const { mutate: createGenre } = useCreateGenre();

  if (newGenres.length === 0) return null;

  return (
    <>
      {newGenres.map((name) => {
        const selected = selectedGenres.includes(name);
        const isCreating = creatingGenres.includes(name);
        return (
          <div key={name} className="flex items-center">
            <button
              type="button"
              onClick={() => onToggle(name)}
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
    </>
  );
};
