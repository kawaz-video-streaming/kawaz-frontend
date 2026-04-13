import { useQuery } from '@tanstack/react-query'
import { getAvatars } from '../api/avatar'
import type { Avatar } from '../types/api'

export const useAvatars = () =>
  useQuery<Avatar[]>({
    queryKey: ['avatars'],
    queryFn: getAvatars,
    retry: false,
  })
