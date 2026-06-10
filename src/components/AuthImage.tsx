import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { authHeaders } from '../api/client'

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

export const clearAuthImageCache = () => {
  cache.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url) })
  cache.clear()
  inflight.clear()
}

const resolveUrl = (src: string): Promise<string> => {
  if (cache.has(src)) return Promise.resolve(cache.get(src)!)
  if (inflight.has(src)) return inflight.get(src)!
  const p = fetch(src, { credentials: 'include', headers: authHeaders() })
    .then(r => r.ok ? r.blob() : null)
    .then(blob => {
      inflight.delete(src)
      if (!blob) return ''
      const url = URL.createObjectURL(blob)
      cache.set(src, url)
      return url
    })
    .catch(() => { inflight.delete(src); return '' })
  inflight.set(src, p)
  return p
}

export const resolveAuthImageUrl = resolveUrl

type AuthImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string }

export const AuthImage = ({ src, ...props }: AuthImageProps) => {
  // Start with the cached blob URL if available, otherwise the original src so the
  // browser begins loading immediately (no visible delay on any platform).
  const [url, setUrl] = useState(() => cache.get(src) ?? src)

  useEffect(() => {
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setUrl(src)
      return
    }
    const cached = cache.get(src)
    if (cached) { setUrl(cached); return }
    // Show original src immediately while fetching the auth-headered version in background
    setUrl(src)
    let active = true
    resolveUrl(src).then(u => { if (active && u) setUrl(u) })
    return () => { active = false }
  }, [src])

  return <img src={url} {...props} />
}
