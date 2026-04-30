import { apiRequest } from './client';
import type { AvatarCategory } from '../types/api';

export const getAvatarCategories = () =>
  apiRequest<AvatarCategory[]>('/avatarCategory');

export const createAvatarCategory = (name: string) =>
  apiRequest<{ message: string }>('/avatarCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const deleteAvatarCategory = (id: string) =>
  apiRequest<{ message: string }>(`/avatarCategory/${id}`, { method: 'DELETE' });
