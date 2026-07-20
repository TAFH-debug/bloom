# CLAUDE.md

@AGENTS.md

Bloom is a minimal habit tracker whose home screen grows a 3D sakura tree from habit consistency. It ships as a Tauri desktop SPA, a FastAPI backend, and a separate marketing Next.js site.

## Layout

```
apps/desktop  — Vite React SPA + Tauri (tray, activity tracking)
apps/api      — FastAPI REST + WebSocket (Neon Postgres)
apps/web      — Marketing website
```

## Commands

```bash
npm install
npm run dev:api        # uvicorn apps/api on :8000
npm run dev:desktop    # tauri dev (Vite :1420)
npm run dev:web        # marketing Next.js
npm run build:desktop
npm run build:web
```

API env: `apps/api/.env` (`DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`).
Desktop env: `apps/desktop/.env` (`VITE_API_URL=http://localhost:8000`).

## Architecture

**Desktop UI** is a Vite SPA under `apps/desktop/src`. Routes use React Router. Data comes from FastAPI via `src/lib/api.ts` (Bearer token in `localStorage`). Realtime uses `ws://…/ws?token=…`.

**Tauri** (`apps/desktop/src-tauri`) loads `WebviewUrl::App` (bundled `dist/`). Dev uses `devUrl` `http://localhost:1420`. Native pieces: tray hide-on-close, Windows activity sampling, notifications.

**API** (`apps/api/app`) owns auth sessions, habits, garden, status, preferences, activity ingest, and the WebSocket hub. Same Neon tables as the old Drizzle schema.

**Marketing** (`apps/web`) is brand-only — no product dashboard.

## Conventions

- Desktop import alias `@/*` → `apps/desktop/src/*`
- Keep consistency/schedule scoring behavior aligned between any UI helpers and `apps/api/app/domain/`
- When adding mutations that garden friends should see live, publish on the FastAPI realtime hub
