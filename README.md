# Kawaz Frontend

React and Vite frontend for the Kawaz-Plus video streaming platform.

The app currently provides:

- Protected application shell with token-based auth state stored in localStorage
- Upload flow for video and image media
- Direct video playback using Shaka Player with built-in audio language and caption track switching
- Placeholder home and login screens while backend endpoints are still being completed

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

The frontend expects these variables:

```env
VITE_BACKEND_URL=http://localhost:8080
VITE_VOD_URL=http://localhost:8082
```

- `VITE_BACKEND_URL`: base URL for authenticated API requests such as media upload
- `VITE_VOD_URL`: base URL for direct VOD metadata and streaming routes

## Application Routes

- `/login`: sign-in screen placeholder
- `/`: protected home page
- `/upload`: protected media upload page
- `/videos/:id`: protected playback page for a specific video

## Current Backend Assumptions

This frontend currently depends on the following backend behavior:

- `POST /media/upload` is available on `VITE_BACKEND_URL`
- `GET /video/:id` is available on `VITE_VOD_URL`
- `GET /stream/:playUrl` is available on `VITE_VOD_URL`

Authentication is not fully wired yet. The login page is a placeholder until the backend exposes a real auth endpoint.

## Known Gaps

- The home page does not yet fetch a video list
- The login page intentionally fails until the auth API exists
- VOD calls are still split from the main backend client until proxying is added on the backend side

## Repository

GitHub repository:

- https://github.com/kawaz-video-streaming/kawaz-frontend
