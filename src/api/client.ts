import { Preferences } from '@capacitor/preferences'

export class AuthError extends Error {}

// fetch() throws a TypeError when no response is received at all (DNS failure, connection refused,
// timeout) — as opposed to a regular Error thrown from a real HTTP response (404, 500, etc.).
export const isNetworkError = (err: unknown): boolean => err instanceof TypeError

// Not every 401 means the token is invalid (e.g. requireAdmin also responds 401 for a logged-in
// non-admin user), so this only triggers a re-check against /user/me — it never logs out by itself.
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    onUnauthorized?.()
    throw new AuthError('Unauthorized')
  }
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

const BASE = import.meta.env.VITE_BACKEND_URL ?? ''

export const apiUrl = (path: string) => `${BASE}/api${path}`

export const specialParam = (special: boolean) => special ? '?special=true' : ''

const TOKEN_KEY = 'kawaz_token'

// Stored via Capacitor Preferences (native: UserDefaults/SharedPreferences, web: localStorage
// fallback) rather than plain localStorage — Preferences lives outside the WebView's evictable
// "best-effort" storage quota, so it survives disk-pressure cleanups that can wipe localStorage/IndexedDB.
// Preferences is async, so we keep an in-memory cache for the synchronous getToken() call sites below,
// hydrated once on load via `tokenReady`.
let cachedToken: string | null = null
export const tokenReady: Promise<void> = Preferences.get({ key: TOKEN_KEY }).then(({ value }) => {
  cachedToken = value
})

export const storeToken = (token: string) => {
  cachedToken = token
  void Preferences.set({ key: TOKEN_KEY, value: token })
}
export const clearToken = () => {
  cachedToken = null
  void Preferences.remove({ key: TOKEN_KEY })
}
const getToken = () => cachedToken
export const authHeaders = (): Record<string, string> => {
  const token = getToken()
  return token !== null ? { Authorization: `Bearer ${token}` } : {}
}

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getToken()
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token !== null ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  return handleResponse<T>(response)
}

export const apiUpload = async <T>(path: string, formData: FormData, method = 'POST'): Promise<T> => {
  const token = getToken()
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    body: formData,
    ...(token !== null ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  })
  return handleResponse<T>(response)
}
