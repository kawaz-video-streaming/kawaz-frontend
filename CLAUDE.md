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
- **iOS release** — built via GitHub Actions (`.github/workflows/ios-release.yml`) on tag push. Requires `IOS_CERTIFICATE_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `APPLE_TEAM_ID`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_BASE64` secrets.
- **Android TV / Fire TV** — same APK; `LEANBACK_LAUNCHER` intent-filter added to manifest

## Architecture

### API Layer

- **`src/api/client.ts`** — Authenticated fetch wrapper. Exports `apiRequest<T>()`, `apiUpload<T>()`, `apiUrl(path)`. All API calls and asset URLs go through `apiUrl()` which prepends `VITE_BACKEND_URL` (empty in web builds, `https://kawazplus.com` in native builds).
- **`src/api/media.ts`** — Media upload, update, delete, and `getUploadingMedia()` (returns pending/processing/failed items; treats 404 as `[]`). Upload accepts optional `collectionId`.
- **`src/api/mediaCollection.ts`** — Collection CRUD.
- **`src/api/avatar.ts`** — Avatar catalog: list, image URL helper, upload (admin), delete (admin).
- **`src/api/user.ts`** — User profile CRUD: get, create, update (change avatar), delete. Also `deleteAccount()` (`DELETE /user/account`).
- **`src/api/admin.ts`** — Admin user approval: `getPendingUsers()`, `approveUser(username, role)`, `denyUser(username)`. Also `sendNewsletter(subject, body)` (`POST /admin/newsletter`).

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

**Mutation hooks:** `useUploadMedia`, `useUpdateMedia`, `useDeleteMedia`, `useCreateProfile`, `useUpdateProfile`, `useDeleteProfile`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useUploadAvatar`, `useDeleteAvatar`, `useApproveUser`, `useDenyUser`, `useDeleteAccount`, `useSendNewsletter`.

### Video Player

`VideoPlayer` lazily loads `shaka-player/dist/shaka-player.ui.js` (the full Shaka bundle with built-in UI). It uses `shaka.ui.Overlay` to render the player controls — including the audio language selector — directly in the player. The CSS for the controls comes from `shaka-player/dist/controls.css` (imported statically at the top of the component). Custom Shaka type declarations are in `src/types/shaka-player.d.ts`.

Seek-bar thumbnail previews: `VideoPlayer` pre-fetches the VTT and sprite itself (with Authorization header) rather than using `player.addThumbnailsTrack()`. The VTT is parsed into `OfflineThumbnailCue[]` via `parseOfflineThumbnailCues` and the sprite is resolved to a blob URL — this is the same canvas `drawImage` path used for offline playback, making both modes consistent and auth-safe.

### Offline Downloads (native only, non-TV)

Offline download feature allows users to download videos for offline playback on Android and iOS. Disabled on TV (`isTV`) and web.

- **`src/lib/offlineStorage.ts`** — Shaka v5 offline wrapper. `storeVideo()` fetches poster, chapters VTT, thumbnails VTT, and sprite JPG — all converted to base64 data URLs via `fetchAsDataUrl()` and stored in Shaka's `appMetadata` (IndexedDB). No CacheStorage used. `parseOfflineThumbnailCues(vttText)` parses the stored VTT into `OfflineThumbnailCue[]` (`{startTime, endTime, x, y, w, h}`) — used by `VideoPlayer` for seek thumbnail rendering in both offline and online modes. `listOfflineEntries()` reads IndexedDB on startup. `removeOfflineEntry()` deletes by `offlineUri`. Chapter/thumbnail URLs follow the pattern `{mediaId}/chapters.vtt` and `{mediaId}/thumbnails.vtt`; sprite derived by replacing `.vtt` → `.jpg`.
- **`src/contexts/OfflineContext.tsx`** — `OfflineProvider` + `useOffline()` hook. Exposes `entriesLoaded: boolean`, `downloadQueue: DownloadProgress[]`, `startDownload`, `cancelDownload(mediaId)`, `deleteEntry`, `isDownloaded`, `isDownloading`, `isQueued`. **Android path**: each item is immediately handed to `DownloadServicePlugin.startDownload()` — the native service owns the queue and processes items sequentially; JS tracks display state via `downloadProgress`/`downloadComplete`/`downloadError` Capacitor events. The queue is also persisted to `localStorage` so any items not yet submitted to the service are re-enqueued on next launch. **iOS path**: JS-driven sequential queue via `processNext()`/`isProcessingRef`; aborts and re-queues on background, shows a toast. On iOS, shows a sonner toast warning to keep the app open.
- **`src/components/DownloadButton.tsx`** — three states: idle (download icon), queued (clock icon), downloading (progress ring + cancel), downloaded (check + delete confirm). `compact` prop for card overlays (icon-only circular button). Card-level download buttons (HomePage, CollectionPage) include `chaptersUrl`, `thumbnailsUrl`, `seasonTitle`, and `showTitle` in metadata.
- **`src/pages/DownloadsPage.tsx`** — `/downloads` route. Shows full download queue (downloading + queued items with per-item cancel), completed downloads with stored thumbnail, size, duration, genres, and play/delete actions.
- **Android native download service** — `DownloadForegroundService.java` hosts a headless `WebView` (created with `ApplicationContext`, not tied to the Activity) that loads `android/app/src/main/assets/download-worker.html`. The worker loads Shaka from `https://localhost/assets/shaka.js` (served via `WebViewAssetLoader` — same `https://localhost` origin as the Activity WebView, so IndexedDB is shared). The service owns a `LinkedList` queue and a `Set<String> queuedIds` for deduplication; it processes items sequentially via `processNextIfIdle()`. `DownloadServicePlugin.java` exposes `startDownload`, `cancelDownload`, `stopService` Capacitor methods and forwards JS bridge callbacks (`onProgress`, `onComplete`, `onError`) to the Activity via a static `DownloadCallback` interface. `MainActivity.java` calls `getBridge().getWebView().resumeTimers()` in `onPause()` when a download is active so the Activity WebView's JS doesn't freeze while backgrounded. `vite.config.ts` gives Shaka a fixed output path (`assets/shaka.js`) so the service worker can reference it without knowing a content hash. After `cap sync`, the file lands at `android/app/src/main/assets/public/assets/shaka.js`.
- All video content (segments, subtitles, image tracks) stored in Shaka's IndexedDB. Poster, chapters VTT text, thumbnails VTT text, and sprite JPG all stored as base64/text in `appMetadata`. Everything survives app restarts with no dependency on CacheStorage.
- `VideoPage` waits for `entriesLoaded` before rendering the player on native, so downloaded content always plays from local cache rather than the network stream. If the API is unreachable, shows a minimal player with stored metadata.

### Collections

`src/lib/collections.ts` exports `buildTopographicList(collections)` which returns a depth-annotated flat list for rendering a tree-indented `<select>` in collection pickers. Used in UploadPage, VideoPage, and CreateCollectionPage.

### Routing

```
/login              → LoginPage (public)
/delete-account     → DeleteAccountPage (public — data deletion info for app store compliance)
/profiles           → ProfilesPage (protected, no navbar — standalone like login)
/                   → Layout (ProtectedRoute, with Navbar)
  /                 → HomePage (video grid)
  /upload           → UploadPage (admin)
  /videos/:id       → VideoPage (player + metadata)
  /collections/:id        → CollectionPage
  /collections/new        → CreateCollectionPage (admin)
  /admin/avatars          → AvatarAdminPage (admin)
  /admin/genres           → GenreAdminPage (admin)
  /admin/newsletter       → NewsletterPage (admin)
  /account                → AccountPage (protected)
  /downloads              → DownloadsPage (native only, all users)
```

After login, users land on `/profiles`. Selecting a profile stores it in `AuthContext.selectedProfile` and navigates to `/`.

### Profiles & Avatars

- **ProfilesPage** — Netflix-style profile picker. No navbar. Users select a profile to enter the app. Supports creating (name + avatar picker dialog) and deleting profiles. The avatar picker dialog is a separate modal showing only images grouped by category.
- **AvatarAdminPage** — Admin-only. Shows all avatar categories (always, even if empty) with fixed-height rows. Supports uploading new avatars (name, category from fixed enum, image) and deleting existing ones with a confirmation dialog.
- **Navbar** (`src/components/layout/Navbar.tsx`) — Sticky top bar. Left: admin "Admin" dropdown (Upload, New Collection, Avatars, Genres, Newsletter) shown only for admins on `lg+` screens. Center: Kawaz+ logo and welcome message. Right: theme toggle, admin processing panel, admin pending signups panel, search icon, avatar menu (Change profile, Account settings, Logout). Admin panels are `hidden lg:block` — `BottomNav` handles them on mobile.
- **BottomNav** (`src/components/layout/BottomNav.tsx`) — Mobile-only (`lg:hidden`), admin-only fixed bottom bar. Shows three buttons: "Admin" (slide-up sheet with all admin links: Upload, New Collection, Avatars, Genres, Newsletter), Processing panel, Signups panel. The admin sheet renders as a backdrop + rounded-top drawer above the bar. Uses `env(safe-area-inset-bottom)` for notch padding.
- **NavSearch** (`src/components/NavSearch.tsx`) — Full-screen search overlay, opened by the search icon button in the Navbar. Calls `useVideos()` and `useCollections()` directly (TanStack Query serves cached data, no extra requests). Filters top-level items (no `collectionId`) by title and description substring match. Results appear with portrait thumbnails. Closes on outside click or Escape.
- **MediaProcessingPanel** (`src/components/MediaProcessingPanel.tsx`) — Dropdown/overlay panel listing all non-ready media with SVG circular progress bars (floored %). Color-coded by status: yellow=pending, blue=processing, red=failed. Supports deleting failed items. Closes on outside click.
- **PendingSignupsPanel** (`src/components/PendingSignupsPanel.tsx`) — Admin-only dropdown/overlay listing pending user signups (name + email). Approve buttons for each available role; Deny requires a second confirmation click. Powered by `usePendingUsers`, `useApproveUser`, `useDenyUser`.
- **AccountPage** (`src/pages/AccountPage.tsx`) — Shows signed-in username and a danger-zone delete-account flow requiring the user to type their username to confirm. Calls `useDeleteAccount` → `DELETE /user/account`, then logs out and redirects to `/login`.
- **NewsletterPage** (`src/pages/NewsletterPage.tsx`) — Admin-only. Compose (subject + body textarea) with a live HTML email preview side-by-side. Two-step send confirmation before calling `useSendNewsletter` → `POST /admin/newsletter`.

### Avatar Categories (fixed enum)

`France` | `Israel` | `Japan` | `United Kingdom` | `United States`

### Theme

`ThemeContext` (`src/theme/ThemeContext.tsx`) provides `theme` and `toggleTheme()`, persisted to `localStorage`. Consumed via `useTheme()`.

### Constants & Utilities

- **`src/constants/tags.ts`** — `MEDIA_TAGS` array (Action, Fantasy, Adventure, Superhero, Anime, Animation, Comedy, Parody, Crime, Documentary, Drama, Education, Horror, Kids, Music, News, Romance, Sci-Fi, Sport, Thriller). Used for tag filtering on the home page and upload form.
- **`src/lib/focalPoints.ts`** — `getFocalCropArea()` and `getObjectPositionFromFocalPoint()` for focal-point-aware thumbnail cropping.

### UI Components

`src/components/ui/` contains shadcn/ui components (Button, Card, Input, Badge, Progress). The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes via `clsx` + `tailwind-merge`.
