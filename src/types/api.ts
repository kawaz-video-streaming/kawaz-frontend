export type MediaStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MediaKind = 'movie' | 'episode'
export type CollectionKind = 'show' | 'season' | 'collection'

export interface VideoStream {
  title: string
  durationInMs: number
}

export interface AudioStream {
  language: string
  title: string
  durationInMs: number
}

export interface SubtitleStream {
  language: string
  title: string
  durationInMs: number
}

export interface VideoChapter {
  chapterName: string
  chapterStartTime: number
  chapterEndTime: number
}

export interface Video {
  _id: string
  title: string
  description?: string
  genres: string[]
  kind?: MediaKind
  episodeNumber?: number
  thumbnailFocalPoint: Coordinates
  collectionId?: string
  durationInMs: number
  playUrl: string
  chaptersUrl?: string
  thumbnailsUrl?: string
  chapters?: VideoChapter[]
  videoStreams: VideoStream[]
  audioStreams: AudioStream[]
  subtitleStreams: SubtitleStream[]
}

export interface Coordinates {
  x: number
  y: number
}

export interface VideoListItem {
  _id: string
  title: string
  description?: string
  durationInMs: number
  genres: string[]
  kind?: MediaKind
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export interface CollectionListItem {
  _id: string
  title: string
  description?: string
  genres: string[]
  kind?: CollectionKind
  seasonNumber?: number
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export interface Profile {
  name: string
  avatarId: string
}

export interface Avatar {
  _id: string
  name: string
  categoryId: string
}

export interface MediaGenre {
  _id: string
  name: string
}

export interface AvatarCategory {
  _id: string
  name: string
}

export interface PendingMediaItem {
  _id: string
  title: string
  status: MediaStatus
  percentage: number
}

export interface PendingUser {
  name: string
  email: string
  status: 'pending'
  role: string
}
