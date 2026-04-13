import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateMedia, type UpdateMediaParams } from '../api/media'

export const useUpdateMedia = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Omit<UpdateMediaParams, 'id'>) => updateMedia({ id, ...params }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videos', id] })
      void queryClient.invalidateQueries({ queryKey: ['videos'] })
      toast.success('Media updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Update failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
