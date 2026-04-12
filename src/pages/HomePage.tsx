import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'
import { MEDIA_TAGS } from '../constants/tags'
import { useVideos } from '../hooks/useVideos'
import { useCollections } from '../hooks/useCollections'
import { ORIENTATION_CONFIG } from '../hooks/useThumbnailOrientation'
import { getObjectPositionFromFocalPoint } from '../lib/focalPoints'
import type { CollectionListItem, VideoListItem, Coordinates } from '../types/api'

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const ItemThumbnail = ({
  src,
  title,
  focalPoint,
  aspectRatio,
}: {
  src: string
  title: string
  focalPoint: Coordinates
  aspectRatio: number
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover"
      onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      style={{
        objectPosition: naturalSize
          ? getObjectPositionFromFocalPoint(naturalSize, focalPoint, aspectRatio)
          : `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
      }}
    />
  )
}

type PageItem =
  | { type: 'video'; data: VideoListItem }
  | { type: 'collection'; data: CollectionListItem }

const CAROUSEL_GAP_PX = 16
const CAROUSEL_ANIMATION_MS = 280

const SectionCarousel = ({
  sectionKey,
  items,
  renderItemCard,
}: {
  sectionKey: string
  items: PageItem[]
  renderItemCard: (item: PageItem) => ReactNode
}) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const animationTimeoutRef = useRef<number | null>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [orderedItems, setOrderedItems] = useState(items)
  const [translateX, setTranslateX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [transitionEnabled, setTransitionEnabled] = useState(false)

  useEffect(() => {
    setOrderedItems(items)
    setTranslateX(0)
    setTransitionEnabled(false)
    setIsAnimating(false)
  }, [items])

  useEffect(() => {
    const updateOverflow = () => {
      const viewport = viewportRef.current
      const track = trackRef.current
      if (!viewport || !track) return
      setHasOverflow(track.scrollWidth > viewport.clientWidth + 1)
    }

    updateOverflow()
    window.addEventListener('resize', updateOverflow)

    return () => {
      window.removeEventListener('resize', updateOverflow)
    }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    const frame = window.requestAnimationFrame(() => {
      setHasOverflow(track.scrollWidth > viewport.clientWidth + 1)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [orderedItems])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  const getStep = () => {
    const firstCard = trackRef.current?.querySelector<HTMLElement>('[data-carousel-item="true"]')
    return firstCard ? firstCard.offsetWidth + CAROUSEL_GAP_PX : 240
  }

  const rotateItems = (direction: 'left' | 'right') => {
    if (isAnimating || !hasOverflow || orderedItems.length <= 1) return

    const step = getStep()

    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current)
    }

    if (direction === 'right') {
      setIsAnimating(true)
      setTransitionEnabled(true)
      setTranslateX(-step)

      animationTimeoutRef.current = window.setTimeout(() => {
        setTransitionEnabled(false)
        setOrderedItems((prev) => (prev.length > 1 ? [...prev.slice(1), prev[0]] : prev))
        setTranslateX(0)
        setIsAnimating(false)
      }, CAROUSEL_ANIMATION_MS)

      return
    }

    setIsAnimating(true)
    setTransitionEnabled(false)
    setOrderedItems((prev) => (prev.length > 1 ? [prev[prev.length - 1], ...prev.slice(0, -1)] : prev))
    setTranslateX(-step)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionEnabled(true)
        setTranslateX(0)
      })
    })

    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false)
    }, CAROUSEL_ANIMATION_MS)
  }

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      {hasOverflow && (
        <div className="mb-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => rotateItems('left')}
            aria-disabled={isAnimating}
            className={[
              'rounded-full border border-border p-2 text-muted-foreground transition-colors',
              isAnimating
                ? 'opacity-50'
                : 'hover:border-red-500/50 hover:text-foreground',
            ].join(' ')}
            aria-label={`Scroll ${sectionKey} left`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => rotateItems('right')}
            aria-disabled={isAnimating}
            className={[
              'rounded-full border border-border p-2 text-muted-foreground transition-colors',
              isAnimating
                ? 'opacity-50'
                : 'hover:border-red-500/50 hover:text-foreground',
            ].join(' ')}
            aria-label={`Scroll ${sectionKey} right`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div ref={viewportRef} className="overflow-hidden pb-2">
        <div
          ref={trackRef}
          className={[
            'grid grid-flow-col gap-4',
            'auto-cols-[85%] sm:auto-cols-[calc((100%-1rem)/2)] lg:auto-cols-[calc((100%-2rem)/3)] xl:auto-cols-[calc((100%-3rem)/4)]',
            transitionEnabled ? 'transition-transform duration-300 ease-out' : '',
          ].join(' ')}
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {orderedItems.map((item) => (
            <div
              key={`${sectionKey}-${item.type}-${item.data._id}`}
              data-carousel-item="true"
              className="min-w-0"
            >
              {renderItemCard(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const HomePage = () => {
  const navigate = useNavigate()
  const { data: videos, isLoading, isError } = useVideos()
  const { data: collections } = useCollections()
  const [selectedTabs, setSelectedTabs] = useState<string[]>([])

  const config = ORIENTATION_CONFIG.vertical

  const topLevelCollections = collections?.filter((c) => !c.collectionId) ?? []
  const topLevelVideos = videos?.filter((v) => !v.collectionId) ?? []
  const topLevelItems: PageItem[] = [
    ...topLevelCollections.map((collection): PageItem => ({ type: 'collection', data: collection })),
    ...topLevelVideos.map((video): PageItem => ({ type: 'video', data: video })),
  ]
  const newestItems = [...topLevelItems].slice(-10).reverse()

  const getDisplayGenre = (item: PageItem) => item.data.tags[0] ?? 'Other'

  const genreTabs = MEDIA_TAGS.filter((tag) =>
    topLevelItems.some((item) => getDisplayGenre(item) === tag),
  )

  const hasOtherItems = topLevelItems.some((item) => getDisplayGenre(item) === 'Other')
  const availableTabs = hasOtherItems ? [...genreTabs, 'Other'] : genreTabs

  const sections: Array<{ key: string; items: PageItem[] }> = [
    ...(newestItems.length > 0 ? [{ key: 'Newest Releases', items: newestItems }] : []),
    ...availableTabs
      .map((tab) => ({
        key: tab,
        items: topLevelItems.filter((item) => getDisplayGenre(item) === tab),
      }))
      .filter((section) => section.items.length > 0),
  ]

  const visibleSections = selectedTabs.length > 0
    ? sections.filter((section) => selectedTabs.includes(section.key))
    : sections

  const toggleTab = (tab: string) =>
    setSelectedTabs((prev) => prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab])

  const renderItemCard = (item: PageItem) =>
    item.type === 'collection' ? (
      <button
        key={item.data._id}
        onClick={() => void navigate(`/collections/${item.data._id}`)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
      >
        <div className={`relative w-full ${config.paddingClass}`}>
          <ItemThumbnail
            src={`${import.meta.env.VITE_BACKEND_URL}/mediaCollection/${item.data._id}/thumbnail`}
            title={item.data.title}
            focalPoint={item.data.thumbnailFocalPoint}
            aspectRatio={config.aspectRatio}
          />
          <div className="absolute bottom-1.5 left-1.5">
            <span className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              <FolderOpen size={10} />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 p-2.5">
          <p className="text-sm font-semibold leading-tight">
            {item.data.title}
          </p>
          {item.data.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.data.description}</p>
          )}
        </div>
      </button>
    ) : (
      <button
        key={item.data._id}
        onClick={() => void navigate(`/videos/${item.data._id}`)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-red-500"
      >
        <div className={`relative w-full ${config.paddingClass}`}>
          <ItemThumbnail
            src={`${import.meta.env.VITE_BACKEND_URL}/media/${item.data._id}/thumbnail`}
            title={item.data.title}
            focalPoint={item.data.thumbnailFocalPoint}
            aspectRatio={config.aspectRatio}
          />
        </div>
        <div className="flex flex-col gap-0.5 p-2.5">
          <p className="text-sm font-semibold leading-tight">
            {item.data.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDuration((item.data as VideoListItem).durationInMs)}
          </p>
          {(item.data as VideoListItem).description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {(item.data as VideoListItem).description}
            </p>
          )}
        </div>
      </button>
    )

  return (
    <div>
      {/* Hero bar */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-red-600/20 via-red-500/10 to-transparent px-8 py-10 ring-1 ring-red-500/20">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-red-600/10 blur-2xl" />
        <p className="relative text-xs font-semibold uppercase tracking-widest text-red-500">Kawaz+</p>
        <h1 className="relative mt-1 text-4xl font-extrabold tracking-tight">Watch anything.</h1>
        <p className="relative mt-1.5 text-sm text-muted-foreground">Browse and stream your library.</p>
      </div>

      {(topLevelVideos.length > 0 || topLevelCollections.length > 0) && (
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            <button
              type="button"
              onClick={() => setSelectedTabs([])}
              className={[
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                selectedTabs.length === 0
                  ? 'border-red-500 bg-red-500/10 text-red-500'
                  : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
              ].join(' ')}
            >
              All
            </button>
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => toggleTab(section.key)}
                className={[
                  'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  selectedTabs.includes(section.key)
                    ? 'border-red-500 bg-red-500/10 text-red-500'
                    : 'border-border bg-background text-muted-foreground hover:border-red-500/50 hover:text-foreground',
                ].join(' ')}
              >
                {section.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-red-500" />
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
          Failed to load content.
        </div>
      )}
      {!isLoading && visibleSections.length === 0 && (
        <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
          {selectedTabs.length > 0 ? 'No items in the selected sections.' : 'No content yet.'}
        </div>
      )}

      {visibleSections.length > 0 && (
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <section key={section.key}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold tracking-tight">{section.key}</h2>
              </div>
              <SectionCarousel
                sectionKey={section.key}
                items={section.items}
                renderItemCard={renderItemCard}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
