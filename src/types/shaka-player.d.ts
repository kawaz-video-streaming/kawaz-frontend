declare module 'shaka-player' {
  namespace polyfill {
    function installAll(): void
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

  class Player {
    constructor()
    static isBrowserSupported(): boolean
    attach(video: HTMLMediaElement): Promise<void>
    load(uri: string): Promise<void>
    addChaptersTrack(uri: string, language: string, mimeType?: string): Promise<TextTrack>
    destroy(): Promise<void>
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    getVariantTracks(): VariantTrack[]
    getTextTracks(): TextTrack[]
    getChaptersTracks(): TextTrack[]
    getChaptersAsync(language: string): Promise<Chapter[]>
    selectVariantTrack(track: VariantTrack, clearBuffer?: boolean, safeMargin?: number): void
    selectTextTrack(track: TextTrack): void
    setTextTrackVisibility(isVisible: boolean): void
    isTextTrackVisible(): boolean
  }

  export { polyfill, Player }
  export type { Chapter, VariantTrack, TextTrack }
}

declare module 'shaka-player/dist/shaka-player.ui.js' {
  import { Player, polyfill } from 'shaka-player'
  import type { Chapter, VariantTrack, TextTrack } from 'shaka-player'

  namespace ui {
    class Overlay {
      constructor(player: Player, container: HTMLElement, video: HTMLMediaElement)
      configure(config: string | object, value?: unknown): void
      destroy(forceDisconnect?: boolean): Promise<void>
    }
  }

  export { Player, polyfill, ui }
  export type { Chapter, VariantTrack, TextTrack }
}
