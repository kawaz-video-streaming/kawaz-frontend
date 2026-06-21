import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { isTV } from '../lib/platform'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

// Android TV WebView injects tabindex="0" on arbitrary elements (divs, paragraphs, etc.).
// Only navigate to elements that are inherently interactive.
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'])

// On native, register in capture phase so arrow keys are intercepted before Shaka Player
// (which registers bubble-phase listeners on the player container).
const isNative = Capacitor.isNativePlatform()

type Direction = 'up' | 'down' | 'left' | 'right'

function isInNavbar(el: Element): boolean {
  return !!el.closest('nav, [data-spatial-navzone]')
}

// Walk up the DOM to find the nearest scrollable ancestor.
function getScrollableAncestor(el: Element): Element | null {
  let current = el.parentElement
  while (current && current !== document.body) {
    const { overflowY } = window.getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll') return current
    current = current.parentElement
  }
  return null
}

function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.left < window.innerWidth
    // Vertical constraints (rect.bottom > 0, rect.top < window.innerHeight) are omitted:
    // elements scrolled off the top or bottom of a scroll container are valid D-pad targets;
    // scrollIntoView brings them into view after focus.
  )
}

function findNearest(
  current: DOMRect,
  candidates: Array<{ el: Element; rect: DOMRect }>,
  dir: Direction
): Element | null {
  const cx = current.left + current.width / 2
  const cy = current.top + current.height / 2

  let best: { el: Element; score: number } | null = null

  for (const { el, rect } of candidates) {
    const ex = rect.left + rect.width / 2
    const ey = rect.top + rect.height / 2

    if (dir === 'right' && ex <= cx) continue
    if (dir === 'left' && ex >= cx) continue
    if (dir === 'down' && ey <= cy) continue
    if (dir === 'up' && ey >= cy) continue

    const dx = Math.abs(ex - cx)
    const dy = Math.abs(ey - cy)

    // Primary axis 1x, secondary axis 2x penalty to prefer aligned elements
    const score = dir === 'left' || dir === 'right' ? dx + dy * 2 : dy + dx * 2

    if (!best || score < best.score) {
      best = { el, score }
    }
  }

  return best?.el ?? null
}

export function useSpatialNavigation() {
  useEffect(() => {
    // Throttle: TV hardware fires repeated keydown events at high frequency.
    // Calling getBoundingClientRect() on all candidates per event overloads slow chips.
    let lastNavTime = 0

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      if (tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      // Inside a text input: left/right move the cursor — don't hijack them.
      // Up/down have no in-input meaning so let them navigate away.
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
      // Range inputs (e.g. volume/seekbar): left/right adjust the value natively — don't intercept.
      // Up/down still run spatial navigation so the user can escape the slider with the D-pad.
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type === 'range' &&
          (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.stopPropagation();
        return;
      }

      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }

      const dir = dirMap[e.key]
      if (!dir) return

      e.preventDefault()
      // On native: stop propagation so Shaka Player and other element-level handlers
      // never see arrow keys. On web: allow bubbling so Shaka keeps its keyboard controls.
      if (isNative) e.stopPropagation()

      const now = Date.now()
      if (now - lastNavTime < 150) return
      lastNavTime = now

      const focused = document.activeElement
      // data-spatial-root: when present on any element, confines D-pad entirely within it.
      // Used by the TV video player to prevent page elements from competing with controls.
      const spatialRoot = document.querySelector('[data-spatial-root]')
      const all = Array.from(document.querySelectorAll<Element>(FOCUSABLE))
        .filter(el => INTERACTIVE_TAGS.has(el.tagName))
      const candidates = all
        .filter(el => el !== focused)
        .filter(el => !el.hasAttribute('data-spatial-ignore'))
        .filter(el => !spatialRoot || spatialRoot.contains(el))
        .filter(el => !document.fullscreenElement || document.fullscreenElement.contains(el))
        .map(el => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => isVisible(rect))

      if (!focused || focused === document.body) {
        // On initial focus, prefer page content (non-navbar) over navbar elements
        const contentFirst = candidates.find(c => !isInNavbar(c.el))
        const first = (contentFirst ?? candidates[0])?.el as HTMLElement | undefined
        first?.focus()
        first?.scrollIntoView({ behavior: isTV ? 'instant' : 'smooth', block: 'nearest' })
        return
      }

      const scrollAncestor = getScrollableAncestor(focused)
      const focusedRect = focused.getBoundingClientRect()
      let nearest: Element | null = null

      // Phase 0 (left/right only): prefer elements whose bounding box overlaps the focused
      // element's vertical range. This keeps horizontal D-pad navigation within a row of
      // controls (e.g. Shaka control bar buttons) and prevents the seek bar — which sits
      // just above and spans the full width — from intercepting left/right moves.
      if (dir === 'left' || dir === 'right') {
        const sameRow = candidates.filter(c => {
          const cy = c.rect.top + c.rect.height / 2
          return cy >= focusedRect.top && cy <= focusedRect.bottom
        })
        if (sameRow.length > 0) {
          nearest = findNearest(focusedRect, sameRow, dir)
        }
      }

      // Phase 0b (up/down only, scoped to data-spatial-root): prefer elements whose
      // bounding box overlaps the focused element's horizontal range. Without this,
      // a full-width seekbar (whose center sits at the page midpoint) competes on raw
      // distance with small icon buttons off to the side, producing inconsistent jumps
      // when moving between the seekbar and the bottom control row.
      if (dir === 'up' || dir === 'down') {
        if (spatialRoot && spatialRoot.contains(focused)) {
          const sameColumn = candidates.filter(c => c.rect.left < focusedRect.right && c.rect.right > focusedRect.left)
          if (sameColumn.length > 0) {
            nearest = findNearest(focusedRect, sameColumn, dir)
          }
        }
      }

      // Phase 1 (up/down only): stay inside the same scrollable container first.
      // This lets D-pad navigate through all sections before escaping to the filter
      // buttons or navbar above/below the scroll zone.
      if (!nearest && (dir === 'up' || dir === 'down') && scrollAncestor && !isInNavbar(focused)) {
        const inScrollZone = candidates.filter(c => scrollAncestor.contains(c.el))
        nearest = findNearest(focusedRect, inScrollZone, dir)
      }

      // Phase 2 (up only): scroll zone exhausted — prefer page content over navbar.
      if (!nearest && dir === 'up' && !isInNavbar(focused)) {
        const pageContent = candidates.filter(c => !isInNavbar(c.el))
        nearest = findNearest(focusedRect, pageContent, dir)
      }

      // Phase 3: all candidates (navbar reachable as last resort on up).
      if (!nearest) {
        nearest = findNearest(focusedRect, candidates, dir)
      }

      if (nearest) {
        ;(nearest as HTMLElement).focus()
        nearest.scrollIntoView({ behavior: isTV ? 'instant' : 'smooth', block: 'nearest' })
      }
    }

    // Capture phase on native: fires before element-level handlers (Shaka, etc.)
    window.addEventListener('keydown', handler, isNative)
    return () => window.removeEventListener('keydown', handler, isNative)
  }, [])
}
