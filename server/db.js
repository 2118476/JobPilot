// ─────────────────────────────────────────────────────────────
// db.js — Postgres data layer (via Supabase service-role client)
// Pure persistence, always scoped by user_id. Profiles and jobs are
// stored as jsonb blobs (keeps the rich nested shape; can normalise
// later). Defaults are supplied by store.js, not here.
// ─────────────────────────────────────────────────────────────
import { admin } from './supabaseAdmin.js'

const now = () => new Date().toISOString()

// ─── Profiles (per user, per track) ──────────────────────────
export async function dbGetProfile(userId, track) {
  const { data, error } = await admin()
    .from('profiles')
    .select('data')
    .eq('user_id', userId)
    .eq('track', track)
    .maybeSingle()
  if (error) throw error
  return data?.data ?? null
}

export async function dbSaveProfile(userId, track, profile) {
  const { error } = await admin()
    .from('profiles')
    .upsert({ user_id: userId, track, data: profile, updated_at: now() }, { onConflict: 'user_id,track' })
  if (error) throw error
  return profile
}

// ─── Active track ────────────────────────────────────────────
export async function dbGetActiveTrack(userId) {
  const { data, error } = await admin()
    .from('app_meta')
    .select('active_track')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.active_track ?? null
}

export async function dbSetActiveTrack(userId, track) {
  const { error } = await admin()
    .from('app_meta')
    .upsert({ user_id: userId, active_track: track, updated_at: now() }, { onConflict: 'user_id' })
  if (error) throw error
  return track
}

// ─── Jobs ────────────────────────────────────────────────────
export async function dbGetJobs(userId) {
  const { data, error } = await admin()
    .from('jobs')
    .select('data')
    .eq('user_id', userId)
    .order('match_score', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => r.data)
}

export async function dbSaveJobs(userId, jobs) {
  if (!jobs || !jobs.length) return jobs
  const rows = jobs.map((j) => ({
    user_id: userId,
    id: j.id,
    data: j,
    match_score: j.match_score || 0,
    status: j.status || 'new',
    created_at: j.created_at || now(),
    updated_at: now(),
  }))
  const { error } = await admin().from('jobs').upsert(rows, { onConflict: 'user_id,id' })
  if (error) throw error
  return jobs
}

// ─── Documents (generated CVs / cover letters) ───────────────
export async function dbGetDocuments(userId) {
  const { data, error } = await admin()
    .from('documents')
    .select('id, job_id, type, job_title, company, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

export async function dbSaveDocuments(userId, docs) {
  const rows = (docs || []).map((d) => ({
    user_id: userId,
    id: d.id,
    type: d.type,
    job_id: d.job_id || null,
    job_title: d.job_title || '',
    company: d.company || '',
    content: d.content,
    created_at: d.created_at || now(),
  }))
  if (rows.length) {
    const { error } = await admin().from('documents').upsert(rows, { onConflict: 'user_id,id' })
    if (error) throw error
  }
  return docs
}
