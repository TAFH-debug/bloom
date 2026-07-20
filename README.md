# Bloom

Minimal habit tracker with a growing sakura tree. Monorepo:

| App | Path | Role |
| --- | --- | --- |
| Desktop | `apps/desktop` | Tauri + Vite React SPA |
| API | `apps/api` | FastAPI + Neon Postgres |
| Website | `apps/web` | Marketing Next.js site |

## Prerequisites

- Node 20+
- Python 3.11+
- Rust (for Tauri)
- Neon `DATABASE_URL`

## Setup

```bash
# JS workspaces
npm install

# API
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env   # set DATABASE_URL + SECRET_KEY
```

Copy `DATABASE_URL` from your Neon project into `apps/api/.env`.

Desktop API URL (default):

```bash
# apps/desktop/.env
VITE_API_URL=http://localhost:8000
```

## Dev

Three processes:

```bash
npm run dev:api        # FastAPI :8000
npm run dev:desktop    # Vite :1420 + Tauri window
npm run dev:web        # Marketing site
```

The desktop shell embeds the Vite UI (`frontendDist` / `devUrl`). It does **not** load Next.js on `:3000`.

## Legacy

The previous root Next.js + Better Auth app under `src/` / `server.ts` is superseded by `apps/desktop` + `apps/api`. Drizzle migrations in `drizzle/` remain the historical schema source; FastAPI maps the same Neon tables.
