import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateSubtitle } from '../api/media'
import { useAuth } from '../auth/useAuth'

export const useUpdateSubtitle = (mediaId: string) => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: ({ subtitleId, ...fields }: { subtitleId: string; enabled?: boolean; title?: string }) =>
      updateSubtitle(mediaId, subtitleId, fields, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videos', mediaId, special] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update subtitle', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
