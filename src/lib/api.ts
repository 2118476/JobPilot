// ─────────────────────────────────────────────────────────────
// api.ts — client for the JobPilot AI backend.
// Every call fails soft (returns null / throws caught) so the UI
// falls back to seed data when the backend isn't running.
// ─────────────────────────────────────────────────────────────
import type { Job } from '@/types'
import { supabase } from '@/lib/supabase'

const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8787'

/** Current auth token (if signed in) → Authorization header for the backend. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

// In-memory cache of the most recently loaded live jobs, so JobDetail can
// resolve a job by id synchronously (it's reached via the Jobs list, which
// warms this cache). Avoids reshaping JobDetail's hook order for an async fetch.
let _jobCache: Job[] = []
export function cacheJobs(jobs: Job[]) {
  if (jobs && jobs.length) _jobCache = jobs
}
export function findCachedJob(id: string): Job | undefined {
  return _jobCache.find((j) => j.id === id)
}

export interface AIStatus {
  provider: string
  model: string
  live: boolean
  note: string | null
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 120000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const auth = await authHeader()
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...auth, ...(init?.headers || {}) },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Is the backend up? Returns AI status or null if unreachable. */
export async function health(): Promise<{ ok: boolean; ai: AIStatus } | null> {
  try {
    return await req('/api/health', undefined, 4000)
  } catch {
    return null
  }
}

/** Stored jobs (already scored). null if backend down or empty. */
export async function getJobs(): Promise<Job[] | null> {
  try {
    const jobs = await req<Job[]>('/api/jobs', undefined, 8000)
    if (jobs && jobs.length) {
      cacheJobs(jobs)
      return jobs
    }
    return null
  } catch {
    return null
  }
}

/** Run a live job search + AI scoring. Returns scored jobs, or null on failure. */
export async function searchJobs(opts: { query?: string; location?: string; scoreLimit?: number } = {}): Promise<
  { jobs: Job[]; total: number; added: number; scored: number; ai: AIStatus } | null
> {
  try {
    const r = await req<{ jobs: Job[]; total: number; added: number; scored: number; ai: AIStatus }>(
      '/api/jobs/search',
      { method: 'POST', body: JSON.stringify(opts) },
      120000,
    )
    if (r?.jobs) cacheJobs(r.jobs)
    return r
  } catch {
    return null
  }
}

/** Score any unscored jobs already in the store. */
export async function scoreJobs(limit = 12): Promise<{ jobs: Job[]; scored: number } | null> {
  try {
    return await req('/api/jobs/score', { method: 'POST', body: JSON.stringify({ limit }) }, 120000)
  } catch {
    return null
  }
}

export interface InterviewQuestion {
  category: string
  q: string
  tip: string
}

// ─── Pipeline persistence + derived data ─────────────────────

export interface JobPatch {
  status?: string
  saved?: boolean
  skipped?: boolean
  notes?: string
  applied_date?: string
  next_action?: string
  next_action_date?: string
  reminder_date?: string
  reminder_set?: boolean
  checklist?: Record<string, boolean>
}

/** Persist a job's user state (status/saved/notes/...). Returns updated job or null. */
export async function updateJob(id: string, patch: JobPatch): Promise<Job | null> {
  try {
    return await req<Job>(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, 8000)
  } catch {
    return null
  }
}

export interface DashboardStats {
  totalJobs: number
  scoredJobs: number
  newThisWeek: number
  savedJobs: number
  strongMatches: number
  applied: number
  interviewsScheduled: number
  needReview: number
  averageMatchScore: number
  byStatus: Record<string, number>
  deadlines: { jobId: string; title: string; company: string; deadline: string; action: string }[]
  topMatches: Job[]
  activity: { id: string; jobId: string; status: string; title: string; company: string; score: number; timestamp: string }[]
}

export async function getStats(): Promise<DashboardStats | null> {
  try {
    return await req<DashboardStats>('/api/stats', undefined, 8000)
  } catch {
    return null
  }
}

export interface SkillGap {
  skill: string
  count: number
  demand: number
  userLevel: number
  category: 'frontend' | 'backend' | 'devops' | 'systems' | 'architecture'
}

export async function getSkillGaps(): Promise<SkillGap[] | null> {
  try {
    return await req<SkillGap[]>('/api/skill-gaps', undefined, 8000)
  } catch {
    return null
  }
}

export interface SavedDoc {
  id: string
  job_id: string | null
  type: 'cv' | 'cover_letter'
  job_title: string
  company: string
  content: string
  created_at: string
}

export async function getDocuments(): Promise<SavedDoc[] | null> {
  try {
    return await req<SavedDoc[]>('/api/documents', undefined, 8000)
  } catch {
    return null
  }
}

export async function saveDocument(doc: Omit<SavedDoc, 'id' | 'created_at'>): Promise<SavedDoc | null> {
  try {
    return await req<SavedDoc>('/api/documents', { method: 'POST', body: JSON.stringify(doc) }, 8000)
  } catch {
    return null
  }
}

/** Load the candidate profile from the backend (single source of truth).
 *  Pass a track ('tech' | 'construction') to read a specific one; omit for active. */
export async function getProfile(track?: string): Promise<Record<string, unknown> | null> {
  try {
    const q = track ? `?track=${encodeURIComponent(track)}` : ''
    return await req(`/api/profile${q}`, undefined, 8000)
  } catch {
    return null
  }
}

export async function saveProfile(profile: Record<string, unknown>, track?: string): Promise<Record<string, unknown> | null> {
  try {
    const q = track ? `?track=${encodeURIComponent(track)}` : ''
    return await req(`/api/profile${q}`, { method: 'PUT', body: JSON.stringify(profile) }, 8000)
  } catch {
    return null
  }
}

// ─── Career tracks (Software Developer vs Site Operative) ────

export interface CareerTrack {
  id: string
  label: string
  headline: string
  icon: string
}

/** List career tracks + which is active. null if backend down. */
export async function getTracks(): Promise<{ active: string; tracks: CareerTrack[] } | null> {
  try {
    return await req('/api/tracks', undefined, 6000)
  } catch {
    return null
  }
}

/** Switch the active career track (drives search + all AI features). */
export async function setActiveTrack(track: string): Promise<{ active: string; tracks: CareerTrack[] } | null> {
  try {
    return await req('/api/tracks/active', { method: 'POST', body: JSON.stringify({ track }) }, 6000)
  } catch {
    return null
  }
}

/** Generate tailored interview prep for a job. Throws on failure (caller keeps mock). */
export async function interviewPrep(job: Partial<Job>): Promise<{
  questions: InterviewQuestion[]
  fallback?: boolean
  ai: AIStatus
}> {
  return req('/api/interview/prep', { method: 'POST', body: JSON.stringify({ job }) }, 90000)
}

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Chat with the AI career coach (grounded in profile + live pipeline). */
export async function coachChat(messages: CoachMessage[]): Promise<{ text: string; fallback?: boolean; ai: AIStatus }> {
  return req('/api/coach', { method: 'POST', body: JSON.stringify({ messages }) }, 90000)
}

/** Generate a tailored CV or cover letter via the AI. Throws on failure (caller shows fallback). */
export async function tailorDocument(opts: {
  job: Partial<Job>
  type: 'cv' | 'cover_letter'
  tone?: string
  options?: Record<string, unknown>
}): Promise<{ text: string; type: string; fallback?: boolean; ai: AIStatus }> {
  return req('/api/cv/tailor', { method: 'POST', body: JSON.stringify(opts) }, 90000)
}
