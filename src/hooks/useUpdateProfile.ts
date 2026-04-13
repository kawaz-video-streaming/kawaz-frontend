import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateProfile } from '../api/user'
import type { Profile } from '../types/api'

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, avatarId }: { profileName: string; avatarId: string }) =>
      updateProfile(profileName, avatarId),
    onSuccess: (_, { profileName, avatarId }) => {
      queryClient.setQueryData<Profile[]>(['profiles'], (old) =>
        old?.map((p) => p.name === profileName ? { ...p, avatarId } : p) ?? []
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
