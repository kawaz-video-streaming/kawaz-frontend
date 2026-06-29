import { useQuery } from '@tanstack/react-query'
import { getWatchlist } from '../api/user'
import type { VideoListItem } from '../types/api'

export const useWatchlist = (profileName: string) =>
  useQuery<VideoListItem[]>({
    queryKey: ['watchlist', profileName],
    queryFn: () => getWatchlist(profileName),
    enabled: profileName.length > 0,
    retry: false,
  })
