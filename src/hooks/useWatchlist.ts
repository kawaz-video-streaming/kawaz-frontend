import { useQuery } from '@tanstack/react-query'
import { getWatchlist } from '../api/user'

export const useWatchlist = (profileName: string) =>
  useQuery<string[]>({
    queryKey: ['watchlist', profileName],
    queryFn: () => getWatchlist(profileName),
    enabled: profileName.length > 0,
    retry: false,
  })
