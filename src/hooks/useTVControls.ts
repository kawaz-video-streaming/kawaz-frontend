import { useEffect } from 'react'
import type { RefObject } from 'react'
import { App } from '@capacitor/app'
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
      setTimeout(() => { isExiting = false; }, 1000);
    };

    const keyHandler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const activeTag = activeEl?.tagName ?? 'null'
      const activeClass = activeEl?.className?.slice(0, 35) ?? ''
      dbg(`KEY[${e.key}] active=${activeTag}[${activeClass}] fs=${isFullscreenRef.current}`)
      // Show Shaka controls on any key press
      containerRef.current?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));

      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.type === 'range' &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        if (activeEl.getBoundingClientRect().width > 0) {
          const valAtKeydown = parseFloat(activeEl.value)
          dbg(`SEEK_KEY val=${valAtKeydown.toFixed(1)} step=${activeEl.step}`)
          // Double rAF: first frame lets Shaka's own rAF-scheduled seek complete,
          // second frame reads the settled video.currentTime for the thumbnail position.
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const video = containerRef.current?.querySelector('video')
            const ctTime = video?.currentTime
            const barVal = parseFloat(activeEl.value)
            // Use bar.min/bar.max directly — Shaka sets bar.max = seekRange.end (not video.duration)
            // and hI() uses bar.max, so our fraction must match exactly.
            const barMin = parseFloat(activeEl.min) || 0
            const barMax = parseFloat(activeEl.max) || (video?.duration ?? 100)
            const fraction = barMax > barMin ? (barVal - barMin) / (barMax - barMin) : 0
            dbg(`SEEK_RAF ct=${ctTime?.toFixed(1) ?? 'null'} bar=${barVal.toFixed(1)} min=${barMin.toFixed(0)} max=${barMax.toFixed(0)}`)
            const dispatchHover = () => {
              // Read rect fresh each time so it matches what Shaka reads inside hI()
              const rect = activeEl.getBoundingClientRect()
              const clientX = rect.left + 6 + fraction * (rect.width - 12)
              const clientY = rect.top + rect.height / 2
              activeEl.dispatchEvent(new MouseEvent('mousemove', { bubbles: false, cancelable: true, clientX, clientY }))
            }
            dispatchHover()
            // Re-dispatch after 80ms: Shaka's input event (fired by some Android WebViews on
            // programmatic bar.value changes) can call onChange→oI with the old value and
            // overwrite our hover. The delayed re-dispatch always wins.
            setTimeout(dispatchHover, 80)
          }))
        }
      }

      if (e.key === 'Enter') {
        const active = document.activeElement
        const isBtn = active instanceof HTMLButtonElement
        dbg(`ENTER isBtn=${isBtn}`)
        if (isBtn) {
          e.preventDefault();
          e.stopPropagation();
          // Non-bubbling click: runs the button's handler without reaching Shaka's
          // video container click handler (which would toggle play/pause).
          active.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
        }
      }

      // Escape / GoBack: some remotes send this for the back button
      if ((e.key === 'Escape' || e.key === 'GoBack') && isFullscreenRef.current) {
        e.preventDefault();
        exitFullscreen();
      }
    };
    window.addEventListener('keydown', keyHandler, { capture: true });

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      dbg(`FOCUSIN ${el.tagName}[${el.className?.slice(0, 35)}] tab=${el.getAttribute('tabindex')}`)
    }
    window.addEventListener('focusin', onFocusIn)

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
      window.removeEventListener('focusin', onFocusIn)
      void backHandlePromise.then(h => h.remove());
    };
  }, []);
}
