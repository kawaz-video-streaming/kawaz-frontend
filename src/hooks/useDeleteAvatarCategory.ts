import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteAvatarCategory } from '../api/avatarCategory'

export const useDeleteAvatarCategory = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteAvatarCategory(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['avatarCategories'] })
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to delete category', {
                style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
            })
        },
    })
}
