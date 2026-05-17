import { useEffect } from 'react'
import type { RefObject } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { isTV } from '../lib/platform'

export function useTVControls(
  isFullscreenRef: RefObject<boolean>,
  containerRef: RefObject<HTMLDivElement | null>,
  onWakeRef: RefObject<() => void>,
  onFullscreenChange: (isFs: boolean) => void,
) {
  useEffect(() => {
    if (!isTV) return;

    // Wake controls immediately on mount
    const wakeTimer = setTimeout(() => onWakeRef.current(), 500);

    let isExiting = false;
    let exitingTimer: ReturnType<typeof setTimeout> | null = null;
    const exitFullscreen = () => {
      if (isExiting || !isFullscreenRef.current) return;
      isExiting = true;
      isFullscreenRef.current = false;
      onFullscreenChange(false);
      // CSS-only fullscreen: no Fullscreen API call to avoid Android history entry
      containerRef.current?.classList.remove('kawaz-fullscreen');
      requestAnimationFrame(() => {
        const h = document.querySelector('h1');
        if (h) { h.setAttribute('tabindex', '-1'); (h as HTMLElement).focus(); }
      });
      exitingTimer = setTimeout(() => { isExiting = false; exitingTimer = null; }, 600);
    };

    const keyHandler = (e: KeyboardEvent) => {
      // Any key wakes the controls overlay
      onWakeRef.current();

      // Escape / GoBack: on native, yield to the Capacitor backButton handler;
      // on web (e.g. browser emulation), handle directly.
      if (e.key === 'Escape' || e.key === 'GoBack') {
        if (Capacitor.isNativePlatform()) {
          e.preventDefault();
          e.stopPropagation();
        } else if (isFullscreenRef.current) {
          e.preventDefault();
          exitFullscreen();
        }
      }
    };
    window.addEventListener('keydown', keyHandler, { capture: true });

    // Registering any Capacitor backButton listener disables auto-navigation —
    // we must handle both fullscreen-exit and page-back explicitly.
    const backHandlePromise = App.addListener('backButton', ({ canGoBack }) => {
      if (isFullscreenRef.current) {
        exitFullscreen();
      } else if (canGoBack && !isExiting) {
        window.history.back();
      }
    });

    return () => {
      clearTimeout(wakeTimer);
      if (exitingTimer !== null) clearTimeout(exitingTimer);
      window.removeEventListener('keydown', keyHandler, { capture: true });
      void backHandlePromise.then(h => h.remove());
    };
  }, []);
}
