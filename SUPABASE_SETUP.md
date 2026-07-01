# JobPilot — Real Accounts + Database (Supabase + Postgres)

JobPilot now supports **real multi-user sign-in and per-user Postgres storage** via
Supabase. It's **opt-in**: with no Supabase keys set, the app runs exactly as before
(localStorage mock auth + local JSON files — great for demos and a static deploy). Add
the keys and it becomes a real multi-user product where every user has their own
profile, jobs, documents and career tracks.

## How it works

- **Auth** — Supabase Auth (email + password). The frontend gets a JWT.
- **Every backend request** carries that JWT (`Authorization: Bearer …`).
- The Express backend **verifies the JWT**, extracts the user id, and reads/writes
  **Postgres scoped to that user**. The Gemini key and all data logic stay server-side.
- **Row Level Security** is enabled on every table as a safety net.
- If Supabase isn't configured, the backend transparently falls back to a single local
  user on JSON files — nothing breaks.

## One-time setup (~10 minutes)

### 1. Create a Supabase project
Go to <https://supabase.com> → **New project**. Pick a name + database password (save it).

### 2. Create the tables
In the dashboard: **SQL Editor → New query** → paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**. This creates the
`profiles`, `app_meta`, `jobs`, `documents` tables with RLS policies.

### 3. Grab your keys
**Project Settings → API**. You need three values:

| Value | Used by | Secret? |
|-------|---------|---------|
| **Project URL** | frontend + backend | no |
| **anon / public key** | frontend | no (safe in browser) |
| **service_role key** | backend only | **YES — never expose in the browser** |

### 4. Set environment variables

**Frontend** — create `.env.local` in the project root (see `.env.example`):
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon/public key
# VITE_API_URL=https://your-backend-url   # only needed once the backend is deployed
```

**Backend** — add to `server/.env` (see `server/.env.example`):
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # service_role key — keep secret
```

### 5. (Optional) Turn off email confirmation for quick testing
**Authentication → Providers → Email** → toggle off "Confirm email" so new sign-ups log in
immediately. Leave it on for production (users confirm via email).

### 6. Run it
```
npm run dev:all
```
The backend log will now say **`Storage: Supabase Postgres (multi-user auth)`**. Sign up a
new account in the app — it's a real Supabase user, and all their data lives in your
Postgres database, isolated from every other user.

## Verifying it's live
- Backend startup log shows `Storage: Supabase Postgres (multi-user auth)`.
- `GET /api/health` returns `"auth": "supabase"`.
- New sign-ups appear under **Authentication → Users** in the Supabase dashboard.
- Their rows appear in the **Table Editor** (`profiles`, `jobs`, …).

## Notes for going to production / sale
- The **service_role key bypasses RLS** — it lives only on the backend, never in the
  frontend bundle. Keep it in the host's environment variables.
- Data is stored as `jsonb` blobs (profile, job). That's intentional for fast iteration;
  it can be normalised into columns later without changing the API.
- Deploy the backend somewhere that can run Node (Render/Railway/Fly), set the two server
  env vars there, and point the frontend's `VITE_API_URL` at it.
