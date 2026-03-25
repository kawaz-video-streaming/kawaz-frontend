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
  title: string
  startTimeMs: number
}

export interface Video {
  _id: string
  title: string
  durationInMs: number
  playUrl: string
  chaptersUrl?: string
  chapters?: VideoChapter[]
  videoStreams: VideoStream[]
  audioStreams: AudioStream[]
  subtitleStreams: SubtitleStream[]
}

export interface VideoListItem {
  _id: string
  title: string
  durationInMs: number
  thumbnailUrl?: string
}
