import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { approveUser } from '../api/admin'
import type { PendingUser } from '../types/api'

export const useApproveUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => approveUser(username),
    onSuccess: (_, username) => {
      toast.success(`${username} approved`)
      queryClient.setQueryData<PendingUser[]>(['pending-users'], (old) =>
        old?.filter((u) => u.name !== username) ?? []
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to approve user', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
