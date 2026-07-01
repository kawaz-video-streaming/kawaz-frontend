import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeFromWatchlist } from '../api/user'
import type { WatchlistEntry, WatchlistItemKind } from '../types/api'

export const useRemoveFromWatchlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, id, kind }: { profileName: string; id: string; kind: WatchlistItemKind }) =>
      removeFromWatchlist(profileName, id, kind),
    onSuccess: (_, { profileName, id, kind }) => {
      queryClient.setQueryData<WatchlistEntry[]>(['watchlist', profileName], (old) =>
        old?.filter((entry) => !(entry.id === id && entry.kind === kind)) ?? []
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from watchlist', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
