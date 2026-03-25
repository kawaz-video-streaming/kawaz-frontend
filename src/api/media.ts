import z from 'zod'
import { apiUpload } from './client'

const uploadMediaResponseSchema = z.object({
  message: z.string(),
})

export type UploadMediaResponse = z.infer<typeof uploadMediaResponseSchema>

export const uploadMedia = async (file: File): Promise<UploadMediaResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const raw = await apiUpload<unknown>('/media/upload', formData)
  return uploadMediaResponseSchema.parse(raw)
}
