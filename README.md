# Bloom

Minimal productivity app with a growing 3D sakura tree driven by habit consistency.

## Stack

- Next.js (App Router) + Server Actions
- PostgreSQL on Neon + Drizzle ORM
- Better Auth (email / password)
- shadcn/ui
- Three.js via React Three Fiber
- Tauri 2 desktop shell

## Setup

1. Copy env template and fill values:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL` — Neon connection string
- `BETTER_AUTH_SECRET` — long random secret
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — usually `http://localhost:3000`

2. Install and migrate:

```bash
npm install
npm run db:migrate
```

3. Run the web app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Desktop (Tauri)

Requires [Rust](https://www.rust-lang.org/tools/install) and Tauri [prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

On Windows you also need **Visual Studio Build Tools** with the “Desktop development with C++” workload (`link.exe`), or `tauri:dev` will fail even if Rust is installed.

```bash
npm run tauri:dev
```

This starts Next.js, then opens Bloom in a native window pointed at `http://localhost:3000`.

Production desktop packaging still depends on a hosted Next.js URL (or a later static export). For MVP, use `tauri:dev` against the local web server.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js web |
| `npm run build` | Production web build |
| `npm run db:generate` | Create Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run tauri:dev` | Desktop shell + Next.js |
| `npm run tauri:build` | Native installer (needs production frontend strategy) |

## MVP features

- Home screen with sakura bloom level from 14-day rolling consistency
- Habit tracker: create, rename, archive, toggle today, 7-day dots
- Auth: sign up / sign in
- Widget placeholders reserved on the home screen
