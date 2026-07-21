// ─────────────────────────────────────────────────────────────
// api.ts — client for the JobPilot AI backend.
// Every call fails soft (returns null / throws caught) so the UI
// returns explicit empty states for new accounts and null on transport errors.
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
  _jobCache = Array.isArray(jobs) ? jobs : []
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

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
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
    const body = await res.json().catch(() => null) as ({ error?: string; code?: string } & T) | null
    if (!res.ok) {
      throw new ApiError(body?.error || `${res.status} ${res.statusText}`, res.status, body?.code)
    }
    return body as T
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

/** Stored jobs (already scored). Empty array means a genuinely empty account. */
export async function getJobs(): Promise<Job[] | null> {
  try {
    const jobs = await req<Job[]>('/api/jobs', undefined, 8000)
    cacheJobs(jobs || [])
    return jobs || []
  } catch {
    return null
  }
}

export interface JobSearchResult { jobs: Job[]; total: number; added: number; scored: number; ai: AIStatus }

/** Run a live search and preserve API errors for screens that need actionable feedback. */
export async function searchJobsStrict(opts: { query?: string; location?: string; scoreLimit?: number } = {}): Promise<JobSearchResult> {
  const r = await req<JobSearchResult>(
      '/api/jobs/search',
      { method: 'POST', body: JSON.stringify(opts) },
      120000,
  )
  if (r?.jobs) cacheJobs(r.jobs)
  return r
}

/** Run a live job search + AI scoring. Returns scored jobs, or null on failure. */
export async function searchJobs(opts: { query?: string; location?: string; scoreLimit?: number } = {}): Promise<JobSearchResult | null> {
  try {
    return await searchJobsStrict(opts)
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
  blocking: number
  jobs: string[]
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

/** Permanently delete a saved CV/cover letter. Returns false if backend unreachable. */
export async function deleteDocument(id: string): Promise<boolean> {
  try {
    await req(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }, 8000)
    return true
  } catch {
    return false
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

// ─── Job-specific AI assistant ────────────────────────────────

export interface AssistantCitation { type: string; id: string; label: string }
export interface AssistantAction { type: string; label: string; requiresConfirmation?: boolean }
export interface JobChatResult {
  message: { role: 'assistant'; content: string }
  citations: AssistantCitation[]
  suggestedActions: AssistantAction[]
  ai: AIStatus
  fallback?: boolean
}

/** Chat about ONE of the user's own jobs. Throws on failure (caller shows error). */
export async function jobChat(
  jobId: string,
  messages: CoachMessage[],
  opts: { includeOriginalPage?: boolean; detail?: boolean } = {},
): Promise<JobChatResult> {
  return req(`/api/assistant/jobs/${encodeURIComponent(jobId)}/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages, ...opts }),
  }, 90000)
}

// ─── CV import (profile extraction preview) ───────────────────

export interface CvExtractionResult {
  profile: Record<string, unknown>
  fieldMetadata: Record<string, { confidence: number; sourceText: string }>
  missingFields: string[]
  warnings: string[]
  suggestedTrack: 'tech' | 'construction'
  ai: AIStatus
}

/** Upload a CV (PDF/DOCX) and get an extraction PREVIEW. Nothing is saved. */
export async function importCv(file: File): Promise<CvExtractionResult> {
  const auth = await authHeader()
  const form = new FormData()
  form.append('cv', file)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 90000)
  try {
    const res = await fetch(`${BASE}/api/profile/import-cv`, {
      method: 'POST',
      body: form,
      headers: auth, // no Content-Type — the browser sets the multipart boundary
      signal: ctrl.signal,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`)
    return body as CvExtractionResult
  } finally {
    clearTimeout(timer)
  }
}

// ─── Own-data export / deletion (privacy) ─────────────────────

/** Download-ready export of everything the current user has stored. */
export async function exportData(): Promise<Record<string, unknown> | null> {
  try {
    return await req('/api/export', undefined, 15000)
  } catch {
    return null
  }
}

export interface ManualJobInput {
  title: string
  company?: string
  location?: string
  description?: string
  source?: string
  source_url?: string
  remote_type?: Job['remote_type']
  salary_min?: number
  salary_max?: number
}

export async function analyzeManualJob(input: ManualJobInput): Promise<Job> {
  const result = await req<{ job: Job }>('/api/jobs/manual/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.job
}

export async function createManualJob(input: ManualJobInput): Promise<Job> {
  const result = await req<{ job: Job }>('/api/jobs/manual', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  _jobCache = [result.job, ..._jobCache.filter((job) => job.id !== result.job.id)]
  return result.job
}

export interface ImportResult {
  ok: boolean
  profiles: number
  jobs: number
  documents: number
  active_track: string
}

/** Restore a JobPilot workspace into the currently authenticated account only. */
export async function importData(archive: Record<string, unknown>, replace = false): Promise<ImportResult> {
  return req<ImportResult>('/api/import', {
    method: 'POST',
    body: JSON.stringify({ archive, replace }),
  }, 120000)
}

/** Permanently delete ALL of the current user's stored data on the backend. */
export async function deleteAllData(): Promise<boolean> {
  try {
    await req('/api/data', { method: 'DELETE' }, 15000)
    return true
  } catch {
    return false
  }
}

// ─── Per-user search automation settings ─────────────────────

export interface AutomationSettings {
  enabled: boolean
  query: string
  location: string
  min_score_alert: number
  email_alerts: boolean
  alert_email: string
  frequency: 'twice_daily' | 'daily' | 'manual'
  keywords?: string[]
  exclusions?: string[]
  excluded_companies?: string[]
  excluded_titles?: string[]
  preferred_locations?: string[]
  remote_preference?: 'remote' | 'onsite' | 'hybrid' | 'no_preference'
  salary_min?: number
  salary_max?: number
  currency?: string
  morning_time?: string
  evening_time?: string
  daily_search_limit?: number
  sources?: string[]
  seniority_levels?: string[]
  role_types?: string[]
  work_arrangements?: string[]
  date_posted_days?: number
  job_titles?: string[]
}

export async function getAutomationSettings(): Promise<AutomationSettings | null> {
  try {
    return await req<AutomationSettings>('/api/search-settings', undefined, 8000)
  } catch {
    return null
  }
}

export async function saveAutomationSettings(s: Partial<AutomationSettings>): Promise<AutomationSettings | null> {
  try {
    return await req<AutomationSettings>('/api/search-settings', { method: 'PUT', body: JSON.stringify(s) }, 8000)
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

/** Generate tailored interview prep for a job. Throws on failure so the caller can show a retry state. */
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

export interface CoachProfileUpdate {
  summary: string
  track: 'tech' | 'construction'
  changes: Record<string, unknown>
}

export interface CoachResult {
  text: string
  profile_update?: CoachProfileUpdate | null
  fallback?: boolean
  ai: AIStatus
}

/** Chat with the AI career coach (grounded in profile + live pipeline). */
export async function coachChat(messages: CoachMessage[]): Promise<CoachResult> {
  return req('/api/coach', { method: 'POST', body: JSON.stringify({ messages }) }, 90000)
}

export async function confirmCoachProfileUpdate(profileUpdate: CoachProfileUpdate): Promise<{
  ok: boolean
  track: 'tech' | 'construction'
  summary: string
  profile: Record<string, unknown>
}> {
  return req('/api/coach/profile-update', {
    method: 'POST',
    body: JSON.stringify({ track: profileUpdate.track, profile_update: profileUpdate }),
  }, 15000)
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
