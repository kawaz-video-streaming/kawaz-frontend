import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteGenre } from '../api/mediaGenre';

export const useDeleteGenre = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteGenre(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['genres'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete genre', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
    },
  });
};
