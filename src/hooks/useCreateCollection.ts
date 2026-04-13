import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCollection, type CreateCollectionParams } from '../api/mediaCollection'

export const useCreateCollection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateCollectionParams) => createCollection(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      toast.success('Collection created')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create collection', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
