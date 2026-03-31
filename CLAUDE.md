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
```

## Architecture

### API Layer

- **`src/api/client.ts`** — Authenticated fetch wrapper for `VITE_BACKEND_URL`. Sends cookies via `credentials: 'include'`. Use `apiRequest<T>()` for JSON endpoints and `apiUpload<T>()` for multipart uploads.

### Auth

`AuthContext` holds `token`, `isAuthenticated`, `login()`, and `logout()`, backed by `localStorage`. `ProtectedRoute` enforces authentication — unauthenticated users are redirected to `/login`.

### Data Fetching

TanStack Query is used for all data fetching. Query hooks live in `src/hooks/`. `useVideo(id)` fetches video metadata from `/media/videos/:id` and validates the response shape with Zod. `useVideos()` fetches the full video list from `/media/videos`.

### Video Player

`VideoPlayer` lazily loads `shaka-player/dist/shaka-player.ui.js` (the full Shaka bundle with built-in UI). It uses `shaka.ui.Overlay` to render the player controls — including the audio language selector — directly in the player. The CSS for the controls comes from `shaka-player/dist/controls.css` (imported statically at the top of the component). Custom Shaka type declarations are in `src/types/shaka-player.d.ts`.

### Routing

```
/login          → LoginPage (public, placeholder)
/               → Layout (ProtectedRoute)
  /             → HomePage (video grid)
  /upload       → UploadPage
  /videos/:id   → VideoPage (player + metadata)
```

### UI Components

`src/components/ui/` contains shadcn/ui components (Button, Card, Input, Badge, Progress). The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes via `clsx` + `tailwind-merge`.
