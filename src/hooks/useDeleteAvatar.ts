import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteAvatar } from '../api/avatar'
import type { Avatar } from '../types/api'

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAvatar(id),
    onSuccess: (_, id) => {
      toast.success('Avatar deleted')
      queryClient.setQueryData<Avatar[]>(['avatars'], (old) => old?.filter((a) => a._id !== id) ?? [])
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete avatar', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
