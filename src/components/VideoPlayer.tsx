import 'shaka-player/dist/controls.css'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

interface VideoPlayerProps {
  manifestUrl: string
  chaptersUrl?: string
  thumbnailsUrl?: string
  className?: string
}

export const VideoPlayer = ({ manifestUrl, chaptersUrl, thumbnailsUrl, className }: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true)

  useEffect(() => {
    let isDisposed = false
    let player: import('shaka-player').Player | null = null
    let uiOverlay: { configure(config: object): void; destroy(): Promise<void> } | null = null
    let markerRenderRetryTimer: number | null = null

    const removeChapterMarkers = () => {
      const seekBarContainer = containerRef.current?.querySelector<HTMLElement>('.shaka-seek-bar-container')
      seekBarContainer?.querySelector('.kawaz-chapter-markers')?.remove()
      seekBarContainer?.querySelector('.kawaz-chapter-hover-targets')?.remove()
      seekBarContainer?.classList.remove('kawaz-chapter-seekbar')
    }

    const getPlayerChapters = async () => {
      if (!player) return [] as import('shaka-player').Chapter[]
      const tracks = player.getChaptersTracks()
      const languages = new Set(tracks.map(track => track.language || 'und'))
      if (languages.size === 0) languages.add('und')
      for (const language of languages) {
        const chapters = await player.getChaptersAsync(language)
        if (chapters.length > 0) return chapters
      }
      return [] as import('shaka-player').Chapter[]
    }

    const renderChapterMarkers = async (attempt = 0) => {
      if (isDisposed || !player || !containerRef.current || !videoRef.current) return

      const seekBarContainer = containerRef.current.querySelector<HTMLElement>('.shaka-seek-bar-container')
      const duration = videoRef.current.duration

      if (!seekBarContainer || !Number.isFinite(duration) || duration <= 0) {
        if (attempt < 20) {
          markerRenderRetryTimer = window.setTimeout(() => void renderChapterMarkers(attempt + 1), 150)
        }
        return
      }

      const chapters = await getPlayerChapters()
      removeChapterMarkers()
      if (chapters.length === 0) return

      const markerContainer = document.createElement('div')
      markerContainer.className = 'kawaz-chapter-markers'
      const hoverTargetsContainer = document.createElement('div')
      hoverTargetsContainer.className = 'kawaz-chapter-hover-targets'

      const points = new Set<number>()
      for (const chapter of chapters) {
        if (chapter.startTime >= 0 && chapter.startTime < duration) points.add(chapter.startTime)
      }
      if (points.size === 0) return

      const gradient = ['to right']
      const sortedPoints = Array.from(points).sort((a, b) => a - b)

      for (const chapter of chapters) {
        if (chapter.startTime < 0 || chapter.startTime >= duration) continue
        const hoverTarget = document.createElement('button')
        hoverTarget.type = 'button'
        hoverTarget.className = 'kawaz-chapter-hover-target'
        hoverTarget.style.left = `${(chapter.startTime / duration) * 100}%`
        hoverTarget.setAttribute('data-title', chapter.title)
        hoverTarget.setAttribute('aria-label', `Chapter: ${chapter.title}`)
        hoverTarget.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          if (videoRef.current) videoRef.current.currentTime = chapter.startTime
        })
        hoverTargetsContainer.appendChild(hoverTarget)
      }

      for (const point of sortedPoints) {
        const start = `${(point / duration) * 100}%`
        const end = `calc(${start} + 2px)`
        gradient.push(`transparent ${start}`, `rgb(220 38 38) ${start}`, `rgb(220 38 38) ${end}`, `transparent ${end}`)
      }

      markerContainer.style.background = `linear-gradient(${gradient.join(',')})`
      seekBarContainer.classList.add('kawaz-chapter-seekbar')
      seekBarContainer.insertBefore(markerContainer, seekBarContainer.firstChild)
      seekBarContainer.appendChild(hoverTargetsContainer)
    }

    const scheduleChapterMarkersRender = () => {
      if (markerRenderRetryTimer !== null) window.clearTimeout(markerRenderRetryTimer)
      void renderChapterMarkers()
    }

    const setupPlayer = async (): Promise<(() => void) | undefined> => {
      setIsLoadingPlayer(true)
      setPlayerError(null)

      if (!videoRef.current || !containerRef.current) {
        setIsLoadingPlayer(false)
        return undefined
      }

      try {
        const shaka = await import('shaka-player/dist/shaka-player.ui.js')
        if (isDisposed) return

        shaka.polyfill.installAll()

        if (!shaka.Player.isBrowserSupported()) {
          setPlayerError('This browser does not support playback for this stream.')
          setIsLoadingPlayer(false)
          return undefined
        }

        player = new shaka.Player()
        await player.attach(videoRef.current)

        player.getNetworkingEngine()?.registerRequestFilter((_type, request) => {
          request.allowCrossSiteCredentials = true
        })

        const handleTracksChanged = () => scheduleChapterMarkersRender()
        const handleDurationChange = () => scheduleChapterMarkersRender()

        player.addEventListener('trackschanged', handleTracksChanged)
        videoRef.current.addEventListener('durationchange', handleDurationChange)
        videoRef.current.addEventListener('loadedmetadata', handleDurationChange)

        if (isDisposed) return undefined

        uiOverlay = new shaka.ui.Overlay(player, containerRef.current, videoRef.current)
        uiOverlay.configure({
          controlPanelElements: [
            'play_pause', 'time_and_duration', 'mute', 'volume', 'spacer',
            'captions', 'language', 'chapter', 'overflow_menu', 'fullscreen',
          ],
          seekBarColors: { chapters: 'rgb(220 38 38)' },
        })

        await player.load(manifestUrl)
        if (isDisposed) return

        if (chaptersUrl) {
          try {
            await player.addChaptersTrack(chaptersUrl, 'und')
            scheduleChapterMarkersRender()
          } catch (e) {
            console.warn('Failed to load chapters track:', e)
          }
        } else {
          removeChapterMarkers()
        }

        if (thumbnailsUrl) {
          try {
            await player.addThumbnailsTrack(thumbnailsUrl)
          } catch (e) {
            console.warn('Failed to load thumbnails track:', e)
          }
        }

        return () => {
          player?.removeEventListener('trackschanged', handleTracksChanged)
          videoRef.current?.removeEventListener('durationchange', handleDurationChange)
          videoRef.current?.removeEventListener('loadedmetadata', handleDurationChange)
        }
      } catch (error: unknown) {
        if (!isDisposed) {
          console.error('Shaka Player error', error)
          setPlayerError('Could not load the video stream.')
        }
        return undefined
      } finally {
        if (!isDisposed) setIsLoadingPlayer(false)
      }
    }

    let cleanupPlayerListeners: (() => void) | undefined
    void setupPlayer().then(cleanup => { cleanupPlayerListeners = cleanup })

    return () => {
      isDisposed = true
      cleanupPlayerListeners?.()
      if (markerRenderRetryTimer !== null) window.clearTimeout(markerRenderRetryTimer)
      removeChapterMarkers()
      void uiOverlay?.destroy()
      void player?.destroy()
    }
  }, [manifestUrl, chaptersUrl, thumbnailsUrl])

  return (
    <div className={cn('kawaz-video-player', className)}>
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
