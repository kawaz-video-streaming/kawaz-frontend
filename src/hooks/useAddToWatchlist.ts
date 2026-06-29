import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addToWatchlist } from '../api/user'
import type { VideoListItem } from '../types/api'

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, mediaId }: { profileName: string; mediaId: string }) =>
      addToWatchlist(profileName, mediaId),
    onSuccess: (_, { profileName, mediaId }) => {
      queryClient.setQueryData<VideoListItem[]>(['watchlist', profileName], (old) => {
        if (!old) return old
        const videos = queryClient.getQueryData<VideoListItem[]>(['videos', false])
          ?? queryClient.getQueryData<VideoListItem[]>(['videos', true])
          ?? []
        const item = videos.find((v) => v._id === mediaId)
        if (!item || old.some((v) => v._id === mediaId)) return old
        return [...old, item]
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add to watchlist', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
