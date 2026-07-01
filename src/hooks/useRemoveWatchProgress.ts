import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeWatchProgress } from '../api/user'

export const useRemoveWatchProgress = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileName, mediaId }: { profileName: string; mediaId: string }) =>
      removeWatchProgress(profileName, mediaId),
    onSuccess: (_, { profileName }) => {
      void queryClient.invalidateQueries({ queryKey: ['continue-watching', profileName] })
    },
  })
}
