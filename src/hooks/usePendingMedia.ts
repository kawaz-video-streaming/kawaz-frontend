import { useQuery } from '@tanstack/react-query'
import { getUploadingMedia } from '../api/media'
import type { PendingMediaItem } from '../types/api'

export const usePendingMedia = (enabled: boolean) =>
  useQuery<PendingMediaItem[]>({
    queryKey: ['media', 'uploading'],
    queryFn: getUploadingMedia,
    refetchInterval: 3000,
    enabled,
    retry: false,
  })
