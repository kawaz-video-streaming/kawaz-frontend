import 'shaka-player/dist/controls.css'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

interface VideoPlayerProps {
  manifestUrl: string
  className?: string
}

export const VideoPlayer = ({ manifestUrl, className }: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true)

  useEffect(() => {
    let isDisposed = false
    let player: import('shaka-player').Player | null = null
    let uiOverlay: { configure(config: object): void; destroy(): Promise<void> } | null = null

    const setupPlayer = async () => {
      setIsLoadingPlayer(true)
      setPlayerError(null)

      if (!videoRef.current || !containerRef.current) {
        setIsLoadingPlayer(false)
        return
      }

      try {
        const shaka = await import('shaka-player/dist/shaka-player.ui.js')

        if (isDisposed) return

        shaka.polyfill.installAll()

        if (!shaka.Player.isBrowserSupported()) {
          setPlayerError('This browser does not support playback for this stream.')
          setIsLoadingPlayer(false)
          return
        }

        player = new shaka.Player()
        await player.attach(videoRef.current)

        if (isDisposed) return

        uiOverlay = new shaka.ui.Overlay(player, containerRef.current, videoRef.current)
        uiOverlay.configure({
          controlPanelElements: [
            'play_pause',
            'time_and_duration',
            'mute',
            'volume',
            'spacer',
            'captions',
            'language',
            'overflow_menu',
            'fullscreen'
          ]
        })

        await player.load(manifestUrl)

        if (isDisposed) return
      } catch (error: unknown) {
        if (!isDisposed) {
          console.error('Shaka Player error', error)
          setPlayerError('Could not load the video stream.')
        }
      } finally {
        if (!isDisposed) {
          setIsLoadingPlayer(false)
        }
      }
    }

    void setupPlayer()

    return () => {
      isDisposed = true
      void uiOverlay?.destroy()
      void player?.destroy()
    }
  }, [manifestUrl])

  return (
    <div className={cn(className)}>
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="w-full" />
      </div>
      {isLoadingPlayer && (
        <p className="mt-2 text-sm text-muted-foreground">Loading player...</p>
      )}
      {playerError && <p className="mt-2 text-sm text-destructive">{playerError}</p>}
    </div>
  )
}
