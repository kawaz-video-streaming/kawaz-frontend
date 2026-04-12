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
- **`src/api/media.ts`** — Media upload, update, delete. Upload accepts optional `collectionId`.
- **`src/api/mediaCollection.ts`** — Collection CRUD.
- **`src/api/avatar.ts`** — Avatar catalog: list, image URL helper, upload (admin), delete (admin).
- **`src/api/user.ts`** — User profile CRUD: get, create, update (change avatar), delete.

### Auth

`AuthContext` holds `isAuthenticated`, `isAdmin`, `username`, `selectedProfile`, `login()`, `logout()`, and `selectProfile()`. Backed by `localStorage` for the auth flag; role/username are in-memory only. On logout, `queryClient.clear()` wipes the TanStack Query cache so no user's data leaks to the next session. `ProtectedRoute` enforces authentication — unauthenticated users are redirected to `/login`, authenticated users on public routes are redirected to `/profiles`.

### Data Fetching

TanStack Query is used for all data fetching. Query hooks live in `src/hooks/`. `useVideo(id)` fetches video metadata from `/media/videos/:id` and validates the response shape with Zod. `useVideos()` fetches the full video list from `/media/videos`. Profile and avatar hooks follow the same pattern.

### Video Player

`VideoPlayer` lazily loads `shaka-player/dist/shaka-player.ui.js` (the full Shaka bundle with built-in UI). It uses `shaka.ui.Overlay` to render the player controls — including the audio language selector — directly in the player. The CSS for the controls comes from `shaka-player/dist/controls.css` (imported statically at the top of the component). Custom Shaka type declarations are in `src/types/shaka-player.d.ts`.

### Collections

`src/lib/collections.ts` exports `buildTopographicList(collections)` which returns a depth-annotated flat list for rendering a tree-indented `<select>` in collection pickers. Used in UploadPage, VideoPage, and CreateCollectionPage.

### Routing

```
/login          → LoginPage (public)
/profiles       → ProfilesPage (protected, no navbar — standalone like login)
/               → Layout (ProtectedRoute, with Navbar)
  /             → HomePage (video grid)
  /upload       → UploadPage (admin)
  /videos/:id   → VideoPage (player + metadata)
  /collections/:id     → CollectionPage
  /collections/new     → CreateCollectionPage (admin)
  /admin/avatars       → AvatarAdminPage (admin)
```

After login, users land on `/profiles`. Selecting a profile stores it in `AuthContext.selectedProfile` and navigates to `/`.

### Profiles & Avatars

- **ProfilesPage** — Netflix-style profile picker. No navbar. Users select a profile to enter the app. Supports creating (name + avatar picker dialog) and deleting profiles. The avatar picker dialog is a separate modal showing only images grouped by category.
- **AvatarAdminPage** — Admin-only. Shows all avatar categories (always, even if empty) with fixed-height rows. Supports uploading new avatars (name, category from fixed enum, image) and deleting existing ones with a confirmation dialog.
- **Navbar** — Shows a circular profile avatar button (links to `/profiles`) and uses the selected profile name in the welcome message. Admin links (Upload, New Collection, Avatars) shown only for admins.

### Avatar Categories (fixed enum)

`France` | `Israel` | `Japan` | `United Kingdom` | `United States`

### UI Components

`src/components/ui/` contains shadcn/ui components (Button, Card, Input, Badge, Progress). The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes via `clsx` + `tailwind-merge`.
