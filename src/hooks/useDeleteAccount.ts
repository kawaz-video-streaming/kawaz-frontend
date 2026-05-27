import { useMutation } from '@tanstack/react-query'
import { deleteAccount } from '../api/user'

export const useDeleteAccount = () =>
  useMutation({ mutationFn: deleteAccount })
