import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteProfile } from '../api/user'

export const useDeleteProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => deleteProfile(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete profile', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
