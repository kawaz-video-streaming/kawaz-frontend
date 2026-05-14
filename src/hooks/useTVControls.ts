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

    let isExiting = false;
    const exitFullscreen = (popHistory = true) => {
      dbg(`EXIT popH=${popHistory} exiting=${isExiting} fsRef=${isFullscreenRef.current}`)
      // Guard against double-exit: both App.addListener and keydown Escape can fire
      // for the same hardware back press on some remotes.
      if (isExiting || !isFullscreenRef.current) return;
      isExiting = true;
      isFullscreenRef.current = false;
      void document.exitFullscreen().catch(() => {});
      if (popHistory) history.back();
    };

    const keyHandler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName ?? 'null'
      const activeClass = (document.activeElement as HTMLElement)?.className?.slice(0, 35) ?? ''
      dbg(`KEY[${e.key}] active=${activeTag}[${activeClass}]`)
      // Show Shaka controls on any key press
      containerRef.current?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true }));

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
        exitFullscreen(true);
      }
    };
    window.addEventListener('keydown', keyHandler, { capture: true });

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      dbg(`FOCUSIN ${el.tagName}[${el.className?.slice(0, 35)}] tab=${el.getAttribute('tabindex')}`)
    }
    window.addEventListener('focusin', onFocusIn)

    // Capacitor: when any listener is registered, hardware back does NOT auto-navigate.
    // We must handle both cases (in fullscreen and normal) explicitly.
    const backHandlePromise = App.addListener('backButton', () => {
      dbg(`BACK_BTN fsRef=${isFullscreenRef.current}`)
      if (isFullscreenRef.current) {
        exitFullscreen(true);
      } else {
        window.history.back();
      }
    });

    // Fallback: if the WebView pops our fake history entry before App.addListener fires,
    // popstate tells us — exit fullscreen without calling history.back() again.
    const onPopState = () => {
      dbg(`POPSTATE fsRef=${isFullscreenRef.current}`)
      if (isFullscreenRef.current) exitFullscreen(false);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('keydown', keyHandler, { capture: true });
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('focusin', onFocusIn)
      void backHandlePromise.then(h => h.remove());
    };
  }, []);
}
