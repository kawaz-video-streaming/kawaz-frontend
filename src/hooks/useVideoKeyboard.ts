import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { isTV } from '../lib/platform'

export function useVideoKeyboard(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
): { volumeDisplay: number | null } {
  const [volumeDisplay, setVolumeDisplay] = useState<number | null>(null)
  const volumeHideTimer = useRef<number | null>(null)

  useEffect(() => {
    // On TV: spatial navigation owns arrow keys, Shaka owns Enter,
    // and hardware volume buttons on the remote control TV volume directly.
    if (isTV) return;
    const showVolume = (vol: number) => {
      setVolumeDisplay(Math.round(vol * 100));
      if (volumeHideTimer.current !== null) window.clearTimeout(volumeHideTimer.current);
      volumeHideTimer.current = window.setTimeout(() => setVolumeDisplay(null), 1500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const active = document.activeElement;
      const playerFocused =
        active === document.body ||
        active === document.documentElement ||
        !!containerRef.current?.contains(active);
      if (!playerFocused) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (video.paused) video.play().catch(() => { });
        else video.pause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const next = Math.min(1, Math.round((video.volume + 0.1) * 10) / 10);
        video.volume = next;
        showVolume(next);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const next = Math.max(0, Math.round((video.volume - 0.1) * 10) / 10);
        video.volume = next;
        showVolume(next);
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (volumeHideTimer.current !== null) window.clearTimeout(volumeHideTimer.current);
    };
  }, []);

  return { volumeDisplay }
}
