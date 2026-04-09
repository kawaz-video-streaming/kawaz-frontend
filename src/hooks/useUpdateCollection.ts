import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateCollection, type UpdateCollectionParams } from '../api/mediaCollection'

export const useUpdateCollection = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Omit<UpdateCollectionParams, 'id'>) => updateCollection({ id, ...params }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', id] })
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Collection updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Update failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
