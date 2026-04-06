import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadMedia, type UploadMediaParams } from '../api/media'

export const useUploadMedia = () =>
  useMutation({
    mutationFn: (params: UploadMediaParams) => uploadMedia(params),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload failed', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      })
    },
  })
