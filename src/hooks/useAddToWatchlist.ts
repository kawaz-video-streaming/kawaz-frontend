import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addToWatchlist } from '../api/user'

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, mediaId }: { profileName: string; mediaId: string }) =>
      addToWatchlist(profileName, mediaId),
    onSuccess: (_, { profileName, mediaId }) => {
      queryClient.setQueryData<string[]>(['watchlist', profileName], (old) => {
        if (!old) return old
        if (old.includes(mediaId)) return old
        return [...old, mediaId]
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add to watchlist', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
