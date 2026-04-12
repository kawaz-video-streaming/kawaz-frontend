import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createProfile } from '../api/user'

export const useCreateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, avatarId }: { profileName: string; avatarId: string }) =>
      createProfile(profileName, avatarId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
