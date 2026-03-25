import { useEffect, useRef } from 'react'
import { Player as ShakaPlayer, polyfill as shakaPolyfill } from 'shaka-player'
import { cn } from '../lib/utils'

interface VideoPlayerProps {
  manifestUrl: string
  className?: string
}

export const VideoPlayer = ({ manifestUrl, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    shakaPolyfill.installAll()

    if (!ShakaPlayer.isBrowserSupported() || !videoRef.current) {
      return
    }

    const player = new ShakaPlayer()

    player
      .attach(videoRef.current)
      .then(() => player.load(manifestUrl))
      .catch((error: unknown) => {
        console.error('Shaka Player error', error)
      })

    return () => {
      player.destroy().catch(() => undefined)
    }
  }, [manifestUrl])

  return (
    <video
      ref={videoRef}
      controls
      className={cn('w-full rounded-lg bg-black', className)}
    />
  )
}
