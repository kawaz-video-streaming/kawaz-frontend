import { useQuery } from '@tanstack/react-query'
import { getWatchlist } from '../api/user'
import type { WatchlistEntry } from '../types/api'

export const useWatchlist = (profileName: string) =>
  useQuery<WatchlistEntry[]>({
    queryKey: ['watchlist', profileName],
    queryFn: () => getWatchlist(profileName),
    enabled: profileName.length > 0,
    retry: false,
  })
