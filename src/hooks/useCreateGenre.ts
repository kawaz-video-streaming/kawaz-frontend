import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createGenre } from '../api/mediaGenre';

export const useCreateGenre = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGenre(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['genres'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create genre', {
        style: { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' },
      });
    },
  });
};
