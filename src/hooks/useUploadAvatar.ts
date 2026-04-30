import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadAvatar } from '../api/avatar'

export const useUploadAvatar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, categoryId, file }: { name: string; categoryId: string; file: File }) =>
      uploadAvatar(name, categoryId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['avatars'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
