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

  class Player {
    constructor()
    static isBrowserSupported(): boolean
    attach(video: HTMLMediaElement): Promise<void>
    load(uri: string): Promise<void>
    destroy(): Promise<void>
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
    getVariantTracks(): VariantTrack[]
    selectVariantTrack(track: VariantTrack, clearBuffer?: boolean, safeMargin?: number): void
  }

  export { polyfill, Player }
}
