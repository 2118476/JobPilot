// ─────────────────────────────────────────────────────────────
// store.js — per-user persistence layer.
// Supabase configured → Postgres rows scoped by user_id (production).
// Not configured (local dev) → JSON files under server/data/, namespaced
// per account (server/data/users/<id>/ for non-primary accounts).
//
// NOTE: no personal data is seeded here. Every user starts with a blank
// profile and completes onboarding. Local data files are gitignored.
// ─────────────────────────────────────────────────────────────
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseConfigured } from './supabaseAdmin.js'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.JOBPILOT_DATA_DIR || path.join(__dirname, 'data')

async function readJson(name, fallback) {
  try {
    const raw = await readFile(path.join(DATA_DIR, name), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJson(name, data) {
  const full = path.join(DATA_DIR, name)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, JSON.stringify(data, null, 2), 'utf8')
}

// ─── Users & namespacing ─────────────────────────────────────
export const LOCAL_USER = 'local'
const useDb = (userId) => supabaseConfigured() && !!userId && userId !== LOCAL_USER

// In local JSON mode, each non-primary account gets its own namespace under
// server/data/users/<id>/ so accounts never see each other's data.
const userFile = (userId, name) =>
  !userId || userId === LOCAL_USER
    ? name
    : path.join('users', String(userId).replace(/[^a-zA-Z0-9_-]/g, '-'), name)

// ─── Career tracks ───────────────────────────────────────────
const TRACK_FILES = { tech: 'profile.json', construction: 'profile.construction.json' }
const normTrack = (t) => (t === 'construction' ? 'construction' : 'tech')

export function listTracks() {
  return [
    { id: 'tech', label: 'Tech / Office', headline: 'Professional and office-based roles', icon: 'code' },
    { id: 'construction', label: 'Trades / Site', headline: 'Construction, trades and site-based roles', icon: 'hardhat' },
  ]
}

/** Blank profile skeleton — every new user starts here (onboarding fills it). */
export function emptyProfile(track) {
  return {
    full_name: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    github: '',
    location: '',
    headline: '',
    summary: '',
    education: [],
    experience: [],
    skills: {},
    projects: [],
    preferences: {
      titles: [],
      seniority: [],
      locations: [],
      work_styles: [],
      salary_min: 0,
      salary_max: 0,
      currency: 'GBP',
      avoid: [],
    },
    goals: '',
    skills_to_learn: [],
    additional: {},
    track: normTrack(track),
  }
}

/** A profile is "ready" for AI features once the essentials exist. */
export function profileReady(profile) {
  return !!(profile && profile.full_name)
}

export async function getActiveTrack(userId) {
  if (useDb(userId)) return normTrack(await db.dbGetActiveTrack(userId))
  const meta = await readJson(userFile(userId, 'meta.json'), null)
  return normTrack(meta?.active_track)
}
export async function setActiveTrack(userId, track) {
  const t = normTrack(track)
  if (useDb(userId)) { await db.dbSetActiveTrack(userId, t); return t }
  await writeJson(userFile(userId, 'meta.json'), { active_track: t })
  return t
}

export async function getProfile(userId, track) {
  const t = normTrack(track || (await getActiveTrack(userId)))
  if (useDb(userId)) {
    return (await db.dbGetProfile(userId, t)) || emptyProfile(t)
  }
  return (await readJson(userFile(userId, TRACK_FILES[t]), null)) || emptyProfile(t)
}
export async function saveProfile(userId, profile, track) {
  const t = normTrack(track || (await getActiveTrack(userId)))
  if (useDb(userId)) return await db.dbSaveProfile(userId, t, profile)
  await writeJson(userFile(userId, TRACK_FILES[t]), profile)
  return profile
}

export async function getJobs(userId) {
  if (useDb(userId)) return await db.dbGetJobs(userId)
  return await readJson(userFile(userId, 'jobs.json'), [])
}
export async function saveJobs(userId, jobs) {
  if (useDb(userId)) return await db.dbSaveJobs(userId, jobs)
  await writeJson(userFile(userId, 'jobs.json'), jobs)
  return jobs
}

export async function getDocuments(userId) {
  if (useDb(userId)) return await db.dbGetDocuments(userId)
  return await readJson(userFile(userId, 'documents.json'), [])
}
export async function saveDocuments(userId, docs) {
  if (useDb(userId)) return await db.dbSaveDocuments(userId, docs)
  await writeJson(userFile(userId, 'documents.json'), docs)
  return docs
}
export async function deleteDocument(userId, id) {
  if (useDb(userId)) return await db.dbDeleteDocument(userId, id)
  const docs = await readJson(userFile(userId, 'documents.json'), [])
  await writeJson(userFile(userId, 'documents.json'), docs.filter((d) => d.id !== id))
  return true
}

// ─── Per-user search automation settings ─────────────────────
export const DEFAULT_SEARCH_SETTINGS = {
  enabled: false,          // auto-search on a schedule
  query: '',               // custom query ('' = derive from profile target titles)
  location: '',            // '' = derive from profile preferences
  min_score_alert: 85,     // only alert on matches at/above this score
  email_alerts: false,     // send email digests
  alert_email: '',         // where to send them ('' = account email)
  frequency: 'twice_daily',
}

export async function getSearchSettings(userId) {
  if (useDb(userId)) {
    const s = await db.dbGetSearchSettings(userId)
    return { ...DEFAULT_SEARCH_SETTINGS, ...(s || {}) }
  }
  const s = await readJson(userFile(userId, 'search_settings.json'), null)
  return { ...DEFAULT_SEARCH_SETTINGS, ...(s || {}) }
}
export async function saveSearchSettings(userId, settings) {
  const clean = { ...DEFAULT_SEARCH_SETTINGS, ...(settings || {}) }
  if (useDb(userId)) return await db.dbSaveSearchSettings(userId, clean)
  await writeJson(userFile(userId, 'search_settings.json'), clean)
  return clean
}

/** Users with auto-search enabled (for the scheduler). */
export async function listAutomationUsers() {
  if (supabaseConfigured()) return await db.dbListAutomationUsers()
  const s = await getSearchSettings(LOCAL_USER)
  return s.enabled ? [{ userId: LOCAL_USER, settings: s }] : []
}

// ─── Per-user data export / deletion (GDPR-style) ────────────
export async function exportUserData(userId) {
  const [activeTrack, profileTech, profileConstruction, jobs, documents, settings] = await Promise.all([
    getActiveTrack(userId),
    getProfile(userId, 'tech'),
    getProfile(userId, 'construction'),
    getJobs(userId),
    getDocuments(userId),
    getSearchSettings(userId),
  ])
  return {
    format: 'jobpilot-workspace',
    version: 1,
    exported_at: new Date().toISOString(),
    active_track: activeTrack,
    profiles: { tech: profileTech, construction: profileConstruction },
    jobs,
    documents,
    search_settings: settings,
  }
}

/** Restore a JobPilot workspace into the authenticated user's own account. */
export async function importUserData(userId, archive, { replace = false } = {}) {
  if (!archive || typeof archive !== 'object' || Array.isArray(archive)) {
    throw new Error('Invalid JobPilot archive.')
  }

  const profiles = archive.profiles && typeof archive.profiles === 'object' ? archive.profiles : {}
  const incomingJobs = Array.isArray(archive.jobs) ? archive.jobs.slice(0, 2000) : []
  const incomingDocuments = Array.isArray(archive.documents) ? archive.documents.slice(0, 200) : []

  if (replace) await deleteUserData(userId)

  for (const track of ['tech', 'construction']) {
    const profile = profiles[track]
    if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
      await saveProfile(userId, { ...emptyProfile(track), ...profile, track }, track)
    }
  }

  const existingJobs = replace ? [] : await getJobs(userId)
  const jobsById = new Map(existingJobs.filter((j) => j?.id).map((j) => [j.id, j]))
  for (const job of incomingJobs) {
    if (job && typeof job === 'object' && job.id && job.title) {
      jobsById.set(String(job.id), { ...job, user_id: userId })
    }
  }
  await saveJobs(userId, [...jobsById.values()])

  const existingDocuments = replace ? [] : await getDocuments(userId)
  const docsById = new Map(existingDocuments.filter((d) => d?.id).map((d) => [d.id, d]))
  for (const doc of incomingDocuments) {
    if (doc && typeof doc === 'object' && doc.id && doc.content) docsById.set(String(doc.id), doc)
  }
  await saveDocuments(userId, [...docsById.values()].slice(0, 200))

  if (archive.search_settings && typeof archive.search_settings === 'object') {
    await saveSearchSettings(userId, archive.search_settings)
  }
  if (archive.active_track === 'tech' || archive.active_track === 'construction') {
    await setActiveTrack(userId, archive.active_track)
  }

  return {
    ok: true,
    profiles: Object.keys(profiles).filter((t) => t === 'tech' || t === 'construction').length,
    jobs: jobsById.size,
    documents: docsById.size,
    active_track: await getActiveTrack(userId),
  }
}

export async function deleteUserData(userId) {
  if (useDb(userId)) return await db.dbDeleteUserData(userId)
  // Local mode: overwrite with empty stores (files are per-account already)
  await writeJson(userFile(userId, 'jobs.json'), [])
  await writeJson(userFile(userId, 'documents.json'), [])
  await writeJson(userFile(userId, TRACK_FILES.tech), emptyProfile('tech'))
  await writeJson(userFile(userId, TRACK_FILES.construction), emptyProfile('construction'))
  await writeJson(userFile(userId, 'search_settings.json'), DEFAULT_SEARCH_SETTINGS)
  return true
}
