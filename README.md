# JobPilot — AI Job‑Search Co‑Pilot

JobPilot finds real jobs, scores each one against your profile with AI, and helps you
apply — tailored CVs and cover letters, an AI career coach, interview prep, a pipeline
tracker, skill‑gap analysis, and more. It supports **two career tracks** (software
developer + construction site operative) and an **ITIL 4 learning path**.

## Features

- **AI job matching** — pulls live jobs from multiple UK/remote boards (Adzuna, Reed,
  Remotive, Arbeitnow, The Muse, Jobicy, GOV.UK Find a Job, Civil Service Jobs) and scores
  each 0–100 against your profile with Google Gemini.
- **Tailored documents** — AI‑written CVs and cover letters, downloadable as polished **PDF**.
- **AI career coach** and **interview prep**, grounded in your real profile + live pipeline.
- **Apply tracking** — one‑click apply that opens the posting, marks it applied, and sets a
  follow‑up reminder.
- **Dual career tracks** and an **ITIL 4** 10‑level learning roadmap.
- **Real accounts + database** (optional) via Supabase Auth + Postgres — multi‑user ready.
- **Automation** — optional scheduled auto‑search and email alerts (Resend).
- **Browser extension** — save any job page straight into JobPilot.

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, Framer Motion, Recharts.
- **Backend:** Node.js + Express (`server/`), Google Gemini for AI.
- **Auth + DB (optional):** Supabase (Postgres). Falls back to local JSON files + mock auth when not configured.

## Run locally

Requires **Node.js 20+**.

```bash
npm install
cp server/.env.example server/.env     # then add your GEMINI_API_KEY
npm run dev:all
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8787
- Demo login: `demo@jobpilot.ai` / `Demo1234!` (or create an account)

Get a free Gemini key at <https://aistudio.google.com/api-keys>. Without it, the app still
runs using heuristic scoring + template documents.

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for a complete, beginner‑friendly walkthrough
(Supabase + Render + Netlify). For just enabling real accounts/DB, see
**[SUPABASE_SETUP.md](SUPABASE_SETUP.md)**.

## Project layout

```
src/            React + TypeScript frontend
server/         Express API (AI, job sources, auth, Postgres/JSON storage)
supabase/       schema.sql (run once in Supabase)
extension/      MV3 browser extension ("Save Job")
```
