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
  subtitleId?: string
  fileName?: string
  enabled?: boolean
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
  episodeNumber?: number
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

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbCollection {
  id: number
  name: string
  poster_url: string | null
}

export interface TmdbShowDetails {
  id: number
  name: string
  overview: string
  first_air_date: string
  poster_url: string | null
  backdrop_url: string | null
  genres: TmdbGenre[]
  vote_average: number
  vote_count: number
  number_of_seasons: number
  tagline: string
}

export interface TmdbEpisodeDetails {
  id: number
  name: string
  overview: string
  air_date: string
  episode_number: number
  season_number: number
  still_url: string | null
  vote_average: number
  vote_count: number
  runtime: number | null
}

export interface TmdbCollectionDetails {
  id: number
  name: string
  overview: string
  poster_url: string | null
  backdrop_url: string | null
  genres: TmdbGenre[]
}

export interface TmdbMovieDetails {
  id: number
  title: string
  overview: string
  release_date: string
  poster_url: string | null
  backdrop_url: string | null
  genres: TmdbGenre[]
  vote_average: number
  vote_count: number
  runtime: number | null
  tagline: string
  imdb_id: string | null
  belongs_to_collection: TmdbCollection | null
}
