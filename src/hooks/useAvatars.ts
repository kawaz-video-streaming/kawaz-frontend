import { useQuery } from '@tanstack/react-query'
import { getAvatars } from '../api/avatar'
import { useAuth } from '../auth/useAuth'
import type { Avatar } from '../types/api'

export const useAvatars = () => {
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useQuery<Avatar[]>({
    queryKey: ['avatars', special],
    queryFn: () => getAvatars(special),
    retry: false,
  })
}
