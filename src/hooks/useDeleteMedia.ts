import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteMedia } from '../api/media'

export const useDeleteMedia = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
