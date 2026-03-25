import { useQuery } from '@tanstack/react-query'
import type { Video } from '../types/api'
import { getVideo } from '../api/vod'

// TODO: swap getVideo import to use apiRequest via kawaz-backend once it proxies vod
export const useVideo = (id: string) =>
  useQuery<Video>({
    queryKey: ['videos', id],
    queryFn: () => getVideo(id),
    retry: false,
    enabled: id.length > 0,
  })
