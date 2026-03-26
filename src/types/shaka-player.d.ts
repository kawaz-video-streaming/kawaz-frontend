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

  class Player {
    constructor()
    static isBrowserSupported(): boolean
    attach(video: HTMLMediaElement): Promise<void>
    load(uri: string): Promise<void>
    destroy(): Promise<void>
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    getVariantTracks(): VariantTrack[]
    getTextTracks(): TextTrack[]
    selectVariantTrack(track: VariantTrack, clearBuffer?: boolean, safeMargin?: number): void
    selectTextTrack(track: TextTrack): void
    setTextTrackVisibility(isVisible: boolean): void
    isTextTrackVisible(): boolean
  }

  export { polyfill, Player }
  export type { VariantTrack, TextTrack }
}

declare module 'shaka-player/dist/shaka-player.ui.js' {
  import { Player, polyfill } from 'shaka-player'
  import type { VariantTrack, TextTrack } from 'shaka-player'

  namespace ui {
    class Overlay {
      constructor(player: Player, container: HTMLElement, video: HTMLMediaElement)
      configure(config: string | object, value?: unknown): void
      destroy(forceDisconnect?: boolean): Promise<void>
    }
  }

  export { Player, polyfill, ui }
  export type { VariantTrack, TextTrack }
}
