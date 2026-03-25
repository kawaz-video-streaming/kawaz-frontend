declare module 'shaka-player' {
  namespace polyfill {
    function installAll(): void
  }

  class Player {
    constructor()
    static isBrowserSupported(): boolean
    attach(video: HTMLMediaElement): Promise<void>
    load(uri: string): Promise<void>
    destroy(): Promise<void>
  }

  export { polyfill, Player }
}
