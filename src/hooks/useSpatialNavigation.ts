import { useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex="0"]'

type Direction = 'up' | 'down' | 'left' | 'right'

function isVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
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
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }

      const dir = dirMap[e.key]
      if (!dir) return

      e.preventDefault()

      const focused = document.activeElement
      const all = Array.from(document.querySelectorAll<Element>(FOCUSABLE))
      const candidates = all
        .filter(el => el !== focused)
        .map(el => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => isVisible(rect))

      if (!focused || focused === document.body) {
        const first = candidates[0]?.el as HTMLElement | undefined
        first?.focus()
        first?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        return
      }

      const nearest = findNearest(focused.getBoundingClientRect(), candidates, dir)
      if (nearest) {
        ;(nearest as HTMLElement).focus()
        nearest.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
