import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addSubtitle } from '../api/media'
import { useAuth } from '../auth/useAuth'

export const useAddSubtitle = (mediaId: string) => {
  const queryClient = useQueryClient()
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: ({ file, language, title }: { file: File; language: string; title: string }) =>
      addSubtitle(mediaId, file, language, title, special),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['videos', mediaId, special] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add subtitle', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
