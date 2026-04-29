import { useQuery } from '@tanstack/react-query'
import { getGenres } from '../api/mediaGenre'
import type { MediaGenre } from '../types/api'

export const useGenres = () =>
    useQuery<MediaGenre[]>({
        queryKey: ['genres'],
        queryFn: getGenres,
        retry: false,
    })
