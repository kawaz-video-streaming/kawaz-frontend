import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { denyUser } from '../api/admin'
import type { PendingUser } from '../types/api'

export const useDenyUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => denyUser(username),
    onSuccess: (_, username) => {
      toast.success(`${username} denied`)
      queryClient.setQueryData<PendingUser[]>(['pending-users'], (old) =>
        old?.filter((u) => u.name !== username) ?? []
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to deny user', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
