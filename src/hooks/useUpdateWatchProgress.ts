import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateWatchProgress } from '../api/user'

export const useUpdateWatchProgress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, mediaId, positionInMs }: { profileName: string; mediaId: string; positionInMs: number }) =>
      updateWatchProgress(profileName, mediaId, positionInMs),
    onSuccess: (_, { profileName }) => {
      void queryClient.invalidateQueries({ queryKey: ['continue-watching', profileName] })
    },
  })
}
