import { useQuery } from '@tanstack/react-query'
import type { VideoListItem } from '../types/api'

// Placeholder — kawaz-backend will expose GET /videos in a future iteration
export const useVideos = () =>
  useQuery<VideoListItem[]>({
    queryKey: ['videos'],
    queryFn: (): Promise<VideoListItem[]> =>
      Promise.reject(new Error('Video listing endpoint not yet available')),
    retry: false,
    enabled: false,
  })
