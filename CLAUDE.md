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

- **`src/api/client.ts`** — Authenticated fetch wrapper. Exports `apiRequest<T>()`, `apiUpload<T>()`, `apiUrl(path)`, and `specialParam(special)` (returns `'?special=true'` or `''`). All API calls and asset URLs go through `apiUrl()` which prepends `VITE_BACKEND_URL` (empty in web builds, `https://kawazplus.com` in native builds).
- **`src/api/media.ts`** — Media upload, update, delete, and `getUploadingMedia()` (returns pending/processing/failed items; treats 404 as `[]`). Upload accepts optional `collectionId`. All mutating functions accept `special?: boolean` to target the special data pool.
- **`src/api/mediaCollection.ts`** — Collection CRUD. All functions accept `special?: boolean`.
- **`src/api/avatar.ts`** — Avatar catalog: list, image URL helper, upload (admin), delete (admin). All functions accept `special?: boolean`; `avatarImageUrl(id, special?)` appends `?special=true` when needed.
- **`src/api/user.ts`** — User profile CRUD: get, create, update (change avatar), delete. Also `deleteAccount()` (`DELETE /user/account`).
- **`src/api/admin.ts`** — Admin user approval: `getPendingUsers()`, `approveUser(username, role)` (role: `'user' | 'special'`), `denyUser(username)`. Also `sendNewsletter(subject, body)` (`POST /admin/newsletter`).

### Auth

`AuthContext` holds `isAuthenticated`, `isAdmin`, `username`, `selectedProfile`, `specialPool`, `login()`, `logout()`, `selectProfile()`, and `toggleSpecialPool()`. Backed by `localStorage` for the auth flag; role/username/specialPool are in-memory only. `specialPool` lets admins view and manage the special (demo) data pool — all pool-aware hooks read this flag and append `?special=true` to API calls when set. On logout, `queryClient.clear()` wipes the TanStack Query cache so no user's data leaks to the next session. `ProtectedRoute` enforces authentication — unauthenticated users are redirected to `/login`, authenticated users on public routes are redirected to `/profiles`.

User roles: `user` (regular pool), `special` (demo/special pool — isolated DB), `admin` (can access both pools via `?special=true` toggle).

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

### Offline Downloads (native only, non-TV)

Offline download feature allows users to download videos for offline playback on Android and iOS. Disabled on TV (`isTV`) and web.

- **`src/lib/offlineStorage.ts`** — Shaka v5 offline wrapper. `storeVideo()` fetches the thumbnail as base64, stores all DASH tracks (no filtering), and saves full metadata in Shaka's `appMetadata`. Returns a `StoreOperation` with `.abort()`. `listOfflineEntries()` reads IndexedDB on startup. `removeOfflineEntry()` deletes by `offlineUri`.
- **`src/contexts/OfflineContext.tsx`** — `OfflineProvider` + `useOffline()` hook. Manages a sequential download queue (`queueRef`, `isProcessingRef`), exposes `downloadQueue: DownloadProgress[]`, `startDownload`, `cancelDownload(mediaId)`, `deleteEntry`, `isDownloaded`, `isDownloading`, `isQueued`. Downloads run one at a time; subsequent requests are queued automatically.
- **`src/components/DownloadButton.tsx`** — three states: idle (download icon), queued (clock icon), downloading (progress ring + cancel), downloaded (check + delete confirm). `compact` prop for card overlays (icon-only circular button).
- **`src/pages/DownloadsPage.tsx`** — `/downloads` route. Shows full download queue (downloading + queued items with per-item cancel), completed downloads with stored thumbnail, size, duration, genres, and play/delete actions.
- All video content (segments, subtitles, image tracks) stored in Shaka's IndexedDB. Thumbnail stored as base64 in `appMetadata`. Everything survives app restarts.
- `VideoPage` uses `offlineEntry.offlineUri` instead of the stream URL when content is downloaded. If the API is also unreachable, shows a minimal player with stored metadata.

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
- **Navbar** (`src/components/layout/Navbar.tsx`) — Sticky top bar. Left: admin "Admin" dropdown (Upload, New Collection, Avatars, Genres, Newsletter) shown only for admins on `lg+` screens. Center: Kawaz+ logo and welcome message. Right: theme toggle, special-pool toggle (Database icon, purple when active), admin processing panel, admin pending signups panel, search icon, avatar menu (Change profile, Account settings, Logout). Admin panels and pool toggle are `hidden lg:block` — `BottomNav` handles them on mobile.
- **BottomNav** (`src/components/layout/BottomNav.tsx`) — Mobile-only (`lg:hidden`), admin-only fixed bottom bar. Shows four buttons: "Admin" (slide-up sheet with all admin links: Upload, New Collection, Avatars, Genres, Newsletter), Special pool toggle, Processing panel, Signups panel. The admin sheet renders as a backdrop + rounded-top drawer above the bar. Uses `env(safe-area-inset-bottom)` for notch padding.
- **NavSearch** (`src/components/NavSearch.tsx`) — Full-screen search overlay, opened by the search icon button in the Navbar. Calls `useVideos()` and `useCollections()` directly (TanStack Query serves cached data, no extra requests). Filters top-level items (no `collectionId`) by title and description substring match. Results appear with portrait thumbnails. Closes on outside click or Escape.
- **MediaProcessingPanel** (`src/components/MediaProcessingPanel.tsx`) — Dropdown/overlay panel listing all non-ready media with SVG circular progress bars (floored %). Color-coded by status: yellow=pending, blue=processing, red=failed. Supports deleting failed items. Closes on outside click.
- **PendingSignupsPanel** (`src/components/PendingSignupsPanel.tsx`) — Admin-only dropdown/overlay listing pending user signups (name + email). Two approve buttons: green "User" (regular pool) and blue "Special" (demo pool); Deny requires a second confirmation click. Powered by `usePendingUsers`, `useApproveUser`, `useDenyUser`.
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
