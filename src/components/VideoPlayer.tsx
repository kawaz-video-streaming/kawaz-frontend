import 'shaka-player/dist/controls.css';
import { Capacitor } from '@capacitor/core';
import { isTV } from '../lib/platform';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { SystemBars } from '../plugins/systemBars';
import { prefetchFirstSegments, formatVideoError } from '../lib/videoUtils';
import { useTVControls } from '../hooks/useTVControls';
import { useVideoKeyboard } from '../hooks/useVideoKeyboard';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL ?? '';

declare global {
  interface Window {
    shakaPlayer?: any;
  }
}

interface VideoPlayerProps {
  manifestUrl: string;
  chaptersUrl?: string;
  thumbnailsUrl?: string;
  posterUrl?: string;
  special?: boolean;
  className?: string;
}

export const VideoPlayer = ({ manifestUrl, chaptersUrl, thumbnailsUrl, posterUrl, special = false, className }: VideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const destroyPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const isFullscreenRef = useRef(false);

  const [, setDebugRev] = useState(0)
  const debugLogsRef = useRef<string[]>([])
  const lastSeekRef = useRef<string>('')
  const lastBackRef = useRef<string>('')
  const dbg = (msg: string) => {
    const ts = new Date().toTimeString().slice(0, 8)
    if (msg.startsWith('SEEK_RAF')) lastSeekRef.current = msg
    if (msg.startsWith('BACK_BTN') || msg.startsWith('EXIT')) lastBackRef.current = msg
    debugLogsRef.current = [...debugLogsRef.current.slice(-9), `${ts} ${msg}`]
    setDebugRev(v => v + 1)
  }

  useTVControls(isFullscreenRef, containerRef, dbg)
  const { volumeDisplay } = useVideoKeyboard(videoRef, containerRef)

  useEffect(() => {
    dbg(`INIT isTV=${isTV} native=${Capacitor.isNativePlatform()}`)
  }, [])

  useEffect(() => {
    let isDisposed = false;
    let player: import('shaka-player').Player | null = null;
    let uiOverlay: { configure(config: object): void; destroy(): Promise<void>; } | null = null;
    let markerRenderRetryTimer: number | null = null;
    let stallRecoveryTimer: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let chapterRenderGeneration = 0;

    const removeChapterMarkers = () => {
      const seekBarContainer = containerRef.current?.querySelector<HTMLElement>('.shaka-seek-bar-container');
      seekBarContainer?.querySelector('.kawaz-chapter-markers')?.remove();
      seekBarContainer?.querySelector('.kawaz-chapter-hover-targets')?.remove();
      seekBarContainer?.classList.remove('kawaz-chapter-seekbar');
    };

    const getPlayerChapters = async () => {
      if (!player) return [] as import('shaka-player').Chapter[];
      const tracks = player.getChaptersTracks();
      const languages = new Set(tracks.map(track => track.language || 'und'));
      if (languages.size === 0) languages.add('und');
      for (const language of languages) {
        const chapters = await player.getChaptersAsync(language);
        if (chapters.length > 0) return chapters;
      }
      return [] as import('shaka-player').Chapter[];
    };

    const renderChapterMarkers = async (attempt = 0) => {
      const generation = ++chapterRenderGeneration;
      if (isDisposed || !player || !containerRef.current || !videoRef.current) return;

      const seekBarContainer = containerRef.current.querySelector<HTMLElement>('.shaka-seek-bar-container');
      const duration = videoRef.current.duration;

      if (!seekBarContainer || !Number.isFinite(duration) || duration <= 0) {
        if (attempt < 20) {
          markerRenderRetryTimer = window.setTimeout(() => void renderChapterMarkers(attempt + 1), 150);
        }
        return;
      }

      const chapters = await getPlayerChapters();
      if (generation !== chapterRenderGeneration || isDisposed) return;
      removeChapterMarkers();
      if (chapters.length === 0) return;

      // Sort then deduplicate chapters within 1s of each other.
      // Some videos have chapter data from both the DASH manifest and the external
      // VTT file; Shaka's getChaptersAsync combines all matching TextTracks, so the
      // same chapter can appear twice with slightly different timestamps.
      const sorted = chapters
        .filter(c => c.startTime >= 0 && c.startTime < duration)
        .sort((a, b) => a.startTime - b.startTime);
      const deduped: import('shaka-player').Chapter[] = [];
      for (const chapter of sorted) {
        const last = deduped[deduped.length - 1];
        if (!last || chapter.startTime - last.startTime > 1) deduped.push(chapter);
      }
      if (deduped.length === 0) return;

      const markerContainer = document.createElement('div');
      markerContainer.className = 'kawaz-chapter-markers';
      const hoverTargetsContainer = document.createElement('div');
      hoverTargetsContainer.className = 'kawaz-chapter-hover-targets';

      for (const chapter of deduped) {
        const leftPct = `${(chapter.startTime / duration) * 100}%`;

        const mark = document.createElement('div');
        mark.className = 'kawaz-chapter-mark';
        mark.style.left = leftPct;
        markerContainer.appendChild(mark);

        const hoverTarget = document.createElement('button');
        hoverTarget.type = 'button';
        hoverTarget.tabIndex = -1;
        hoverTarget.className = 'kawaz-chapter-hover-target';
        hoverTarget.style.left = leftPct;
        hoverTarget.setAttribute('data-title', chapter.title);
        hoverTarget.setAttribute('aria-label', `Chapter: ${chapter.title}`);
        hoverTarget.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          if (videoRef.current) videoRef.current.currentTime = chapter.startTime;
        });
        hoverTargetsContainer.appendChild(hoverTarget);
      }

      seekBarContainer.classList.add('kawaz-chapter-seekbar');
      seekBarContainer.insertBefore(markerContainer, seekBarContainer.firstChild);
      seekBarContainer.appendChild(hoverTargetsContainer);
    };

    const scheduleChapterMarkersRender = () => {
      if (markerRenderRetryTimer !== null) window.clearTimeout(markerRenderRetryTimer);
      void renderChapterMarkers();
    };

    const clearStallRecoveryTimer = () => {
      if (stallRecoveryTimer !== null) {
        window.clearTimeout(stallRecoveryTimer);
        stallRecoveryTimer = null;
      }
    };

    const attemptPlaybackRecovery = () => {
      const video = videoRef.current;
      if (!video || !player || isDisposed) return;

      try {
        ; (player as import('shaka-player').Player & { retryStreaming?: () => boolean; }).retryStreaming?.();
      } catch (e) {
        console.warn('Failed to retry Shaka streaming:', e);
      }

      if (video.readyState < 3 && video.currentTime < 0.25) {
        try {
          video.currentTime = 0.1;
        } catch {
          // Ignore seek recovery failures.
        }
      }
    };

    const setupPlayer = async (): Promise<(() => void) | undefined> => {
      setIsLoadingPlayer(true);
      setPlayerError(null);

      void prefetchFirstSegments(manifestUrl, special);

      await destroyPromiseRef.current;
      if (isDisposed) return undefined;

      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container) {
        setIsLoadingPlayer(false);
        return undefined;
      }

      try {
        const shaka = await import('shaka-player/dist/shaka-player.ui.js');
        if (isDisposed) return undefined;

        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          setPlayerError('This browser does not support playback for this stream.');
          setIsLoadingPlayer(false);
          return undefined;
        }

        player = new shaka.Player();
        window.shakaPlayer = player;
        await player.attach(video);

        player.getNetworkingEngine()?.registerRequestFilter((_type, request) => {
          const uri = request.uris[0];
          const isOwnServer = uri.startsWith('/') || uri.startsWith(window.location.origin) || (BACKEND_BASE !== '' && uri.startsWith(BACKEND_BASE));
          if (!isOwnServer) {
            request.allowCrossSiteCredentials = false;
          } else {
            // In native builds the WebView origin (https://localhost) differs from the backend —
            // explicitly allow credentials so session cookies are sent on cross-origin segment requests.
            if (!uri.startsWith('/') && !uri.startsWith(window.location.origin)) {
              request.allowCrossSiteCredentials = true;
            }
            if (special && !uri.includes('special=true')) {
              request.uris = request.uris.map(u => u + (u.includes('?') ? '&special=true' : '?special=true'));
            }
          }
        });

        if (special) {
          player.getNetworkingEngine()?.registerResponseFilter((_type, response) => {
            const uri = response.uri;
            if (!uri.includes('.vtt')) return;
            const text = new TextDecoder().decode(response.data);
            // Thumbnail VTTs reference image URLs with #xywh= fragments.
            // Shaka's UI loads those images via <img>.src (bypassing the request filter),
            // so we rewrite the VTT itself to include ?special=true before the fragment.
            const rewritten = text.replace(/(#xywh=)/g, '?special=true#xywh=');
            response.data = new TextEncoder().encode(rewritten).buffer as ArrayBuffer;
          });
        }

        const configurablePlayer = player as import('shaka-player').Player & {
          configure?: (config: object) => void;
          retryStreaming?: () => boolean;
        };

        configurablePlayer.configure?.({
          streaming: {
            lowLatencyMode: false,
            stallEnabled: true,
            stallThreshold: 1,
            gapDetectionThreshold: 0.5,
            smallGapLimit: 0.5,
            jumpLargeGaps: true,
            extrapolateDuration: true,
            startAtFirstSegment: true,
            bufferingGoal: 15,
            rebufferingGoal: 2,
          },
          manifest: {
            dash: {
              ignoreMinBufferTime: true,
            },
          },
        });

        const handleTracksChanged = () => scheduleChapterMarkersRender();
        const handleDurationChange = () => scheduleChapterMarkersRender();
        const handlePlayerError = (event: Event) => {
          const detail = (event as Event & { detail?: { code?: number; category?: number; message?: string; data?: unknown[]; }; }).detail;
          console.error('Shaka runtime error', detail);
          const code = detail?.code != null ? ` (${detail.category}:${detail.code})` : '';
          setPlayerError(`Could not play this video stream.${code}`);
        };
        const handleVideoError = () => {
          console.error('HTML video error', video.error);
          setPlayerError(formatVideoError(video));
        };
        const handlePotentialStall = () => {
          clearStallRecoveryTimer();
          stallRecoveryTimer = window.setTimeout(() => attemptPlaybackRecovery(), 1200);
        };
        const handlePlaybackProgress = () => {
          clearStallRecoveryTimer();
          if (!isDisposed) setPlayerError(null);
        };
        player.addEventListener('trackschanged', handleTracksChanged);
        player.addEventListener('error', handlePlayerError);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('loadedmetadata', handleDurationChange);
        video.addEventListener('error', handleVideoError);
        video.addEventListener('waiting', handlePotentialStall);
        video.addEventListener('stalled', handlePotentialStall);
        video.addEventListener('playing', handlePlaybackProgress);
        video.addEventListener('canplay', handlePlaybackProgress);

        if (isDisposed) return undefined;

        await player.load(manifestUrl);
        if (isDisposed) return;

        uiOverlay = new shaka.ui.Overlay(player, container, video);

        let currentCompact: boolean | null = null;

        const ensureShakaButtonsFocusable = () => {
          // Buttons (control bar + overflow/settings menus) and range inputs (seek bar,
          // volume slider) all need tabindex="0" so D-pad spatial nav can reach them.
          const els = container.querySelectorAll<HTMLElement>(
            '.shaka-controls-container button, .shaka-controls-container input[type="range"]'
          )
          els.forEach(el => {
            if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0');
          });
        };

        // Observe the container itself, not .shaka-controls-container — Shaka replaces
        // the entire controls container element on each uiOverlay.configure() call, which
        // would silently detach a more-specific observer from the new element.
        const buttonObserver = new MutationObserver(ensureShakaButtonsFocusable);
        buttonObserver.observe(container, { childList: true, subtree: true });

        ensureShakaButtonsFocusable();

        const reconfigureUI = () => {
          if (!uiOverlay) return;
          const compact = container.clientWidth < 640;
          if (compact === currentCompact) return;
          currentCompact = compact;
          uiOverlay.configure({
            controlPanelElements: compact
              ? ['play_pause', 'time_and_duration', 'mute', 'spacer', 'overflow_menu', 'fullscreen']
              : ['play_pause', 'time_and_duration', 'mute', 'volume', 'spacer', 'captions', 'language', 'chapter', 'overflow_menu', 'fullscreen'],
            seekBarColors: { chapters: 'transparent' },
          });
          requestAnimationFrame(() => (player as unknown as EventTarget)?.dispatchEvent(new Event('variantchanged')));
        };
        reconfigureUI();
        resizeObserver = new ResizeObserver(reconfigureUI);
        resizeObserver.observe(container);

        if (chaptersUrl) {
          try {
            await player.addChaptersTrack(chaptersUrl, 'und');
            scheduleChapterMarkersRender();
          } catch (e) {
            console.warn('Failed to load chapters track:', e);
          }
        } else {
          removeChapterMarkers();
        }

        if (thumbnailsUrl) {
          try {
            await player.addThumbnailsTrack(thumbnailsUrl);
          } catch (e) {
            console.warn('Failed to load thumbnails track:', e);
          }
        }

        // On TV: focus the play button so D-pad is immediately usable.
        if (isTV) {
          requestAnimationFrame(() => {
            container.querySelector<HTMLButtonElement>('.shaka-play-button')?.focus();
          });
        }

        return () => {
          resizeObserver?.disconnect();
          resizeObserver = null;
          buttonObserver.disconnect();
          clearStallRecoveryTimer();
          player?.removeEventListener('trackschanged', handleTracksChanged);
          player?.removeEventListener('error', handlePlayerError);
          video.removeEventListener('durationchange', handleDurationChange);
          video.removeEventListener('loadedmetadata', handleDurationChange);
          video.removeEventListener('error', handleVideoError);
          video.removeEventListener('waiting', handlePotentialStall);
          video.removeEventListener('stalled', handlePotentialStall);
          video.removeEventListener('playing', handlePlaybackProgress);
          video.removeEventListener('canplay', handlePlaybackProgress);
        };
      } catch (error: unknown) {
        if (!isDisposed) {
          console.error('Shaka Player error', error);
          setPlayerError('Could not load the video stream.');
        }
        return undefined;
      } finally {
        if (!isDisposed) setIsLoadingPlayer(false);
      }
    };

    let cleanupPlayerListeners: (() => void) | undefined;
    void setupPlayer().then(cleanup => { cleanupPlayerListeners = cleanup; });

    return () => {
      isDisposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      cleanupPlayerListeners?.();
      clearStallRecoveryTimer();
      if (markerRenderRetryTimer !== null) window.clearTimeout(markerRenderRetryTimer);
      removeChapterMarkers();

      const overlayToDestroy = uiOverlay;
      const playerToDestroy = player;
      const videoToReset = videoRef.current;
      uiOverlay = null;
      player = null;

      destroyPromiseRef.current = (async () => {
        try {
          await overlayToDestroy?.destroy();
        } catch (error) {
          console.warn('Failed to destroy Shaka UI overlay:', error);
        }

        try {
          await playerToDestroy?.destroy();
        } catch (error) {
          console.warn('Failed to destroy Shaka player:', error);
        }

        if (videoToReset) {
          try {
            await new Promise<void>((resolve) => {
              const done = () => {
                videoToReset.removeEventListener('emptied', done);
                resolve();
              };
              videoToReset.addEventListener('emptied', done);
              videoToReset.pause();
              videoToReset.removeAttribute('src');
              videoToReset.load();
              // Fallback: resolve after 500ms if emptied never fires
              setTimeout(resolve, 500);
            });
          } catch (error) {
            console.warn('Failed to reset video element:', error);
          }
        }
      })();
    };
  }, [manifestUrl, chaptersUrl, thumbnailsUrl, special]);

  useEffect(() => {
    const handleFullscreenChange = async () => {
      const inFullscreen = !!document.fullscreenElement;
      if (!isTV || inFullscreen) {
        isFullscreenRef.current = inFullscreen;
      }
      containerRef.current?.classList.toggle('kawaz-fullscreen', inFullscreen);
      if (Capacitor.isNativePlatform()) {
        if (inFullscreen) {
          await SystemBars.hide();
        } else if (!window.matchMedia('(orientation: landscape)').matches) {
          await SystemBars.show();
        }
      }
      // On TV: focus a Shaka button on both enter and exit fullscreen so D-pad stays in the player
      if (isTV) {
        requestAnimationFrame(() => {
          const playBtn = containerRef.current?.querySelector<HTMLButtonElement>('.shaka-play-button');
          playBtn?.focus();
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (isTV) {
      // Set our own fullscreen state immediately — do NOT wait for fullscreenchange,
      // because requestFullscreen() often fails silently in Capacitor WebView
      // (the activity is already fullscreen at the Android level), so that event never fires.
      dbg('TV_MOUNT: setFsRef=true')
      isFullscreenRef.current = true;
      containerRef.current?.classList.add('kawaz-fullscreen');
      // Do NOT call requestFullscreen() on TV: it pushes a browser history entry and
      // the popstate on back press navigates away even when our back handler runs first.
      return () => {
        dbg('TV_UNMOUNT')
        containerRef.current?.classList.remove('kawaz-fullscreen');
      };
    }

    // Mobile: keep fullscreen in sync with orientation
    const handleOrientation = async (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        if (!document.fullscreenElement) {
          await containerRef.current?.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    };

    const mq = window.matchMedia('(orientation: landscape)');
    void handleOrientation(mq);
    mq.addEventListener('change', handleOrientation);
    return () => mq.removeEventListener('change', handleOrientation);
  }, []);

  return (
    <div className={cn('kawaz-video-player rounded-lg', className)}>
      <div ref={containerRef} data-spatial-root={isTV ? '' : undefined} className={cn('relative w-full', Capacitor.isNativePlatform() && !isTV && 'landscape:max-h-[50vh]', isTV && 'kawaz-tv-player')}>
        <video ref={videoRef} className="aspect-video w-full object-cover" poster={posterUrl} />
        {volumeDisplay !== null && (
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-lg bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {volumeDisplay === 0 ? 'Muted' : `Volume ${volumeDisplay}%`}
          </div>
        )}
        {Capacitor.isNativePlatform() && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', fontFamily: 'monospace', lineHeight: '1.4', padding: '6px 10px', pointerEvents: 'none' }}>
            {lastSeekRef.current ? <div style={{ color: '#f80', fontSize: '11px' }}>SEEK: {lastSeekRef.current}</div> : null}
            {lastBackRef.current ? <div style={{ color: '#f0f', fontSize: '11px' }}>BACK: {lastBackRef.current}</div> : null}
            {debugLogsRef.current.slice(-5).map((l, i) => (
              <div key={i} style={{ color: '#aaa', fontSize: '10px' }}>{l}</div>
            ))}
          </div>
        )}
      </div>
      {isLoadingPlayer && (
        <p className="mt-2 text-sm text-muted-foreground">Loading player...</p>
      )}
      {playerError && <p className="mt-2 text-sm text-destructive">{playerError}</p>}
    </div>
  );
};
