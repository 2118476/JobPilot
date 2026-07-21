# Deploying JobPilot — Full Step‑by‑Step (for total beginners)

This guide takes you from nothing to a **live, multi‑user JobPilot on the internet**, using
three free services:

| Piece | Service | What it does |
|-------|---------|--------------|
| **Database + login** | **Supabase** | Stores users and their data (Postgres) |
| **Backend API** | **Render** | Runs the Node/Express server + AI |
| **Frontend website** | **Netlify** | Serves the React app to visitors |

You'll do them **in this order**: Supabase → Render → Netlify. Each part ends with a value
you copy into the next part. Take it slow; copy/paste exactly.

> Everything is already coded and configured. You're just creating accounts, pasting keys,
> and clicking "Deploy".

---

## Before you start — get your keys ready

Open a notepad and collect these as you go. You'll need:

1. **Gemini API key** (the AI). Get it free:
   - Go to <https://aistudio.google.com/api-keys> → sign in with Google → **Create API key**.
   - Copy it. It looks like `AIza...`. Paste into your notepad as `GEMINI_API_KEY`.
2. A **GitHub account** with this repo pushed (already done): `https://github.com/2118476/JobPilot`.

Optional (can add later): Adzuna + Reed keys (more jobs), Resend key (email alerts).

---

## PART 1 — Supabase (database + login)  ~10 min

### 1.1 Create the project
1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. Click **New project**.
3. Fill in:
   - **Name:** `jobpilot`
   - **Database Password:** click **Generate a password**, then **copy it to your notepad**
     (you may need it later).
   - **Region:** pick the one closest to you (e.g. *West EU (London)*).
4. Click **Create new project**. Wait ~2 minutes while it sets up.

### 1.2 Create the tables
1. In the left sidebar click **SQL Editor** → **+ New query**.
2. Open the file **`supabase/schema.sql`** from this repo, copy **all** of it, and paste it
   into the query box.
3. Click **Run** (bottom right). You should see "Success. No rows returned". ✅
   (This created the `profiles`, `app_meta`, `jobs`, `documents` tables with security rules.)

### 1.3 Copy your 3 Supabase values
1. Left sidebar → **Project Settings** (gear icon) → **API**.
2. Copy these into your notepad:
   - **Project URL** → save as `SUPABASE_URL` (e.g. `https://abcd1234.supabase.co`)
   - **Project API keys → `anon` `public`** → save as `SUPABASE_ANON_KEY`
   - **Project API keys → `service_role` `secret`** → save as `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ This one is a **secret** — it goes only on the backend, never in the website.

### 1.4 (Recommended) Turn off email confirmation for now
So new sign‑ups can log in immediately without a confirmation email:
1. Left sidebar → **Authentication** → **Providers** (or **Sign In / Providers**) → **Email**.
2. Turn **OFF** "Confirm email". Click **Save**.
   (Turn it back on later for production if you want email verification.)

✅ **Part 1 done.** You now have: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## PART 2 — Render (the backend API)  ~10 min

### 2.1 Create the service from the blueprint
1. Go to <https://render.com> → **Get Started** → sign in with GitHub.
2. Top‑right **New +** → **Blueprint**.
3. Click **Connect** next to your `2118476/JobPilot` repo. (If you don't see it, click
   **Configure account** / **Configure GitHub App**, grant access to the repo, come back.)
4. Render reads **`render.yaml`** and shows a service called **`jobpilot-backend`**. Click **Apply**
   / **Create**.

### 2.2 Add the secret environment variables
Render created the service but the secrets are blank. Set them:
1. Open the **`jobpilot-backend`** service → left tab **Environment**.
2. For each of these, click **Add Environment Variable** (or edit the empty ones) and paste
   the value from your notepad:
   - `GEMINI_API_KEY` = *(your Gemini key)*
   - `SUPABASE_URL` = *(your Supabase Project URL)*
   - `SUPABASE_SERVICE_ROLE_KEY` = *(your Supabase service_role secret)*
3. Click **Save Changes**. Render will **redeploy** automatically.

> `AI_PROVIDER`, `GEMINI_MODEL` and `GEMINI_SCORE_MODEL` are already set by the blueprint.
> Leave `ADZUNA_*`, `REED_API_KEY`, `RESEND_API_KEY`, `EMAIL_TO` blank unless you have them.

> **Existing DeployPilot/Render service:** Render ignores `sync: false` values during later
> blueprint updates. Add `GEMINI_API_KEY` (and both Supabase secrets) directly in the
> service's **Environment** tab, save, and redeploy.

### 2.3 Wait for it to go live and copy the URL
1. Watch the **Logs** tab. When you see
   `Storage: Supabase Postgres (multi-user auth)` and no errors, it's live.
2. At the top of the service page copy its exact URL — something like
   **`https://jobpilot-backend-xxxx.onrender.com`**. Save it as `BACKEND_URL`; the suffix
   varies by service.
3. Test it: open `BACKEND_URL/api/health` in your browser. You should see
   `{"ok":true, ... "auth":"supabase"}`. ✅

> ℹ️ On Render's **free** plan the backend "sleeps" after ~15 min idle; the first request
> after that takes ~30–50s to wake. That's normal. Upgrade to a paid instance to avoid it.

✅ **Part 2 done.** You now have `BACKEND_URL`.

---

## PART 3 — Netlify (the frontend website)  ~10 min

### 3.1 Import the repo
1. Go to <https://app.netlify.com> → sign in with GitHub.
2. **Add new site** → **Import an existing project** → **GitHub** → pick `2118476/JobPilot`.
3. Netlify reads **`netlify.toml`**, so the build settings are pre‑filled:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   Leave them as‑is.

### 3.2 Add the frontend environment variables (BEFORE the first deploy)
1. On the same import screen click **Add environment variables** (or later:
   **Site configuration → Environment variables**). Add:
   - `VITE_SUPABASE_URL` = *(your Supabase Project URL)*
   - `VITE_SUPABASE_ANON_KEY` = *(your Supabase anon/public key)*
   - `VITE_API_URL` = *(your `BACKEND_URL` from Render, e.g. `https://jobpilot-api.onrender.com`)*
2. Click **Deploy site**.

> If you added the env vars *after* the first deploy, go to **Deploys → Trigger deploy →
> Deploy site** so the build picks them up.

### 3.3 Get your live URL
When the deploy finishes, Netlify shows your site URL, e.g.
**`https://jobpilot-xyz.netlify.app`**. Open it — that's your live app! 🎉
(You can rename it under **Site configuration → Change site name**, or add a custom domain.)

✅ **Part 3 done.**

---

## PART 4 — Test the whole thing

1. Open your Netlify URL.
2. Click **Create Account**, sign up with a real email + password.
3. In Supabase → **Authentication → Users**, you should see the new user appear. ✅
4. In the app, go to **Search Settings → Run Search Now** (or Jobs → AI Search). Real jobs
   load and get AI‑scored. (First run may be slow if the Render backend was asleep.)
5. Open a job → **Generate Tailored CV** → **Download PDF**.
6. In Supabase → **Table Editor → jobs / profiles**, you'll see that user's rows.

If all that works, **you're fully deployed and multi‑user.** 🚀

---

## Troubleshooting

**The app loads but says "couldn't reach the coach" / no jobs load.**
- `VITE_API_URL` on Netlify is wrong or missing → set it to your Render URL and redeploy.
- The Render backend is asleep (free plan) → wait ~40s and retry.
- Open `BACKEND_URL/api/health` directly; if it doesn't return JSON, check Render logs.

**Sign‑up/login fails.**
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` wrong on Netlify → fix and redeploy.
- Email confirmation is still ON → either confirm via email or turn it off (Part 1.4).

**Render deploy fails.**
- Check the **Logs**. Usually a missing env var. Ensure `GEMINI_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` are all set, then **Manual Deploy → Deploy latest commit**.

**Health shows `"auth":"local"` instead of `"supabase"`.**
- The backend's `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` aren't set on Render.

**CORS errors in the browser console.**
- The backend allows all origins by default, so this usually means the request isn't reaching
  Render at all — recheck `VITE_API_URL`.

---

## Optional extras (add anytime)

- **More jobs:** get free keys at <https://developer.adzuna.com/> and
  <https://www.reed.co.uk/developers>, then add `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`,
  `REED_API_KEY` on Render.
- **Email alerts:** get a free key at <https://resend.com>, add `RESEND_API_KEY` + `EMAIL_TO`
  on Render. To auto‑run searches, also add `ENABLE_SCHEDULER=true`.
- **Custom domain:** add it in Netlify (frontend) and, if you like, Render (backend).

## Production checklist (go-live)

- [ ] **Supabase configured** — project created, `supabase/schema.sql` run (re-run after app
      updates; it's additive and safe — it also creates the `search_settings` table)
- [ ] **Render env vars** — `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` set;
      `NODE_ENV=production` comes from `render.yaml`
- [ ] **CORS locked** — set `ALLOWED_ORIGINS` on Render to your Netlify URL
      (e.g. `https://your-app.netlify.app`)
- [ ] **Netlify env vars** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
- [ ] **Mock auth disabled** — `ALLOW_MOCK_AUTH` is NOT set: in production the backend refuses
      to boot without Supabase, and the frontend shows a setup screen instead of mock login
- [ ] **Optional keys** — Adzuna/Reed (more job sources), Resend (`RESEND_API_KEY`) for email
- [ ] **Automation** — set `ENABLE_SCHEDULER=true` on Render for per-user auto-search; users
      opt in from Search Settings → "Auto-Search & Alerts"
- [ ] **Quality gates** — `npm run typecheck && npm run lint && npm run test && npm run build` pass

## Updating the live site later

Just push to GitHub:
```bash
git add -A && git commit -m "your change" && git push
```
Render and Netlify both **auto‑deploy** on every push to the default branch. Done.
