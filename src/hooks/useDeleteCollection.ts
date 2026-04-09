import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteCollection } from '../api/mediaCollection'

export const useDeleteCollection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Collection deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
