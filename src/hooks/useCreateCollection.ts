import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCollection, type CreateCollectionParams } from '../api/mediaCollection'
import { useAuth } from '../auth/useAuth'

export const useCreateCollection = () => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: (params: CreateCollectionParams) => createCollection(params, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', special] })
      toast.success('Collection created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create collection', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
