import { Capacitor } from '@capacitor/core';
import { isTV } from '../lib/platform';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { SystemBars } from '../plugins/systemBars';
import { prefetchFirstSegments, formatVideoError } from '../lib/videoUtils';
import { useTVControls } from '../hooks/useTVControls';
import { useVideoKeyboard } from '../hooks/useVideoKeyboard';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Captions, Languages, List, RotateCcw, RotateCw } from 'lucide-react';

const SkipBackIcon = ({ size = 22 }: { size?: number }) => (
  <span className="relative inline-flex" style={{ width: size, height: size }}>
    <RotateCcw size={size} strokeWidth={2.5} />
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none" style={{ fontSize: Math.max(7, Math.round(size * 0.32)) }}>10</span>
  </span>
);

const SkipForwardIcon = ({ size = 22 }: { size?: number }) => (
  <span className="relative inline-flex" style={{ width: size, height: size }}>
    <RotateCw size={size} strokeWidth={2.5} />
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold leading-none" style={{ fontSize: Math.max(7, Math.round(size * 0.32)) }}>10</span>
  </span>
);

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL ?? '';

const formatTime = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const displayLanguageNative = (code: string): string => {
  try {
    const dn = new Intl.DisplayNames([code, 'en'], { type: 'language' });
    return dn.of(code) ?? code.toUpperCase();
  } catch { return code.toUpperCase(); }
};

const audioChannelLabel = (track: import('shaka-player').AudioTrack): string => {
  if (track.spatialAudio) return 'Spatial';
  const ch = track.channelsCount;
  if (!ch) return '';
  if (ch <= 1) return 'Mono';
  if (ch === 2) return 'Stereo';
  if (ch <= 6) return '5.1';
  return '7.1';
};

const audioTrackLabel = (track: import('shaka-player').AudioTrack): string => {
  const lang = track.label ?? displayLanguageNative(track.language);
  const ch = audioChannelLabel(track);
  return ch ? `${lang} · ${ch}` : lang;
};

interface VideoPlayerProps {
  manifestUrl: string;
  chaptersUrl?: string;
  thumbnailsUrl?: string;
  posterUrl?: string;
  special?: boolean;
  className?: string;
}

export const VideoPlayer = ({
  manifestUrl,
  chaptersUrl,
  thumbnailsUrl,
  posterUrl,
  special = false,
  className,
}: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<import('shaka-player').Player | null>(null);
  const destroyPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const isFullscreenRef = useRef(isTV && Capacitor.isNativePlatform());
  const pausedRef = useRef(true);
  const hideTimerRef = useRef<number | null>(null);
  const thumbHideTimerRef = useRef<number | null>(null);
  const seekDebounceRef = useRef<number | null>(null);
  const seekbarRef = useRef<HTMLInputElement>(null);
  const showControlsRef = useRef<() => void>(() => { });
  const controlsVisibleSyncRef = useRef(true);
  const controlsVisibleAtTouchStart = useRef(true);
  const lastPointerTypeRef = useRef('mouse');
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const skipFeedbackTimerRef = useRef<number | null>(null);
  const skipAccumulatedRef = useRef(0);

  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [spriteDims, setSpriteDims] = useState<{ w: number; h: number } | null>(null);
  const [skipFeedback, setSkipFeedback] = useState<{ side: 'left' | 'right'; seconds: number } | null>(null);

  // Playback state (driven by video element events)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // Controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(isTV && Capacitor.isNativePlatform());

  // Player features (populated after load)
  const [chapters, setChapters] = useState<import('shaka-player').Chapter[]>([]);
  const [audioTracks, setAudioTracks] = useState<import('shaka-player').AudioTrack[]>([]);
  const [captionTracks, setCaptionTracks] = useState<import('shaka-player').TextTrack[]>([]);
  const [activeCaptionId, setActiveCaptionId] = useState<number | null>(null);
  const [chaptersMenuOpen, setChaptersMenuOpen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [captionsMenuOpen, setCaptionsMenuOpen] = useState(false);

  // Thumbnail hover/seek preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [hoverThumb, setHoverThumb] = useState<import('shaka-player').ThumbnailData | null>(null);

  // Scrub position: non-null while user is dragging the seekbar (visual-only, no actual seek)
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    if (!pausedRef.current) {
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
        controlsVisibleSyncRef.current = false;
      }, 3500);
    }
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    controlsVisibleSyncRef.current = true;
    scheduleHide();
    if (isTV) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const active = document.activeElement;
        if (!container.contains(active) || active === container) {
          container.querySelector<HTMLButtonElement>('.kawaz-center-play-btn')?.focus();
        }
      });
    }
  }, [scheduleHide]);

  // Keep a stable ref so useTVControls can call showControls without dep-array churn
  showControlsRef.current = showControls;

  useTVControls(isFullscreenRef, containerRef, showControlsRef, setIsFullscreen);
  const { volumeDisplay } = useVideoKeyboard(videoRef, containerRef);

  // Video element event listeners (mounted once; videoRef never changes)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onProgress = () => {
      if (video.buffered.length > 0) setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    };
    const onDurationChange = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onPause = () => {
      pausedRef.current = true;
      setPaused(true);
      setControlsVisible(true);
      controlsVisibleSyncRef.current = true;
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
    const onPlay = () => {
      pausedRef.current = false;
      setPaused(false);
      scheduleHide();
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);
    video.addEventListener('volumechange', onVolumeChange);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, [scheduleHide]);

  // Shaka player lifecycle
  useEffect(() => {
    let isDisposed = false;
    let player: import('shaka-player').Player | null = null;
    let markerRenderRetryTimer: number | null = null;
    let stallRecoveryTimer: number | null = null;

    const clearStallRecovery = () => {
      if (stallRecoveryTimer !== null) { window.clearTimeout(stallRecoveryTimer); stallRecoveryTimer = null; }
    };

    const attemptPlaybackRecovery = () => {
      const video = videoRef.current;
      if (!video || !player || isDisposed) return;
      try { (player as any).retryStreaming?.(); } catch (e) { console.warn('retryStreaming failed:', e); }
      if (video.readyState < 3 && video.currentTime < 0.25) {
        try { video.currentTime = 0.1; } catch { /* ignore */ }
      }
    };

    const getPlayerChapters = async (): Promise<import('shaka-player').Chapter[]> => {
      if (!player) return [];
      const tracks = player.getChaptersTracks();
      const langs = new Set(tracks.map(t => t.language || 'und'));
      if (langs.size === 0) langs.add('und');
      for (const lang of langs) {
        const chapters = await player.getChaptersAsync(lang);
        if (chapters.length > 0) return chapters;
      }
      return [];
    };

    const refreshChapters = async (attempt = 0) => {
      if (isDisposed || !player) return;
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        if (attempt < 20) {
          markerRenderRetryTimer = window.setTimeout(() => void refreshChapters(attempt + 1), 150);
        }
        return;
      }
      const raw = await getPlayerChapters();
      if (isDisposed) return;
      // Chapters VTT may still be loading — retry until we get data
      if (raw.length === 0 && attempt < 20) {
        markerRenderRetryTimer = window.setTimeout(() => void refreshChapters(attempt + 1), 200);
        return;
      }
      const dur = video.duration;
      const sorted = raw.filter(c => c.startTime >= 0 && c.startTime < dur).sort((a, b) => a.startTime - b.startTime);
      const deduped: import('shaka-player').Chapter[] = [];
      for (const c of sorted) {
        const last = deduped[deduped.length - 1];
        if (!last || c.startTime - last.startTime > 1) deduped.push(c);
      }
      setChapters(deduped);
    };

    const refreshPlayerState = () => {
      if (!player || isDisposed) return;
      setAudioTracks(player.getAudioTracks());
      const caps = player.getTextTracks().filter(t => t.kind !== 'chapters' && t.kind !== 'metadata');
      setCaptionTracks(caps);
      setActiveCaptionId(caps.find(t => t.active)?.id ?? null);
    };

    const setupPlayer = async () => {
      setIsLoadingPlayer(true);
      setPlayerError(null);
      setChapters([]);
      setAudioTracks([]);
      setCaptionTracks([]);
      setActiveCaptionId(null);
      setSpriteDims(null);

      void prefetchFirstSegments(manifestUrl, special);

      await destroyPromiseRef.current;
      if (isDisposed) return;

      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) { setIsLoadingPlayer(false); return; }

      try {
        const shaka = await import('shaka-player/dist/shaka-player.ui.js');
        if (isDisposed) return;

        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
          setPlayerError('This browser does not support playback for this stream.');
          setIsLoadingPlayer(false);
          return;
        }

        player = new shaka.Player();
        playerRef.current = player;
        await player.attach(video);
        // Required for subtitle/caption rendering without the UI overlay
        player.setVideoContainer(container);

        player.getNetworkingEngine()?.registerRequestFilter((_type, request) => {
          const uri = request.uris[0];
          const isOwn = uri.startsWith('/') || uri.startsWith(window.location.origin) || (BACKEND_BASE !== '' && uri.startsWith(BACKEND_BASE));
          if (!isOwn) {
            request.allowCrossSiteCredentials = false;
          } else {
            // Backend URIs (absolute BACKEND_BASE URLs) need credentials enabled explicitly
            if (BACKEND_BASE !== '' && uri.startsWith(BACKEND_BASE)) request.allowCrossSiteCredentials = true;
            if (special && !uri.includes('special=true')) {
              request.uris = request.uris.map(u => u + (u.includes('?') ? '&special=true' : '?special=true'));
            }
          }
        });

        if (special) {
          player.getNetworkingEngine()?.registerResponseFilter((_type, response) => {
            if (!response.uri.includes('.vtt')) return;
            const text = new TextDecoder().decode(response.data);
            const rewritten = text.replace(/(#xywh=)/g, '?special=true#xywh=');
            response.data = new TextEncoder().encode(rewritten).buffer as ArrayBuffer;
          });
        }

        (player as any).configure?.({
          streaming: {
            lowLatencyMode: false, stallEnabled: true, stallThreshold: 1,
            gapDetectionThreshold: 0.5, smallGapLimit: 0.5, jumpLargeGaps: true,
            extrapolateDuration: true, startAtFirstSegment: true,
            bufferingGoal: 15, rebufferingGoal: 2,
          },
          manifest: { dash: { ignoreMinBufferTime: true } },
        });

        const onTracksChanged = () => { refreshPlayerState(); void refreshChapters(); };
        const onDurationChange = () => void refreshChapters();
        const onPlayerError = (event: Event) => {
          const detail = (event as any).detail;
          console.error('Shaka runtime error', detail);
          const code = detail?.code != null ? ` (${detail.category}:${detail.code})` : '';
          setPlayerError(`Could not play this video stream.${code}`);
        };
        const onVideoError = () => { console.error('HTML video error', video.error); setPlayerError(formatVideoError(video)); };
        const onStall = () => { clearStallRecovery(); stallRecoveryTimer = window.setTimeout(attemptPlaybackRecovery, 1200); };
        const onProgress = () => { clearStallRecovery(); if (!isDisposed) setPlayerError(null); };

        player.addEventListener('trackschanged', onTracksChanged);
        player.addEventListener('error', onPlayerError);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('loadedmetadata', onDurationChange);
        video.addEventListener('error', onVideoError);
        video.addEventListener('waiting', onStall);
        video.addEventListener('stalled', onStall);
        video.addEventListener('playing', onProgress);
        video.addEventListener('canplay', onProgress);

        if (isDisposed) return;
        await player.load(manifestUrl);
        if (isDisposed) return;

        refreshPlayerState();

        if (chaptersUrl) {
          try { await player.addChaptersTrack(chaptersUrl, 'und'); void refreshChapters(); }
          catch (e) { console.warn('Failed to load chapters track:', e); }
        }
        if (thumbnailsUrl) {
          try { await player.addThumbnailsTrack(thumbnailsUrl); }
          catch (e) { console.warn('Failed to load thumbnails track:', e); }
        }

        if (isTV) {
          requestAnimationFrame(() => container.querySelector<HTMLButtonElement>('.kawaz-center-play-btn')?.focus());
        }

        return () => {
          clearStallRecovery();
          player?.removeEventListener('trackschanged', onTracksChanged);
          player?.removeEventListener('error', onPlayerError);
          video.removeEventListener('durationchange', onDurationChange);
          video.removeEventListener('loadedmetadata', onDurationChange);
          video.removeEventListener('error', onVideoError);
          video.removeEventListener('waiting', onStall);
          video.removeEventListener('stalled', onStall);
          video.removeEventListener('playing', onProgress);
          video.removeEventListener('canplay', onProgress);
        };
      } catch (error) {
        if (!isDisposed) { console.error('Shaka Player error', error); setPlayerError('Could not load the video stream.'); }
        return undefined;
      } finally {
        if (!isDisposed) setIsLoadingPlayer(false);
      }
    };

    let cleanupListeners: (() => void) | undefined;
    void setupPlayer().then(cleanup => { cleanupListeners = cleanup; });

    return () => {
      isDisposed = true;
      cleanupListeners?.();
      clearStallRecovery();
      if (markerRenderRetryTimer !== null) window.clearTimeout(markerRenderRetryTimer);
      playerRef.current = null;

      const playerToDestroy = player;
      const videoToReset = videoRef.current;
      player = null;

      destroyPromiseRef.current = (async () => {
        try { await playerToDestroy?.destroy(); } catch (e) { console.warn('Failed to destroy Shaka player:', e); }
        if (videoToReset) {
          try {
            await new Promise<void>(resolve => {
              const done = () => { videoToReset.removeEventListener('emptied', done); resolve(); };
              videoToReset.addEventListener('emptied', done);
              videoToReset.pause();
              videoToReset.removeAttribute('src');
              videoToReset.load();
              setTimeout(resolve, 500);
            });
          } catch (e) { console.warn('Failed to reset video element:', e); }
        }
      })();
    };
  }, [manifestUrl, chaptersUrl, thumbnailsUrl, special]);

  // Fullscreen API sync (non-TV only; TV uses CSS class only)
  useEffect(() => {
    const handleFsChange = async () => {
      const inFs = !!document.fullscreenElement;
      if (!isTV || inFs) isFullscreenRef.current = inFs;
      setIsFullscreen(isTV ? isFullscreenRef.current : inFs);
      containerRef.current?.classList.toggle('kawaz-fullscreen', inFs);
      if (Capacitor.isNativePlatform()) {
        if (inFs) await SystemBars.hide();
        else if (!window.matchMedia('(orientation: landscape)').matches) await SystemBars.show();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // TV: CSS fullscreen from mount; Mobile: fullscreen tied to orientation
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (isTV) {
      isFullscreenRef.current = true;
      containerRef.current?.classList.add('kawaz-fullscreen');
      return () => { containerRef.current?.classList.remove('kawaz-fullscreen'); };
    }
    const handleOrientation = async (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) { if (!document.fullscreenElement) await containerRef.current?.requestFullscreen().catch(() => { }); }
      else { if (document.fullscreenElement) await document.exitFullscreen().catch(() => { }); }
    };
    const mq = window.matchMedia('(orientation: landscape)');
    void handleOrientation(mq);
    mq.addEventListener('change', handleOrientation);
    return () => mq.removeEventListener('change', handleOrientation);
  }, []);

  // Clear pending seek/thumb/skip timers on unmount
  useEffect(() => () => {
    if (seekDebounceRef.current !== null) window.clearTimeout(seekDebounceRef.current);
    if (thumbHideTimerRef.current !== null) window.clearTimeout(thumbHideTimerRef.current);
    if (skipFeedbackTimerRef.current !== null) window.clearTimeout(skipFeedbackTimerRef.current);
  }, []);

  // --- Controls actions ---

  const showSkipFeedback = (side: 'left' | 'right') => {
    if (skipFeedbackTimerRef.current) window.clearTimeout(skipFeedbackTimerRef.current);
    skipAccumulatedRef.current += 10;
    setSkipFeedback({ side, seconds: skipAccumulatedRef.current });
    skipFeedbackTimerRef.current = window.setTimeout(() => {
      setSkipFeedback(null);
      skipAccumulatedRef.current = 0;
    }, 800);
  };

  const skipBack10 = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
    setCurrentTime(video.currentTime);
    showControls();
  };

  const skipForward10 = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    setCurrentTime(video.currentTime);
    showControls();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    showControls();
    if (video.paused) video.play().catch(() => { });
    else video.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      if (v.volume === 0) v.volume = 1;
    } else {
      v.muted = true;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Number(e.target.value);
    v.muted = false;
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, time));
    setCurrentTime(video.currentTime);
  };

  const getThumb = async (time: number): Promise<import('shaka-player').ThumbnailData | null> => {
    const player = playerRef.current;
    if (!player) return null;
    const tracks = player.getImageTracks();
    if (!tracks.length) return null;
    return await player.getThumbnails(tracks[0].id, time);
  };

  const updateHoverThumb = (time: number, clientX: number) => {
    setHoverTime(time);
    setHoverX(clientX - (containerRef.current?.getBoundingClientRect().left ?? 0));
    void getThumb(time).then(setHoverThumb);
  };

  const clearHoverThumb = useCallback(() => {
    setHoverTime(null);
    setHoverThumb(null);
  }, []);

  // Load the sprite sheet once per media to get its natural pixel dimensions.
  // background-size: auto can render it at half-size on some Android TV WebViews
  // (treating it as a 2x image), making each tile occupy half the expected CSS pixels.
  // Forcing backgroundSize to the sprite's actual pixel dimensions fixes this.
  const spriteUrl = hoverThumb?.uris[0].split('#')[0] ?? '';
  useEffect(() => {
    if (!spriteUrl) return;
    const img = new Image();
    img.onload = () => setSpriteDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = spriteUrl;
  }, [spriteUrl]);

  const handleSeekbarMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateHoverThumb(fraction * duration, e.clientX);
  };

  const handleSeekbarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    showControls();
    const video = videoRef.current;
    if (!video || !duration) return;
    const step = 10;
    const base = scrubTime ?? video.currentTime;
    const newTime = Math.max(0, Math.min(duration, base + (e.key === 'ArrowRight' ? step : -step)));
    setScrubTime(newTime);
    const rect = seekbarRef.current?.getBoundingClientRect();
    const cRect = containerRef.current?.getBoundingClientRect();
    const clientX = rect && cRect ? rect.left + (newTime / duration) * rect.width : 0;
    updateHoverThumb(newTime, clientX);
    if (thumbHideTimerRef.current) window.clearTimeout(thumbHideTimerRef.current);
    thumbHideTimerRef.current = window.setTimeout(clearHoverThumb, 2000);
    if (seekDebounceRef.current) window.clearTimeout(seekDebounceRef.current);
    seekDebounceRef.current = window.setTimeout(() => { seek(newTime); setScrubTime(null); }, 300);
  };

  const handleSelectAudio = (index: number) => {
    const player = playerRef.current;
    if (!player) return;
    const track = player.getAudioTracks()[index];
    if (track) player.selectAudioTrack(track);
    setAudioTracks(player.getAudioTracks());
    setAudioMenuOpen(false);
    showControls();
  };

  const handleSelectCaption = (value: string) => {
    const player = playerRef.current;
    if (!player) return;
    if (value === 'off') {
      player.selectTextTrack(null);
      setActiveCaptionId(null);
    } else {
      const id = Number(value);
      const track = captionTracks.find(t => t.id === id);
      if (track) { player.selectTextTrack(track); setActiveCaptionId(id); }
    }
    setCaptionsMenuOpen(false);
    showControls();
  };

  const toggleFullscreen = async () => {
    if (isTV) {
      const next = !isFullscreenRef.current;
      isFullscreenRef.current = next;
      setIsFullscreen(next);
      containerRef.current?.classList.toggle('kawaz-fullscreen', next);
      if (!next) {
        requestAnimationFrame(() => {
          const h = document.querySelector('h1');
          if (h) { h.setAttribute('tabindex', '-1'); (h as HTMLElement).focus(); }
        });
      }
    } else {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => { });
      else await containerRef.current?.requestFullscreen().catch(() => { });
    }
    showControls();
  };

  const activeCaptionTrack = captionTracks.find(t => t.id === activeCaptionId) ?? null;

  // Computed values for seekbar / volume slider styling
  const playedPct = duration > 0 ? ((scrubTime ?? currentTime) / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const volPct = muted ? 0 : volume * 100;

  // Thumbnail box positioning (clamp to container edges)
  const thumbW = hoverThumb?.width ?? 0;
  const thumbH = hoverThumb?.height ?? 0;
  const containerW = containerRef.current?.clientWidth ?? 0;
  const thumbLeft = Math.max(8, Math.min(hoverX - thumbW / 2, containerW - thumbW - 8));

  // Chapter markers baked into the seekbar gradient so they appear inside the track
  const seekbarBg = (() => {
    const played = '#ef4444';
    const buf = 'rgba(255,255,255,0.35)';
    const unplayed = 'rgba(255,255,255,0.15)';
    const gap = 'rgba(255,255,255,0.9)';
    if (!chapters.length || !duration || !containerW) {
      return `linear-gradient(to right, ${played} ${playedPct}%, ${buf} ${playedPct}% ${bufferedPct}%, ${unplayed} ${bufferedPct}% 100%)`;
    }
    const sw = Math.max(1, containerW - 24); // seekbar width (px-3 on each side)
    const halfW = (1.5 / sw) * 100; // 3px marker total, expressed as %
    const getColor = (p: number) => p < playedPct ? played : p < bufferedPct ? buf : unplayed;
    const pts = new Set([0, playedPct, bufferedPct, 100]);
    const ranges: [number, number][] = [];
    for (const c of chapters) {
      if (c.startTime <= 0 || c.startTime >= duration) continue;
      const cp = (c.startTime / duration) * 100;
      const lo = Math.max(0, cp - halfW), hi = Math.min(100, cp + halfW);
      pts.add(lo); pts.add(hi); ranges.push([lo, hi]);
    }
    const sorted = [...pts].sort((a, b) => a - b);
    const stops: string[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const lo = sorted[i], hi = sorted[i + 1], mid = (lo + hi) / 2;
      const color = ranges.some(([a, b]) => mid >= a && mid <= b) ? gap : getColor(mid);
      stops.push(`${color} ${lo.toFixed(4)}%`, `${color} ${hi.toFixed(4)}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  })();

  // Chapter tooltip: derive from hoverX so seekbar keeps all pointer events
  const seekPad = 12; // px-3
  const seekW = Math.max(1, containerW - seekPad * 2);
  const hoverNearChapter = hoverTime !== null && duration > 0 && containerW > 0
    ? (chapters.find(c => Math.abs(seekPad + (c.startTime / duration) * seekW - hoverX) < 10) ?? null)
    : null;

  return (
    <div className={cn('kawaz-video-player rounded-lg', className)}>
      <div
        ref={containerRef}
        data-spatial-root={isTV ? '' : undefined}
        className={cn(
          'kawaz-player-inner relative w-full bg-black',
          isTV && 'kawaz-tv-player',
        )}
        onMouseMove={showControls}
        onTouchStart={() => {
          controlsVisibleAtTouchStart.current = controlsVisibleSyncRef.current;
          if (!controlsVisibleSyncRef.current) showControls();
        }}
        onMouseLeave={() => { if (!pausedRef.current) scheduleHide(); }}
      >
        <video ref={videoRef} className="aspect-video w-full object-cover" poster={posterUrl} />

        {/* Thumbnail preview */}
        {hoverThumb && hoverTime !== null && (
          <div
            className="pointer-events-none absolute z-20"
            style={{ bottom: 68, left: thumbLeft }}
          >
            <div style={{
              width: thumbW, height: thumbH,
              // Use background-image so the browser never applies #xywh= media-fragment
              // spatial clipping (Android TV WebView does this on <img> src, breaking the crop).
              backgroundImage: `url(${hoverThumb.uris[0].split('#')[0]})`,
              backgroundPosition: `-${hoverThumb.positionX}px -${hoverThumb.positionY}px`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: spriteDims ? `${spriteDims.w}px ${spriteDims.h}px` : 'auto',
              backgroundColor: '#000',
              borderRadius: 4,
              boxShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }} />
            <div style={{ textAlign: 'center', color: '#fff', fontSize: 12, marginTop: 4, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              {formatTime(hoverTime)}
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-end transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
          onPointerDown={(e) => { lastPointerTypeRef.current = e.pointerType; }}
          onTouchEnd={(e) => {
            if ((e.target as HTMLElement).closest('button, input')) return;
            const touch = e.changedTouches[0];
            const now = Date.now();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const side: 'left' | 'right' = touch.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
            const last = lastTapRef.current;
            if (last && now - last.time < 300 && last.side === side) {
              lastTapRef.current = null;
              if (side === 'left') skipBack10(); else skipForward10();
              showSkipFeedback(side);
              showControls();
            } else {
              lastTapRef.current = { time: now, side };
              if (controlsVisibleAtTouchStart.current) {
                setControlsVisible(false);
                controlsVisibleSyncRef.current = false;
                if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
              }
            }
          }}
          onClick={() => {
            if (lastPointerTypeRef.current === 'touch') return;
            setChaptersMenuOpen(false);
            setAudioMenuOpen(false);
            setCaptionsMenuOpen(false);
            showControls();
            if (!isTV) togglePlay();
          }}
        >
          {/* Gradient */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />

          {/* Center playback controls */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 sm:gap-8">
            <button
              className="pointer-events-auto flex items-center justify-center rounded-full bg-black/30 p-2 sm:p-3 text-white transition-transform hover:bg-black/50 active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500"
              tabIndex={controlsVisible ? 0 : -1}
              onClick={(e) => { e.stopPropagation(); skipBack10(); }}
              aria-label="Skip back 10 seconds"
            >
              <SkipBackIcon size={20} />
            </button>
            <button
              className="kawaz-center-play-btn pointer-events-auto rounded-full bg-black/30 p-2 sm:p-4 text-white transition-transform hover:bg-black/50 active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500"
              tabIndex={controlsVisible ? 0 : -1}
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <Play size={36} fill="white" /> : <Pause size={36} fill="white" />}
            </button>
            <button
              className="pointer-events-auto flex items-center justify-center rounded-full bg-black/30 p-2 sm:p-3 text-white transition-transform hover:bg-black/50 active:scale-90 focus:outline-none focus:ring-2 focus:ring-red-500"
              tabIndex={controlsVisible ? 0 : -1}
              onClick={(e) => { e.stopPropagation(); skipForward10(); }}
              aria-label="Skip forward 10 seconds"
            >
              <SkipForwardIcon size={20} />
            </button>
          </div>

          {/* Chapter name tooltip */}
          {hoverNearChapter && (
            <div
              className="pointer-events-none absolute z-10 rounded bg-black/85 px-2 py-0.5 text-xs text-white"
              style={{ bottom: 54, left: hoverX, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
            >
              {hoverNearChapter.title}
            </div>
          )}

          {/* Seekbar + chapter marks */}
          <div
            className="relative pointer-events-auto px-3 pb-1"
            style={{ zIndex: 2 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-full">
              <input
                ref={seekbarRef}
                type="range"
                className="kawaz-seekbar relative w-full"
                style={{
                  zIndex: 2,
                  background: seekbarBg,
                }}
                min={0}
                max={duration || 100}
                step={0.5}
                value={scrubTime ?? currentTime}
                onChange={e => {
                  const time = Number(e.target.value);
                  setScrubTime(time);
                  if (duration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clientX = rect.left + (time / duration) * rect.width;
                    updateHoverThumb(time, clientX);
                    if (thumbHideTimerRef.current) window.clearTimeout(thumbHideTimerRef.current);
                    thumbHideTimerRef.current = window.setTimeout(clearHoverThumb, 1500);
                  }
                }}
                onMouseUp={() => { if (scrubTime !== null) { seek(scrubTime); setScrubTime(null); } }}
                onTouchEnd={() => { if (scrubTime !== null) { seek(scrubTime); setScrubTime(null); } else clearHoverThumb(); }}
                onMouseMove={handleSeekbarMouseMove}
                onMouseLeave={clearHoverThumb}
                onKeyDown={handleSeekbarKeyDown}
                onFocus={showControls}
              />
            </div>
          </div>

          {/* Bottom controls bar */}
          <div
            className="relative flex items-center gap-2 px-3 pb-3 pointer-events-auto"
            style={{ zIndex: 2 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Play / Pause */}
            <button
              className="kawaz-play-btn shrink-0 rounded p-1 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500"
              tabIndex={0}
              onClick={togglePlay}
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <Play size={22} fill="white" /> : <Pause size={22} fill="white" />}
            </button>

            {/* Time display */}
            <span className="shrink-0 select-none text-sm tabular-nums text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume (desktop/mobile only; TV uses hardware volume) */}
            {!isTV && (
              <>
                <button
                  className="hidden sm:inline-flex shrink-0 rounded p-1 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  tabIndex={0}
                  onClick={toggleMute}
                  aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  className="kawaz-vol-slider hidden sm:block w-20 shrink-0"
                  style={{ background: `linear-gradient(to right, rgba(255,255,255,0.9) ${volPct}%, rgba(255,255,255,0.2) ${volPct}% 100%)` }}
                  min={0} max={1} step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                />
              </>
            )}

            <div className="flex-1" />

            {/* Chapters dropdown */}
            {chapters.length > 0 && (
              <div className="relative shrink-0">
                <button
                  className="rounded p-1 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  tabIndex={0}
                  onClick={() => { setChaptersMenuOpen(o => !o); setAudioMenuOpen(false); setCaptionsMenuOpen(false); }}
                  aria-label="Chapters"
                >
                  <List size={20} />
                </button>
                {chaptersMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 max-h-60 w-60 overflow-y-auto rounded bg-black/90 py-1 shadow-lg" style={{ zIndex: 10 }}>
                    {chapters.map(c => (
                      <button
                        key={c.id}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                        onClick={() => { seek(c.startTime); setChaptersMenuOpen(false); }}
                      >
                        <span className="shrink-0 tabular-nums text-xs text-white/50">{formatTime(c.startTime)}</span>
                        <span className="flex-1 truncate">{c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Captions panel */}
            {captionTracks.length > 0 && (
              <div className="relative shrink-0">
                <button
                  className={cn('flex items-center gap-1 rounded px-2 py-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500', activeCaptionId !== null ? 'text-red-400' : 'text-white')}
                  tabIndex={0}
                  onClick={() => { setCaptionsMenuOpen(o => !o); setAudioMenuOpen(false); setChaptersMenuOpen(false); }}
                  aria-label="Subtitles"
                >
                  <Captions size={16} />
                  {activeCaptionTrack && (
                    <span className="hidden sm:inline text-xs">
                      {activeCaptionTrack.label ? `${displayLanguageNative(activeCaptionTrack.language)} · ${activeCaptionTrack.label}` : displayLanguageNative(activeCaptionTrack.language)}
                    </span>
                  )}
                </button>
                {captionsMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 max-h-60 w-44 overflow-y-auto rounded bg-black/90 py-1 shadow-lg" style={{ zIndex: 10 }}>
                    <button
                      className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10', activeCaptionId === null ? 'text-red-400' : 'text-white')}
                      onClick={() => handleSelectCaption('off')}
                    >
                      <span className="w-4 shrink-0 text-xs">{activeCaptionId === null ? '✓' : ''}</span>
                      <span>Off</span>
                    </button>
                    {captionTracks.map(t => (
                      <button
                        key={t.id}
                        className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10', t.id === activeCaptionId ? 'text-red-400' : 'text-white')}
                        onClick={() => handleSelectCaption(String(t.id))}
                      >
                        <span className="w-4 shrink-0 text-xs">{t.id === activeCaptionId ? '✓' : ''}</span>
                        <span className="flex-1 truncate">{t.label ? `${displayLanguageNative(t.language)} · ${t.label}` : displayLanguageNative(t.language)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio language panel */}
            {audioTracks.length > 1 && (
              <div className="relative shrink-0">
                <button
                  className="flex items-center gap-1 rounded px-2 py-1 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  tabIndex={0}
                  onClick={() => { setAudioMenuOpen(o => !o); setCaptionsMenuOpen(false); setChaptersMenuOpen(false); }}
                  aria-label="Audio language"
                >
                  <Languages size={16} />
                  <span className="hidden sm:inline text-xs">{audioTrackLabel(audioTracks.find(t => t.active) ?? audioTracks[0])}</span>
                </button>
                {audioMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 max-h-60 w-52 overflow-y-auto rounded bg-black/90 py-1 shadow-lg" style={{ zIndex: 10 }}>
                    {audioTracks.map((t, i) => (
                      <button
                        key={i}
                        className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10', t.active ? 'text-red-400' : 'text-white')}
                        onClick={() => handleSelectAudio(i)}
                      >
                        <span className="w-4 shrink-0 text-xs">{t.active ? '✓' : ''}</span>
                        <span className="flex-1 truncate">{audioTrackLabel(t)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              className="shrink-0 rounded p-1 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500"
              tabIndex={0}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>

        {/* Double-tap skip feedback */}
        {skipFeedback && (
          <div
            className={cn(
              'pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-white backdrop-blur-sm',
              skipFeedback.side === 'left' ? 'left-6' : 'right-6',
            )}
          >
            {skipFeedback.side === 'left' ? (
              <><RotateCcw size={14} /><span className="text-sm font-medium">{skipFeedback.seconds}s</span></>
            ) : (
              <><span className="text-sm font-medium">{skipFeedback.seconds}s</span><RotateCw size={14} /></>
            )}
          </div>
        )}

        {/* Volume OSD (desktop keyboard shortcuts) */}
        {volumeDisplay !== null && (
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {volumeDisplay === 0 ? 'Muted' : `Volume ${volumeDisplay}%`}
          </div>
        )}


      </div>

      {isLoadingPlayer && <p className="mt-2 text-sm text-muted-foreground">Loading player...</p>}
      {playerError && <p className="mt-2 text-sm text-destructive">{playerError}</p>}
    </div>
  );
};
