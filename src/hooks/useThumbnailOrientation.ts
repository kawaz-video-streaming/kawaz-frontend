import { useState } from 'react'

export type ThumbnailOrientation = 'vertical' | 'horizontal'

const STORAGE_KEY = 'thumbnailOrientation'

export const useThumbnailOrientation = () => {
  const [orientation, setOrientation] = useState<ThumbnailOrientation>(
    () => (localStorage.getItem(STORAGE_KEY) as ThumbnailOrientation) ?? 'vertical',
  )

  const toggle = () =>
    setOrientation((prev) => {
      const next: ThumbnailOrientation = prev === 'vertical' ? 'horizontal' : 'vertical'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })

  return { orientation, toggle }
}

export const ORIENTATION_CONFIG = {
  vertical: {
    aspectRatio: 2 / 3,
    paddingClass: 'pt-[150%]',
    gridClass: 'grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },
  horizontal: {
    aspectRatio: 16 / 9,
    paddingClass: 'pt-[56.25%]',
    gridClass: 'grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },
} as const
