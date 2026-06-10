declare module 'shaka-player' {
  namespace polyfill {
    function installAll(): void
  }

  interface AudioTrack {
    language: string
    label: string | null
    active: boolean
    roles: string[]
    channelsCount: number | null
    audioSamplingRate: number | null
    spatialAudio: boolean
  }

  interface VariantTrack {
    id: number
    active: boolean
    language: string
    label?: string
    audioCodec?: string
    roles?: string[]
    channelsCount?: number
  }

  interface TextTrack {
    id: number
    active: boolean
    language: string
    label?: string
    kind?: string
    roles?: string[]
  }

  interface Chapter {
    id: string
    title: string
    startTime: number
    endTime: number
  }

  interface ThumbnailData {
    startTime: number
    endTime: number
    uris: string[]
    width: number
    height: number
    positionX: number
    positionY: number
    imageWidth: number
    imageHeight: number
  }

  interface ImageTrack {
    id: number
  }

  class Player {
    constructor()
    static isBrowserSupported(): boolean
    attach(video: HTMLMediaElement): Promise<void>
    load(uri: string): Promise<void>
    getNetworkingEngine(): {
      registerRequestFilter(filter: (type: number, request: { uris: string[]; method: string; allowCrossSiteCredentials: boolean; headers: Record<string, string> }) => void): void
      registerResponseFilter(filter: (type: number, response: { uri: string; data: ArrayBuffer }) => void): void
    } | null
    addChaptersTrack(uri: string, language: string, mimeType?: string): Promise<TextTrack>
    addThumbnailsTrack(uri: string, mimeType?: string): Promise<TextTrack>
    getImageTracks(): ImageTrack[]
    getThumbnails(trackId: number, time: number): Promise<ThumbnailData | null>
    destroy(): Promise<void>
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    getVariantTracks(): VariantTrack[]
    getAudioTracks(): AudioTrack[]
    selectAudioTrack(track: AudioTrack): void
    getTextTracks(): TextTrack[]
    getChaptersTracks(): TextTrack[]
    getChaptersAsync(language: string): Promise<Chapter[]>
    selectVariantTrack(track: VariantTrack, clearBuffer?: boolean, safeMargin?: number): void
    selectTextTrack(track?: TextTrack | null): void
    isTextTrackVisible(): boolean
    setVideoContainer(container: HTMLElement | null): void
  }

  export { polyfill, Player }
  export type { Chapter, AudioTrack, VariantTrack, TextTrack, ThumbnailData, ImageTrack }
}

declare module 'shaka-player/dist/shaka-player.ui.js' {
  import { Player, polyfill } from 'shaka-player'
  import type { Chapter, AudioTrack, VariantTrack, TextTrack, ThumbnailData, ImageTrack } from 'shaka-player'

  export { Player, polyfill }
  export type { Chapter, AudioTrack, VariantTrack, TextTrack, ThumbnailData, ImageTrack }

  namespace offline {
    interface StoredContent {
      offlineUri: string | null
      originalManifestUri: string
      size: number
      appMetadata: Record<string, unknown>
      expiration: number
      isIncomplete: boolean
    }

    interface StoreOperation {
      promise: Promise<StoredContent>
      abort(): void
    }

    interface OfflineTrack {
      type: string
      language: string
      bandwidth: number
      id: number
    }

    class Storage {
      constructor(player?: Player)
      configure(config: object | string, value?: unknown): boolean
      getNetworkingEngine(): {
        registerRequestFilter(filter: (type: number, request: { uris: string[]; method: string; allowCrossSiteCredentials: boolean; headers: Record<string, string> }) => void): void
      } | null
      list(): Promise<StoredContent[]>
      store(uri: string, appMetadata?: object, mimeType?: string | null): StoreOperation
      remove(contentUri: string): Promise<void>
      destroy(): Promise<void>
    }
  }

  export { offline }
}
