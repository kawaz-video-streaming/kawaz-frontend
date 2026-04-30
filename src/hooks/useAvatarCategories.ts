import { useQuery } from '@tanstack/react-query';
import { getAvatarCategories } from '../api/avatarCategory';
import type { AvatarCategory } from '../types/api';

export const useAvatarCategories = () =>
  useQuery<AvatarCategory[]>({
    queryKey: ['avatarCategories'],
    queryFn: getAvatarCategories,
    retry: false,
  });
