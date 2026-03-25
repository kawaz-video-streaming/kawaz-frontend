import { useMutation } from '@tanstack/react-query'
import { uploadMedia } from '../api/media'

export const useUploadMedia = () =>
  useMutation({
    mutationFn: (file: File) => uploadMedia(file),
  })
