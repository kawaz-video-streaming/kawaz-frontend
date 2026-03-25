import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Player as ShakaPlayer, TextTrack, VariantTrack } from 'shaka-player'
import { cn } from '../lib/utils'

interface TrackOption {
  key: string
  label: string
}

interface ShakaModule {
  Player: {
    new (): ShakaPlayer
    isBrowserSupported(): boolean
  }
  polyfill: {
    installAll(): void
  }
}

const buildAudioTrackKey = (track: Pick<VariantTrack, 'language' | 'label' | 'audioCodec' | 'roles' | 'channelsCount'>) =>
  [
    track.language,
    track.label ?? '',
    track.audioCodec ?? '',
    track.channelsCount?.toString() ?? '',
    track.roles?.join(',') ?? '',
  ].join('|')

const buildSubtitleTrackKey = (track: Pick<TextTrack, 'language' | 'label' | 'kind' | 'roles'>) =>
  [track.language, track.label ?? '', track.kind ?? '', track.roles?.join(',') ?? ''].join('|')

const formatAudioTrackLabel = (track: Pick<VariantTrack, 'language' | 'label' | 'roles' | 'channelsCount'>) => {
  const parts = [track.label, track.language.toUpperCase(), track.roles?.[0]]
    .filter(Boolean)
    .map((part) => part?.trim())

  if (track.channelsCount && track.channelsCount > 0) {
    parts.push(`${track.channelsCount}ch`)
  }

  return parts.join(' • ')
}

const formatSubtitleTrackLabel = (track: Pick<TextTrack, 'language' | 'label' | 'kind' | 'roles'>) =>
  [track.label, track.language.toUpperCase(), track.kind, track.roles?.[0]]
    .filter(Boolean)
    .map((part) => part?.trim())
    .join(' • ')

interface VideoPlayerProps {
  manifestUrl: string
  className?: string
}

export const VideoPlayer = ({ manifestUrl, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<ShakaPlayer | null>(null)
  const [audioTracks, setAudioTracks] = useState<TrackOption[]>([])
  const [selectedAudioTrack, setSelectedAudioTrack] = useState('')
  const [subtitleTracks, setSubtitleTracks] = useState<TrackOption[]>([])
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState('off')
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true)

  const handleAudioTrackChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTrackKey = event.target.value
    setSelectedAudioTrack(nextTrackKey)

    const nextTrack = playerRef.current
      ?.getVariantTracks()
      .find((track) => buildAudioTrackKey(track) === nextTrackKey)

    if (!nextTrack) {
      return
    }

    playerRef.current?.selectVariantTrack(nextTrack, true)
  }

  const handleSubtitleTrackChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTrackKey = event.target.value
    setSelectedSubtitleTrack(nextTrackKey)

    if (!playerRef.current) {
      return
    }

    if (nextTrackKey === 'off') {
      playerRef.current.setTextTrackVisibility(false)
      return
    }

    const nextTrack = playerRef.current
      .getTextTracks()
      .find((track) => buildSubtitleTrackKey(track) === nextTrackKey)

    if (!nextTrack) {
      return
    }

    playerRef.current.selectTextTrack(nextTrack)
    playerRef.current.setTextTrackVisibility(true)
  }

  useEffect(() => {
    let isDisposed = false
    let player: ShakaPlayer | null = null
    let handlePlayerUpdate: EventListener | null = null

    const syncTrackState = () => {
      if (!player) {
        return
      }

      const variantTracks = player.getVariantTracks()
      const nextAudioTracks = new Map<string, TrackOption>()
      let activeAudioTrackKey = ''

      for (const track of variantTracks) {
        const trackKey = buildAudioTrackKey(track)

        if (!nextAudioTracks.has(trackKey)) {
          nextAudioTracks.set(trackKey, {
            key: trackKey,
            label: formatAudioTrackLabel(track),
          })
        }

        if (track.active) {
          activeAudioTrackKey = trackKey
        }
      }

      const audioOptions = Array.from(nextAudioTracks.values())
      setAudioTracks(audioOptions)
      setSelectedAudioTrack(activeAudioTrackKey || audioOptions[0]?.key || '')

      const textTracks = player.getTextTracks()
      const nextSubtitleTracks = new Map<string, TrackOption>()
      let activeSubtitleTrackKey = player.isTextTrackVisible() ? '' : 'off'

      for (const track of textTracks) {
        const trackKey = buildSubtitleTrackKey(track)

        if (!nextSubtitleTracks.has(trackKey)) {
          nextSubtitleTracks.set(trackKey, {
            key: trackKey,
            label: formatSubtitleTrackLabel(track),
          })
        }

        if (track.active && player.isTextTrackVisible()) {
          activeSubtitleTrackKey = trackKey
        }
      }

      const subtitleOptions = Array.from(nextSubtitleTracks.values())
      setSubtitleTracks(subtitleOptions)
      setSelectedSubtitleTrack(activeSubtitleTrackKey || 'off')
    }

    const setupPlayer = async () => {
      setIsLoadingPlayer(true)
      setPlayerError(null)
      setAudioTracks([])
      setSubtitleTracks([])
      setSelectedAudioTrack('')
      setSelectedSubtitleTrack('off')

      if (!videoRef.current) {
        setIsLoadingPlayer(false)
        return
      }

      try {
        const shaka = (await import('shaka-player')) as ShakaModule

        if (isDisposed) {
          return
        }

        shaka.polyfill.installAll()

        if (!shaka.Player.isBrowserSupported()) {
          setPlayerError('This browser does not support playback for this stream.')
          setIsLoadingPlayer(false)
          return
        }

        player = new shaka.Player()
        playerRef.current = player
        handlePlayerUpdate = () => {
          syncTrackState()
        }

        player.addEventListener('trackschanged', handlePlayerUpdate)
        player.addEventListener('adaptation', handlePlayerUpdate)
        player.addEventListener('textchanged', handlePlayerUpdate)

        await player.attach(videoRef.current)
        await player.load(manifestUrl)

        if (isDisposed) {
          return
        }

        syncTrackState()
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

      if (player && handlePlayerUpdate) {
        player.removeEventListener('trackschanged', handlePlayerUpdate)
        player.removeEventListener('adaptation', handlePlayerUpdate)
        player.removeEventListener('textchanged', handlePlayerUpdate)
      }

      playerRef.current = null
      player?.destroy().catch(() => undefined)
    }
  }, [manifestUrl])

  return (
    <div className={cn('space-y-3', className)}>
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg bg-black"
      />

      {(audioTracks.length > 1 || subtitleTracks.length > 0 || playerError || isLoadingPlayer) && (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Audio track</p>
                <p className="text-xs text-muted-foreground">
                  Switch between available dubbed or original audio tracks.
                </p>
              </div>

              {audioTracks.length > 1 && (
                <select
                  value={selectedAudioTrack}
                  onChange={handleAudioTrackChange}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {audioTracks.map((track) => (
                    <option key={track.key} value={track.key}>
                      {track.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Subtitles</p>
                <p className="text-xs text-muted-foreground">
                  Turn captions off or switch to another subtitle track.
                </p>
              </div>

              {subtitleTracks.length > 0 && (
                <select
                  value={selectedSubtitleTrack}
                  onChange={handleSubtitleTrackChange}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="off">Off</option>
                  {subtitleTracks.map((track) => (
                    <option key={track.key} value={track.key}>
                      {track.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {isLoadingPlayer && <p className="mt-3 text-sm text-muted-foreground">Loading player...</p>}

          {playerError && <p className="mt-3 text-sm text-destructive">{playerError}</p>}
        </div>
      )}
    </div>
  )
}
