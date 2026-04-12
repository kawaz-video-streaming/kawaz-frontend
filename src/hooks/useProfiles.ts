import { useQuery } from '@tanstack/react-query'
import { getProfiles } from '../api/user'
import type { Profile } from '../types/api'

export const useProfiles = () =>
  useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: getProfiles,
    retry: false,
  })
