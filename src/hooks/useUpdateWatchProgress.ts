import { useMutation } from '@tanstack/react-query'
import { updateWatchProgress } from '../api/user'

export const useUpdateWatchProgress = () =>
  useMutation({
    mutationFn: ({ profileName, mediaId, positionInMs }: { profileName: string; mediaId: string; positionInMs: number }) =>
      updateWatchProgress(profileName, mediaId, positionInMs),
  })
