# Kawaz Frontend

React and Vite frontend for the Kawaz-Plus video streaming platform.

The app currently provides:

- Cookie-based authentication backed by `kawaz-token` HttpOnly cookie
- Upload flow for video media (admin only)
- Video library grid on the home page
- Direct video playback using Shaka Player with built-in audio language and caption track switching

## Tech Stack

- React 19
- TypeScript
- Vite 6
- TanStack Query
- Shaka Player
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

- `VITE_BACKEND_URL`: base URL for all API requests. In development, set to `/api` to use the Vite proxy (configured in `vite.config.ts`).

## Application Routes

- `/login`: sign-in / sign-up screen
- `/`: protected home page — video library grid
- `/upload`: protected media upload page (admin only)
- `/videos/:id`: protected playback page for a specific video

## Backend API Dependencies

All requests go through `VITE_BACKEND_URL`:

- `POST /auth/login` — login, sets `kawaz-token` HttpOnly cookie
- `POST /auth/signup` — register
- `GET /auth/me` — returns `{ username, role }` for the current session
- `POST /media/upload` — upload a video file (admin only)
- `GET /media/videos` — list all videos
- `GET /media/videos/:id` — get video metadata
- `GET /media/videos/:id/output.mpd` — MPEG-DASH manifest
- `GET /media/videos/:id/*.m4s` — video segments (redirects to presigned URL)
- `GET /media/videos/:id/*.vtt` — VTT subtitle content

## Repository

GitHub repository:

- https://github.com/kawaz-video-streaming/kawaz-frontend
