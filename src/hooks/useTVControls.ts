import { useEffect } from 'react'
import type { RefObject } from 'react'
import { App } from '@capacitor/app'
import { isTV } from '../lib/platform'

export function useTVControls(
  isFullscreenRef: RefObject<boolean>,
  containerRef: RefObject<HTMLDivElement | null>,
  dbg: (msg: string) => void = () => {},
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
      // Guard against double-exit: both App.addListener and keydown Escape can fire
      // for the same hardware back press on some remotes.
      if (isExiting || !isFullscreenRef.current) return;
      isExiting = true;
      isFullscreenRef.current = false;
      void document.exitFullscreen().catch(() => {});
    };

    const keyHandler = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const activeTag = activeEl?.tagName ?? 'null'
      const activeClass = activeEl?.className?.slice(0, 35) ?? ''
      dbg(`KEY[${e.key}] active=${activeTag}[${activeClass}]`)
      // Show Shaka controls on any key press
      containerRef.current?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));

      // When the seekbar (range input) is focused, dispatch a mousemove directly on it so
      // Shaka's thumbnail preview fires. We wait one tick for the browser to update the value.
      if (
        activeEl instanceof HTMLInputElement &&
        activeEl.type === 'range' &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        setTimeout(() => {
          const rect = activeEl.getBoundingClientRect();
          if (rect.width === 0) return;
          const min = parseFloat(activeEl.min || '0');
          const max = parseFloat(activeEl.max || '100');
          const val = parseFloat(activeEl.value);
          const fraction = max > min ? (val - min) / (max - min) : 0;
          const clientX = rect.left + fraction * rect.width;
          const clientY = rect.top + rect.height / 2;
          activeEl.dispatchEvent(new MouseEvent('mousemove', { bubbles: false, cancelable: true, clientX, clientY }));
        }, 0);
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
      dbg(`BACK_BTN fsRef=${isFullscreenRef.current} canGoBack=${canGoBack}`)
      if (isFullscreenRef.current) {
        exitFullscreen();
      } else if (canGoBack) {
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
