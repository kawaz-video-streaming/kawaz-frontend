import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createAvatarCategory } from '../api/avatarCategory'

export const useCreateAvatarCategory = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (name: string) => createAvatarCategory(name),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['avatarCategories'] })
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to create category', {
                style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
            })
        },
    })
}
