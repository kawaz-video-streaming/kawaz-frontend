import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteMedia } from '../api/media'
import { useAuth } from '../auth/useAuth'

export const useDeleteMedia = () => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videos', special] })
      void queryClient.invalidateQueries({ queryKey: ['media', 'uploading', special] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
