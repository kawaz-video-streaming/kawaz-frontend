import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadMedia, type UploadMediaParams } from '../api/media'
import { useAuth } from '../auth/useAuth'

export const useUploadMedia = () => {
  const { isAdmin, specialPool } = useAuth()
  const special = isAdmin && specialPool
  return useMutation({
    mutationFn: (params: UploadMediaParams) => uploadMedia(params, special),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
}
