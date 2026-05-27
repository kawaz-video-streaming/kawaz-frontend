import { useMutation } from '@tanstack/react-query'
import { sendNewsletter } from '../api/admin'

export const useSendNewsletter = () =>
  useMutation({ mutationFn: ({ subject, body }: { subject: string; body: string }) => sendNewsletter(subject, body) })
