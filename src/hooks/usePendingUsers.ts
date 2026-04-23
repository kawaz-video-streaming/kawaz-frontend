import { useQuery } from '@tanstack/react-query'
import { getPendingUsers } from '../api/admin'
import type { PendingUser } from '../types/api'

export const usePendingUsers = (enabled: boolean, panelOpen: boolean) =>
  useQuery<PendingUser[]>({
    queryKey: ['pending-users'],
    queryFn: getPendingUsers,
    refetchInterval: panelOpen ? 10000 : 30000,
    enabled,
    retry: false,
  })
