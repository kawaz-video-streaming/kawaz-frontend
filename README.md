# Kawaz Frontend

**Version:** 1.0.86

React and Vite frontend for the Kawaz+ video streaming platform.

## Features

- Cookie-based authentication backed by `kawaz-token` HttpOnly cookie, with a Capacitor Preferences-backed bearer token as a durable fallback on native; Google OAuth (web + Android native + TV device flow)
- Netflix-style profile picker (per-user profiles with avatar selection)
- Home page with genre-filtered video grid and full-screen search overlay
- Video playback via Shaka Player (MPEG-DASH) with audio language and caption track switching
- Collections — nested media groupings (show → season → episodes; general collections) with topographic tree picker
- TMDB metadata search — auto-fill title, description, genres, and thumbnail from The Movie Database for movies, shows, seasons, and episodes
- Admin: media upload (presigned S3), collection creation, avatar catalog management, genre management, newsletter broadcast
- Admin subtitle management — add VTT subtitle tracks to existing media, toggle tracks on/off, rename labels
- Live media processing panel (admin) — polls in-flight uploads with circular SVG progress bars
- Pending signup queue (admin) — approve or deny new user registrations
- Account management — self-service account deletion with confirmation flow
- Responsive layout: sticky Navbar (desktop `lg+`) + bottom sheet BottomNav (mobile)
- Native apps via Capacitor: Android, iOS, Android TV / Fire TV

## Tech Stack

- React 19
- TypeScript
- Vite 6
- TanStack Query
- React Router
- Shaka Player
- Tailwind CSS + shadcn/ui
- Zod
- Capacitor (Android/iOS/TV)

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

If you are on Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment Variables

```env
VITE_BACKEND_URL=http://localhost:8080
```

For native (Capacitor) builds create `.env.native`:

```env
VITE_BACKEND_URL=https://kawazplus.com
```

## Application Routes

```
/login                          → Sign-in screen (public)
/reset-password                 → Password reset (public)
/auth/callback                  → Google OAuth callback (public)
/delete-account                 → Data deletion info page — app store compliance (public)
/profiles                       → Profile picker — Netflix-style (protected, no navbar)
/                               → Home page — genre-filtered video grid + search
/videos/:id                     → Video playback page
/collections/:collectionId/videos/:id → Video playback with collection context
/collections/:id                → Collection page
/collections/new                → Create collection (admin only)
/upload                         → Media upload (admin only)
/admin/avatars                  → Avatar catalog management (admin only)
/admin/genres                   → Genre management (admin only)
/admin/newsletter               → Newsletter broadcast (admin only)
/account                        → Account settings and deletion
```

## Backend API Dependencies

All requests go through `VITE_BACKEND_URL`. Full API documentation is available at `GET /api-docs` on the backend.

**Auth**
- `POST /auth/login` — login, sets `kawaz-token` HttpOnly cookie
- `POST /auth/signup` — register (account goes to pending until admin approves)
- `GET /auth/google/login` — redirect to Google OAuth
- `GET /auth/google/callback` — Google OAuth callback
- `POST /auth/forgot-password` — request password reset email
- `POST /auth/reset-password` — reset password with token
- `GET /user/me` — returns `{ username, role }` for the current session

**Media**
- `POST /media/upload/initiate` — create media record; returns presigned S3 PUT URLs (admin)
- `POST /media/upload/complete` — signal upload done; triggers AMQP processing pipeline (admin)
- `GET /media` — list all completed media
- `GET /media/:id` — get single media metadata
- `GET /media/uploading` — list in-flight uploads (admin)
- `GET /media/:id/progress` — get processing status and percentage
- `PUT /media/:id` — update media (admin)
- `DELETE /media/:id` — delete media (admin)
- `GET /media/:id/thumbnail` — media thumbnail image
- `GET /media/stream/:id/output.mpd` — MPEG-DASH manifest
- `GET /media/stream/:id/*.m4s` — video segment
- `GET /media/stream/:id/*.vtt` — VTT subtitle / chapters / thumbnails
- `GET /media/tmdb/movie` — TMDB movie metadata lookup (admin)
- `GET /media/tmdb/show` — TMDB show metadata lookup (admin)
- `GET /media/tmdb/episode` — TMDB episode metadata lookup (admin)
- `GET /media/tmdb/season` — TMDB season metadata lookup (admin)
- `GET /media/tmdb/collection` — TMDB collection metadata lookup (admin)
- `GET /media/tmdb/poster` — proxy TMDB poster image (admin)
- `POST /media/:id/subtitle/initiate` — reserve subtitle upload slot (admin)
- `POST /media/:id/subtitle/complete` — confirm VTT upload and rebuild manifest (admin)
- `PUT /media/:id/subtitle/:subtitleId` — toggle or rename subtitle track (admin)

**Collections**
- `GET /media-collection` — list all collections
- `GET /media-collection/:id` — get single collection
- `POST /media-collection` — create collection with thumbnail (admin)
- `PUT /media-collection/:id` — update collection (admin)
- `DELETE /media-collection/:id` — delete collection (must be empty) (admin)
- `GET /media-collection/:id/thumbnail` — collection thumbnail image

**Profiles & Account**
- `GET /user/profiles` — list profiles for current user
- `POST /user/profile` — create profile
- `PUT /user/profile` — update profile avatar
- `DELETE /user/profile/:name` — delete profile
- `DELETE /user/account` — permanently delete account

**Avatars & Categories**
- `GET /avatar` — list all avatars
- `GET /avatar/:id/image` — avatar image
- `POST /avatar` — upload avatar (admin)
- `DELETE /avatar/:id` — delete avatar (admin)
- `GET /avatar-category` — list avatar categories
- `POST /avatar-category` — create avatar category (admin)
- `DELETE /avatar-category/:id` — delete avatar category (admin)

**Genres**
- `GET /mediaGenre` — list all genres
- `POST /mediaGenre` — create genre (admin)
- `DELETE /mediaGenre` — delete genre by name (admin)

**Admin**
- `GET /admin/pending` — list pending user signups
- `POST /admin/pending/:username/approve/:role` — approve signup with assigned role
- `POST /admin/pending/:username/deny` — deny signup
- `POST /admin/newsletter` — send HTML email to all approved users

## Repository

- https://github.com/kawaz-video-streaming/kawaz-frontend
