-- ════════════════════════════════════════════════════════════════════════════
-- JobPilot — Supabase / Postgres schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Auth (auth.users) is provided by Supabase automatically; these are the
-- app's per-user data tables. RLS is enabled so users can only see their own
-- rows; the backend uses the service-role key (bypasses RLS) and always
-- filters by user_id.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Profiles: one row per user per career track (tech | construction) ───────
create table if not exists public.profiles (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  track       text        not null default 'tech',
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, track)
);

-- ─── App meta: the user's active track ───────────────────────────────────────
create table if not exists public.app_meta (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  active_track text        not null default 'tech',
  updated_at   timestamptz not null default now()
);

-- ─── Jobs: scraped + AI-scored listings, per user (stored as jsonb) ──────────
create table if not exists public.jobs (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          text        not null,
  data        jsonb       not null,
  match_score int         not null default 0,
  status      text        not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists jobs_user_score_idx on public.jobs (user_id, match_score desc);

-- ─── Documents: generated CVs / cover letters, per user ──────────────────────
create table if not exists public.documents (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  type       text        not null default 'cv',          -- 'cv' | 'cover_letter'
  job_id     text,
  job_title  text        default '',
  company    text        default '',
  content    text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);

-- ─── Search automation settings: one row per user ────────────────────────────
-- (Safe to run on an existing database — additive only.)
create table if not exists public.search_settings (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  enabled    boolean     not null default false,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists search_settings_enabled_idx on public.search_settings (enabled) where enabled;

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security — each user only sees their own rows.
-- (The backend service-role key bypasses these; they protect any direct access.)
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles        enable row level security;
alter table public.app_meta        enable row level security;
alter table public.jobs            enable row level security;
alter table public.documents       enable row level security;
alter table public.search_settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','app_meta','jobs','documents','search_settings'] loop
    execute format('drop policy if exists "own rows select" on public.%I;', t);
    execute format('drop policy if exists "own rows insert" on public.%I;', t);
    execute format('drop policy if exists "own rows update" on public.%I;', t);
    execute format('drop policy if exists "own rows delete" on public.%I;', t);
    execute format('create policy "own rows select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own rows insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own rows update" on public.%I for update using (auth.uid() = user_id);', t);
    execute format('create policy "own rows delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;
