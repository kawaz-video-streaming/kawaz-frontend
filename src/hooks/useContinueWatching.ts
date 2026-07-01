import { useQuery } from '@tanstack/react-query'
import { getContinueWatching } from '../api/user'
import type { ContinueWatchingItem } from '../types/api'

export const useContinueWatching = (profileName: string) =>
  useQuery<ContinueWatchingItem[]>({
    queryKey: ['continue-watching', profileName],
    queryFn: () => getContinueWatching(profileName),
    enabled: profileName.length > 0,
    retry: false,
  })
