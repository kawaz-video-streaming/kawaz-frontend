import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Player as ShakaPlayer, polyfill as shakaPolyfill } from 'shaka-player'
import { cn } from '../lib/utils'

interface AudioTrackOption {
  key: string
  label: string
}

const buildAudioTrackKey = (track: { language: string; label?: string; audioCodec?: string; roles?: string[]; channelsCount?: number }) =>
  [
    track.language,
    track.label ?? '',
    track.audioCodec ?? '',
    track.channelsCount?.toString() ?? '',
    track.roles?.join(',') ?? '',
  ].join('|')

const formatAudioTrackLabel = (track: { language: string; label?: string; roles?: string[]; channelsCount?: number }) => {
  const parts = [track.label, track.language.toUpperCase(), track.roles?.[0]]
    .filter(Boolean)
    .map((part) => part?.trim())

  if (track.channelsCount && track.channelsCount > 0) {
    parts.push(`${track.channelsCount}ch`)
  }

  return parts.join(' • ')
}

interface VideoPlayerProps {
  manifestUrl: string
  className?: string
}

export const VideoPlayer = ({ manifestUrl, className }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<ShakaPlayer | null>(null)
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([])
  const [selectedAudioTrack, setSelectedAudioTrack] = useState('')
  const [playerError, setPlayerError] = useState<string | null>(null)

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

  useEffect(() => {
    shakaPolyfill.installAll()

    if (!ShakaPlayer.isBrowserSupported() || !videoRef.current) {
      setPlayerError('This browser does not support playback for this stream.')
      return
    }

    const player = new ShakaPlayer()
    playerRef.current = player

    const syncAudioTracks = () => {
      const variantTracks = player.getVariantTracks()
      const nextAudioTracks = new Map<string, AudioTrackOption>()
      let activeTrackKey = ''

      for (const track of variantTracks) {
        const trackKey = buildAudioTrackKey(track)

        if (!nextAudioTracks.has(trackKey)) {
          nextAudioTracks.set(trackKey, {
            key: trackKey,
            label: formatAudioTrackLabel(track),
          })
        }

        if (track.active) {
          activeTrackKey = trackKey
        }
      }

      const options = Array.from(nextAudioTracks.values())
      setAudioTracks(options)
      setSelectedAudioTrack(activeTrackKey || options[0]?.key || '')
    }

    const handlePlayerUpdate: EventListener = () => {
      syncAudioTracks()
    }

    player
      .attach(videoRef.current)
      .then(() => player.load(manifestUrl))
      .then(() => {
        setPlayerError(null)
        syncAudioTracks()
      })
      .catch((error: unknown) => {
        console.error('Shaka Player error', error)
        setPlayerError('Could not load the video stream.')
      })

    player.addEventListener('trackschanged', handlePlayerUpdate)
    player.addEventListener('adaptation', handlePlayerUpdate)

    return () => {
      player.removeEventListener('trackschanged', handlePlayerUpdate)
      player.removeEventListener('adaptation', handlePlayerUpdate)
      playerRef.current = null
      player.destroy().catch(() => undefined)
    }
  }, [manifestUrl])

  return (
    <div className={cn('space-y-3', className)}>
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg bg-black"
      />

      {(audioTracks.length > 1 || playerError) && (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                className="min-w-56 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {audioTracks.map((track) => (
                  <option key={track.key} value={track.key}>
                    {track.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {playerError && <p className="mt-3 text-sm text-destructive">{playerError}</p>}
        </div>
      )}
    </div>
  )
}
