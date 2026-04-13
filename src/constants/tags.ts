export const MEDIA_TAGS = [
  'Action',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Education',
  'Horror',
  'Kids',
  'Music',
  'News',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
] as const

export type MediaTag = (typeof MEDIA_TAGS)[number]
