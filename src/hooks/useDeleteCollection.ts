import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteCollection } from '../api/mediaCollection'
import { useAuth } from '../auth/useAuth'

export const useDeleteCollection = () => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collections', special] })
      toast.success('Collection deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
