# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Type-check then build for production (tsc -b && vite build)
npm run preview   # Preview production build
npm run clean     # Delete dist/
```

There are no tests in this project.

## Environment

Requires a `.env.local` file (see `.env.example`):

```env
VITE_BACKEND_URL=http://localhost:8080  # Main backend API
VITE_VOD_URL=http://localhost:8082      # VOD service (temporary, TODO: proxy through backend)
```

## Architecture

### API Layer

Two separate HTTP clients exist because the VOD service is not yet proxied through the main backend:

- **`src/api/client.ts`** — Authenticated fetch wrapper for `VITE_BACKEND_URL`. Manages a Bearer token in `localStorage` (key `kawaz_token`) and auto-redirects to `/login` on 401. Use `apiRequest<T>()` for JSON endpoints and `apiUpload<T>()` for multipart uploads.
- **`src/api/vod.ts`** — Direct calls to `VITE_VOD_URL`. TODO: remove once the backend proxies these routes.

### Auth

`AuthContext` holds `token`, `isAuthenticated`, `login()`, and `logout()`, backed by `localStorage`. **`ProtectedRoute` currently has `bypassAuth = true`** — auth is not enforced until a real login endpoint exists.

### Data Fetching

TanStack Query is used for all data fetching. Query hooks live in `src/hooks/`. `useVideo(id)` fetches video metadata and validates the response shape with Zod (`src/types/api.ts`). `useVideos` is a placeholder with the query disabled.

### Video Player

`VideoPlayer` lazily loads `shaka-player/dist/shaka-player.ui.js` (the full Shaka bundle with built-in UI). It uses `shaka.ui.Overlay` to render the player controls — including the audio language selector — directly in the player. The CSS for the controls comes from `shaka-player/dist/controls.css` (imported statically at the top of the component). Custom Shaka type declarations are in `src/types/shaka-player.d.ts`.

### Routing

```
/login          → LoginPage (public, placeholder)
/               → Layout (ProtectedRoute)
  /             → HomePage (manual video ID lookup)
  /upload       → UploadPage
  /videos/:id   → VideoPage (player + metadata)
```

### UI Components

`src/components/ui/` contains shadcn/ui components (Button, Card, Input, Badge, Progress). The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes via `clsx` + `tailwind-merge`.
