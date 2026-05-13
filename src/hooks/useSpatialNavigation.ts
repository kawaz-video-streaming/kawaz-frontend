import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const FOCUSABLE = 'a[href], button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

// Android TV WebView injects tabindex="0" on arbitrary elements (divs, paragraphs, etc.).
// Only navigate to elements that are inherently interactive or are <a>/<button>.
const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'])

// On native, register in capture phase so arrow keys are intercepted before Shaka Player
// (which registers bubble-phase listeners on the player container and handles arrow keys for
// seeking/volume). stopPropagation prevents Shaka from seeing the event at all.
const isNative = Capacitor.isNativePlatform()

type Direction = 'up' | 'down' | 'left' | 'right'

function isInNavbar(el: Element): boolean {
  return !!el.closest('nav')
}

function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth
    // rect.top < window.innerHeight intentionally omitted: sections below the fold in
    // scrollable containers must be reachable via D-pad; scrollIntoView handles the scroll.
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
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as Element).tagName
      if (tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      // Inside a text input: left/right move the cursor — don't hijack them.
      // Up/down have no in-input meaning so let them navigate away.
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return

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

      const focused = document.activeElement
      const all = Array.from(document.querySelectorAll<Element>(FOCUSABLE))
        .filter(el => INTERACTIVE_TAGS.has(el.tagName))
      const candidates = all
        .filter(el => el !== focused)
        .map(el => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => isVisible(rect))

      if (!focused || focused === document.body) {
        // On initial focus, prefer page content over navbar elements
        const contentFirst = candidates.find(c => !isInNavbar(c.el))
        const first = (contentFirst ?? candidates[0])?.el as HTMLElement | undefined
        first?.focus()
        first?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }

      let nearest: Element | null = null

      // When pressing up from page content, exhaust page content first.
      // Only reach the navbar when there is nothing above in the page.
      if (dir === 'up' && !isInNavbar(focused)) {
        const pageContent = candidates.filter(c => !isInNavbar(c.el))
        nearest = findNearest(focused.getBoundingClientRect(), pageContent, dir)
      }

      if (!nearest) {
        nearest = findNearest(focused.getBoundingClientRect(), candidates, dir)
      }

      if (nearest) {
        ;(nearest as HTMLElement).focus()
        nearest.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    // Capture phase on native: fires before element-level handlers (Shaka, etc.)
    window.addEventListener('keydown', handler, isNative)
    return () => window.removeEventListener('keydown', handler, isNative)
  }, [])
}
