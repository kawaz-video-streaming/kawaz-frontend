import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addToWatchlist } from '../api/user'
import type { WatchlistEntry, WatchlistItemKind } from '../types/api'

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, id, kind }: { profileName: string; id: string; kind: WatchlistItemKind }) =>
      addToWatchlist(profileName, id, kind),
    onSuccess: (_, { profileName, id, kind }) => {
      queryClient.setQueryData<WatchlistEntry[]>(['watchlist', profileName], (old) => {
        if (!old) return [{ id, kind }]
        if (old.some((entry) => entry.id === id && entry.kind === kind)) return old
        return [...old, { id, kind }]
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add to watchlist', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
