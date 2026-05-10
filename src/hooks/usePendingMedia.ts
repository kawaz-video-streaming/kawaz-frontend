import { useQuery } from '@tanstack/react-query'
import { getUploadingMedia } from '../api/media'
import { useAuth } from '../auth/useAuth'
import type { PendingMediaItem } from '../types/api'

export const usePendingMedia = (enabled: boolean, panelOpen: boolean) => {
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useQuery<PendingMediaItem[]>({
    queryKey: ['media', 'uploading', special],
    queryFn: () => getUploadingMedia(special),
    refetchInterval: panelOpen ? 3000 : 10000,
    enabled,
    retry: false,
  })
}
