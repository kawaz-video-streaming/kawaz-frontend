import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { removeFromWatchlist } from '../api/user'
import type { VideoListItem } from '../types/api'

export const useRemoveFromWatchlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, mediaId }: { profileName: string; mediaId: string }) =>
      removeFromWatchlist(profileName, mediaId),
    onSuccess: (_, { profileName, mediaId }) => {
      queryClient.setQueryData<VideoListItem[]>(['watchlist', profileName], (old) =>
        old?.filter((v) => v._id !== mediaId) ?? []
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from watchlist', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
