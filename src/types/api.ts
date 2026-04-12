export type MediaStatus = 'pending' | 'processing' | 'completed' | 'failed'

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
  tags: string[]
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
  tags: string[]
  thumbnailFocalPoint: Coordinates
  collectionId?: string
}

export interface CollectionListItem {
  _id: string
  title: string
  description?: string
  tags: string[]
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
  category: string
}
