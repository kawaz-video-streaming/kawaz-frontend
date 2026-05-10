import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateCollection, type UpdateCollectionParams } from '../api/mediaCollection'
import { useAuth } from '../auth/useAuth'

export const useUpdateCollection = (id: string) => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: (params: Omit<UpdateCollectionParams, 'id'>) => updateCollection({ id, ...params }, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', id, special] })
      void queryClient.invalidateQueries({ queryKey: ['collections', special] })
      toast.success('Collection updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Update failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
