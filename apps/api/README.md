# Bloom API

FastAPI backend for the Bloom habit tracker. Talks to the same Neon Postgres
database as the Next.js frontend and shares all existing tables.

## Quick start

```bash
cd apps/api
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -e .
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

## Auth

Email/password only. Passwords are bcrypt-hashed and stored in the existing
`account` table (`provider_id = 'credential'`, `account_id = email`).
Sessions live in the `session` table; the cookie is `bloom_session`
(HttpOnly, SameSite=Lax). Google OAuth endpoints are not implemented — the
schema supports it, but the flow requires a frontend redirect dance that
is out of scope here.

## WebSocket

Connect to `ws://localhost:8000/ws` with the `bloom_session` cookie.
The server sends `hello` + `preferences` on connect and relays
`status`, `invite-added`, `invite-removed`, `garden-changed`, and
`activity-ingested` messages. Clients can send `activity-ingest` upstream.
