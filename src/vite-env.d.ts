/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  // TODO: remove once kawaz-backend proxies vod routes
  readonly VITE_VOD_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
