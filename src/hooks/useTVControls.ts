import { useEffect } from 'react'
import type { RefObject } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { isTV } from '../lib/platform'

export function useTVControls(
  isFullscreenRef: RefObject<boolean>,
  containerRef: RefObject<HTMLDivElement | null>,
  dbg: (msg: string) => void = () => { },
) {
  useEffect(() => {
    if (!isTV) return;

    // Show controls immediately on mount, then let Shaka's timer fade them out.
    const wakeTimer = setTimeout(() => {
      containerRef.current?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));
    }, 500);

    let isExiting = false;
    const exitFullscreen = () => {
      dbg(`EXIT exiting=${isExiting} fsRef=${isFullscreenRef.current}`)
      // Guard against double-exit: GoBack keydown and Capacitor backButton both fire
      // for the same hardware back press — isExiting blocks the second handler.
      if (isExiting || !isFullscreenRef.current) return;
      isExiting = true;
      isFullscreenRef.current = false;
      // Do NOT call document.exitFullscreen() on TV: on Android WebView, the Fullscreen API
      // is tied to Android's history stack. exitFullscreen() pops a history entry, which
      // React Router treats as a popstate navigation event → user lands on the previous page.
      // On TV the Activity is already fullscreen at the Android level (requestFullscreen fails
      // silently), so we manage fullscreen state via the CSS class only.
      containerRef.current?.classList.remove('kawaz-fullscreen');
      requestAnimationFrame(() => {
        const pageHeader = document.querySelector('h1');
        if (pageHeader) {
          pageHeader.setAttribute('tabindex', '-1');
          (pageHeader as HTMLElement).focus();
        }
      });
      setTimeout(() => { isExiting = false; }, 600);
    };

    const keyHandler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      // Show Shaka controls on any key press
      containerRef.current?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));

      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.type === 'range' &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        if (activeEl.getBoundingClientRect().width > 0) {
          // Prevent native browser from moving the slider out-of-sync with Shaka's hover tracking.
          e.preventDefault();
          e.stopPropagation();

          const video = containerRef.current?.querySelector('video')
          const barMin = parseFloat(activeEl.min) || 0
          const barMax = parseFloat(activeEl.max) || (video?.duration ?? 100)
          const currentVal = parseFloat(activeEl.value)
          const step = parseFloat(activeEl.step) || (barMax - barMin) / 30

          let newVal = e.key === 'ArrowRight' ? currentVal + step : currentVal - step
          newVal = Math.max(barMin, Math.min(barMax, newVal))
          activeEl.value = newVal.toString()

          // Notify Shaka of the value change so it seeks the video.
          activeEl.dispatchEvent(new Event('input', { bubbles: true }))

          const fraction = barMax > barMin ? (newVal - barMin) / (barMax - barMin) : 0
          dbg(`SEEK_RAF ct=${video?.currentTime?.toFixed(1) ?? 'null'} bar=${newVal.toFixed(1)} min=${barMin.toFixed(0)} max=${barMax.toFixed(0)}`)

          const dispatchHover = () => {
            const rect = activeEl.getBoundingClientRect()
            const clientX = rect.left + 6 + fraction * (rect.width - 12)
            const clientY = rect.top + rect.height / 2
            activeEl.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX, clientY }))
          }
          dispatchHover()
          requestAnimationFrame(dispatchHover)
          return
        }
      }

      if (e.key === 'Enter') {
        if (activeEl instanceof HTMLButtonElement) {
          e.preventDefault();
          e.stopPropagation();
          // Non-bubbling click: runs the button's handler without reaching Shaka's
          // video container click handler (which would toggle play/pause).
          activeEl.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
        }
      }

      // Escape / GoBack: on native, yield to Capacitor's backButton handler to avoid
      // the race where keydown sets isFullscreenRef=false before the bridge fires.
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

    // Capacitor: when any listener is registered, hardware back does NOT auto-navigate.
    // We must handle both cases (in fullscreen and not) explicitly.
    const backHandlePromise = App.addListener('backButton', ({ canGoBack }) => {
      dbg(`BACK_BTN fsRef=${isFullscreenRef.current} canGoBack=${canGoBack} exiting=${isExiting}`)
      if (isFullscreenRef.current) {
        exitFullscreen();
      } else if (canGoBack && !isExiting) {
        // !isExiting: skip if GoBack keydown already handled this same press
        window.history.back();
      }
    });

    return () => {
      clearTimeout(wakeTimer);
      window.removeEventListener('keydown', keyHandler, { capture: true });
      void backHandlePromise.then(h => h.remove());
    };
  }, []);
}
