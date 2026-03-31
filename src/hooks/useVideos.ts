import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../api/client'
import type { VideoListItem } from '../types/api'

export const useVideos = () =>
  useQuery<VideoListItem[]>({
    queryKey: ['videos'],
    queryFn: () => apiRequest<VideoListItem[]>('/media/videos'),
    retry: false,
  })
