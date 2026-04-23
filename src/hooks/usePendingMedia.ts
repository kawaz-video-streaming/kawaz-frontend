import { useQuery } from '@tanstack/react-query'
import { getUploadingMedia } from '../api/media'
import type { PendingMediaItem } from '../types/api'

export const usePendingMedia = (enabled: boolean, panelOpen: boolean) =>
  useQuery<PendingMediaItem[]>({
    queryKey: ['media', 'uploading'],
    queryFn: getUploadingMedia,
    refetchInterval: panelOpen ? 3000 : 10000,
    enabled,
    retry: false,
  })
