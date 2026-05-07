# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server (node with increased header size limit)
npm run build         # Type-check then build for production (tsc -b && vite build)
npm run build:native  # Build for Capacitor native (uses .env.native, then cap sync)
npm run preview       # Build then preview production build
npm run clean         # Delete dist/
```

There are no tests in this project.

## Environment

Requires a `.env.local` file (see `.env.example`):

```env
VITE_BACKEND_URL=http://localhost:8080  # Main backend API
```

For native builds, create a `.env.native` file (gitignored):

```env
VITE_BACKEND_URL=https://kawazplus.com  # Production URL for Capacitor WebView
```

## Native Apps (Capacitor)

The project targets Android and iOS via Capacitor. Platform directories (`android/`, `ios/`) are committed.

- **`capacitor.config.ts`** — app ID (`com.kawaz.plus`), app name, web dir
- **`assets/`** — source images (`icon.png` 1024×1024, `splash.png` 2732×2732) used by `@capacitor/assets` to generate all density variants
- **Android release** — built via GitHub Actions (`.github/workflows/android-release.yml`) on tag push. Requires `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_PASSWORD` secrets. Keystore files (`android/keystore.jks`, `android/keystore.properties`) are gitignored.
- **Android TV / Fire TV** — same APK; `LEANBACK_LAUNCHER` intent-filter added to manifest

## Architecture

### API Layer

- **`src/api/client.ts`** — Authenticated fetch wrapper. Exports `apiRequest<T>()`, `apiUpload<T>()`, and `apiUrl(path)`. All API calls and asset URLs go through `apiUrl()` which prepends `VITE_BACKEND_URL` (empty in web builds, `https://kawazplus.com` in native builds).
- **`src/api/media.ts`** — Media upload, update, delete, and `getUploadingMedia()` (returns pending/processing/failed items; treats 404 as `[]`). Upload accepts optional `collectionId`.
- **`src/api/mediaCollection.ts`** — Collection CRUD.
- **`src/api/avatar.ts`** — Avatar catalog: list, image URL helper, upload (admin), delete (admin).
- **`src/api/user.ts`** — User profile CRUD: get, create, update (change avatar), delete.
- **`src/api/admin.ts`** — Admin user approval: `getPendingUsers()`, `approveUser(username)`, `denyUser(username)`.

### Auth

`AuthContext` holds `isAuthenticated`, `isAdmin`, `username`, `selectedProfile`, `login()`, `logout()`, and `selectProfile()`. Backed by `localStorage` for the auth flag; role/username are in-memory only. On logout, `queryClient.clear()` wipes the TanStack Query cache so no user's data leaks to the next session. `ProtectedRoute` enforces authentication — unauthenticated users are redirected to `/login`, authenticated users on public routes are redirected to `/profiles`.

### Data Fetching

TanStack Query is used for all data fetching. Query hooks live in `src/hooks/`.

**Query hooks:**
- `useVideo(id)` — fetches single video metadata from `/media/videos/:id`, validates with Zod
- `useVideos()` — fetches full video list from `/media/videos`
- `useCollection(id)` / `useCollections()` — collection data
- `useProfiles()` / `useAvatars()` — profile and avatar data
- `usePendingMedia(enabled, panelOpen)` — polls in-flight uploads; refetches every 3s when panel is open, 10s when closed
- `usePendingUsers(enabled, panelOpen)` — polls pending signup queue; refetches every 10s when panel is open, 30s when closed

**Mutation hooks:** `useUploadMedia`, `useUpdateMedia`, `useDeleteMedia`, `useCreateProfile`, `useUpdateProfile`, `useDeleteProfile`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useUploadAvatar`, `useDeleteAvatar`, `useApproveUser`, `useDenyUser`.

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
- **Navbar** (`src/components/layout/Navbar.tsx`) — Sticky top bar. Left: admin nav links (Upload, New Collection, Avatars) shown only for admins on `lg+` screens. Center: Kawaz+ logo and welcome message. Right: theme toggle, admin processing panel (`hidden lg:block`), admin pending signups panel (`hidden lg:block`), search icon, avatar menu. The admin panels are hidden on mobile — `BottomNav` handles them there.
- **BottomNav** (`src/components/layout/BottomNav.tsx`) — Mobile-only (`lg:hidden`), admin-only fixed bottom bar. Contains links to Upload, Collection, Avatars and toggle buttons for the MediaProcessingPanel and PendingSignupsPanel (both rendered as `fixed inset-x-4 bottom-20` overlays). Shows badge counts on the panel buttons. Uses `env(safe-area-inset-bottom)` for notch padding.
- **NavSearch** (`src/components/NavSearch.tsx`) — Full-screen search overlay, opened by the search icon button in the Navbar. Calls `useVideos()` and `useCollections()` directly (TanStack Query serves cached data, no extra requests). Filters top-level items (no `collectionId`) by title and description substring match. Results appear with portrait thumbnails. Closes on outside click or Escape.
- **MediaProcessingPanel** (`src/components/MediaProcessingPanel.tsx`) — Dropdown/overlay panel listing all non-ready media with SVG circular progress bars (floored %). Color-coded by status: yellow=pending, blue=processing, red=failed. Supports deleting failed items. Closes on outside click.
- **PendingSignupsPanel** (`src/components/PendingSignupsPanel.tsx`) — Admin-only dropdown/overlay listing pending user signups (name + email). Approve button acts immediately; Deny requires a second confirmation click. Powered by `usePendingUsers`, `useApproveUser`, `useDenyUser`.

### Avatar Categories (fixed enum)

`France` | `Israel` | `Japan` | `United Kingdom` | `United States`

### Theme

`ThemeContext` (`src/theme/ThemeContext.tsx`) provides `theme` and `toggleTheme()`, persisted to `localStorage`. Consumed via `useTheme()`.

### Constants & Utilities

- **`src/constants/tags.ts`** — `MEDIA_TAGS` array (Action, Fantasy, Adventure, Superhero, Anime, Animation, Comedy, Parody, Crime, Documentary, Drama, Education, Horror, Kids, Music, News, Romance, Sci-Fi, Sport, Thriller). Used for tag filtering on the home page and upload form.
- **`src/lib/focalPoints.ts`** — `getFocalCropArea()` and `getObjectPositionFromFocalPoint()` for focal-point-aware thumbnail cropping.

### UI Components

`src/components/ui/` contains shadcn/ui components (Button, Card, Input, Badge, Progress). The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes via `clsx` + `tailwind-merge`.
