# Kawaz Frontend

React and Vite frontend for the Kawaz+ video streaming platform.

## Features

- Cookie-based authentication backed by `kawaz-token` HttpOnly cookie
- Netflix-style profile picker (per-user profiles with avatar selection)
- Home page with tag-filtered carousels and full-screen search overlay
- Video playback via Shaka Player with audio language and caption track switching
- Collections — nested media groupings with topographic tree picker
- Admin: media upload, collection creation, avatar catalog management
- Live media processing panel (admin) — polls in-flight uploads with circular progress bars
- Pending signup queue (admin) — approve or deny new user registrations
- Mobile-first bottom navigation bar for admin actions (upload, collections, avatars, processing, signups)

## Tech Stack

- React 19
- TypeScript
- Vite 6
- TanStack Query
- React Router
- Shaka Player
- Tailwind CSS + shadcn/ui
- Zod

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

## Application Routes

```
/login                → Sign-in screen (public)
/profiles             → Profile picker — Netflix-style (protected, no navbar)
/                     → Home page — tag-filtered carousels + search
/videos/:id           → Video playback page
/collections/:id      → Collection page
/upload               → Media upload (admin only)
/collections/new      → Create collection (admin only)
/admin/avatars        → Avatar catalog management (admin only)
```

## Backend API Dependencies

All requests go through `VITE_BACKEND_URL`:

**Auth**
- `POST /auth/login` — login, sets `kawaz-token` HttpOnly cookie
- `POST /auth/signup` — register (creates a pending user if signup approval is required)
- `GET /user/me` — returns `{ username, role }` for the current session

**Media**
- `POST /media/upload` — upload a video file (admin only)
- `GET /media` — list all media
- `GET /media/videos/:id` — get video metadata
- `GET /media/videos/:id/output.mpd` — MPEG-DASH manifest
- `GET /media/:id/thumbnail` — video thumbnail
- `GET /media/uploading` — in-flight uploads (admin); 404 when empty

**Collections**
- `GET /mediaCollection` — list all collections
- `POST /mediaCollection` — create collection (admin)
- `PUT /mediaCollection/:id` — update collection (admin)
- `DELETE /mediaCollection/:id` — delete collection (admin)
- `GET /mediaCollection/:id/thumbnail` — collection thumbnail

**Profiles**
- `GET /user/profiles` — list profiles for current user
- `POST /user/profile` — create profile
- `PUT /user/profile` — update profile avatar
- `DELETE /user/profile/:name` — delete profile

**Avatars**
- `GET /avatar` — list all avatars
- `GET /avatar/:id/image` — avatar image (302 → presigned S3)
- `POST /avatar` — upload avatar (admin)
- `DELETE /avatar/:id` — delete avatar (admin)

**Admin**
- `GET /admin/pending` — list pending user signups (admin)
- `POST /admin/pending/:username/approve` — approve a pending signup (admin)
- `POST /admin/pending/:username/deny` — deny a pending signup (admin)

## Repository

- https://github.com/kawaz-video-streaming/kawaz-frontend
