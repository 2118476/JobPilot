// ─────────────────────────────────────────────────────────────
// index.js — JobPilot AI backend
//   GET  /api/health
//   GET  /api/profile           PUT /api/profile
//   GET  /api/jobs
//   POST /api/jobs/search       { query?, location?, scoreLimit? }
//   POST /api/jobs/score        { limit? }   (score any unscored jobs)
//   POST /api/cv/tailor         { job, type: 'cv'|'cover_letter', tone?, options? }
// ─────────────────────────────────────────────────────────────
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') })
import express from 'express'
import cors from 'cors'
import { getProfile, saveProfile, getJobs, saveJobs, getDocuments, saveDocuments, getActiveTrack, setActiveTrack, listTracks } from './store.js'
import { aiStatus, scoreJob, tailorDocument, interviewPrep, coachReply } from './ai.js'
import { requireAuth } from './auth.js'
import { supabaseConfigured } from './supabaseAdmin.js'
import { rateLimit } from './rateLimit.js'
import { runSearch } from './searchRunner.js'
import { notifyStrongMatches } from './email.js'
import { startScheduler } from './scheduler.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/api', rateLimit)

const PORT = process.env.PORT || 8787

// Run async jobs with a small concurrency cap (protects free-tier rate limits)
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return out
}

function attachAnalysis(job, s) {
  job.match_score = s.overall_score
  job.match_analysis = {
    id: `ma-${job.id}`,
    job_id: job.id,
    overall_score: s.overall_score,
    skill_match_score: s.skill_match_score,
    experience_match_score: s.experience_match_score,
    location_match_score: s.location_match_score,
    salary_match_score: s.salary_match_score,
    explanation: s.explanation,
    matched_skills: s.matched_skills,
    missing_skills: s.missing_skills,
    skill_gaps: (s.missing_skills || []).map((skill) => ({
      skill,
      required_level: 'intermediate',
      user_level: 'beginner',
      gap_description: `Strengthen ${skill} to be a stronger match`,
    })),
    created_at: new Date().toISOString(),
  }
  job.updated_at = new Date().toISOString()
  return job
}

const byScore = (a, b) => (b.match_score || 0) - (a.match_score || 0)

// ─── Health ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: aiStatus(), auth: supabaseConfigured() ? 'supabase' : 'local' })
})

// ─── Career tracks (tech vs construction site operative) ─────
// The active track drives which profile every AI feature uses.
app.get('/api/tracks', requireAuth, async (req, res) => {
  res.json({ active: await getActiveTrack(req.userId), tracks: listTracks() })
})
app.post('/api/tracks/active', requireAuth, async (req, res) => {
  const active = await setActiveTrack(req.userId, req.body?.track)
  res.json({ active, tracks: listTracks() })
})

// ─── Profile ─────────────────────────────────────────────────
// Optional ?track=tech|construction to read/write a specific track;
// omitted = the active track.
app.get('/api/profile', requireAuth, async (req, res) => {
  res.json(await getProfile(req.userId, req.query?.track))
})
app.put('/api/profile', requireAuth, async (req, res) => {
  const saved = await saveProfile(req.userId, req.body || {}, req.query?.track)
  res.json(saved)
})

// ─── Jobs ────────────────────────────────────────────────────
app.get('/api/jobs', requireAuth, async (req, res) => {
  const jobs = await getJobs(req.userId)
  res.json(jobs.sort(byScore))
})

app.post('/api/jobs/search', requireAuth, async (req, res) => {
  try {
    const r = await runSearch(req.userId, {
      query: req.body?.query,
      location: req.body?.location || 'London, UK',
      scoreLimit: req.body?.scoreLimit ?? 15,
    })
    // Email a digest of newly-found strong matches (no-op unless email is configured).
    notifyStrongMatches(r.newlyScored).catch(() => {})
    res.json({
      total: r.total,
      fetched: r.fetched,
      added: r.added,
      scored: r.scored,
      ai: aiStatus(),
      jobs: r.jobs.sort(byScore),
    })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.post('/api/jobs/score', requireAuth, async (req, res) => {
  try {
    const userId = req.userId
    const profile = await getProfile(userId)
    const limit = Math.min(req.body?.limit ?? 12, 20)
    const jobs = await getJobs(userId)
    const unscored = jobs.filter((j) => !j.match_analysis).slice(0, limit)
    await mapLimit(unscored, 2, async (job) => attachAnalysis(job, await scoreJob(profile, job)))
    await saveJobs(userId, jobs)
    res.json({ scored: unscored.length, jobs: jobs.sort(byScore) })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── CV / cover-letter tailoring ─────────────────────────────
app.post('/api/cv/tailor', requireAuth, async (req, res) => {
  try {
    const { job, type = 'cv', tone, options } = req.body || {}
    if (!job || !job.title) return res.status(400).json({ error: 'job (with title) is required' })
    const profile = await getProfile(req.userId)
    const docType = type === 'cl' || type === 'cover_letter' ? 'cover_letter' : 'cv'
    const result = await tailorDocument(profile, job, docType, { tone, ...(options || {}) })
    res.json({ type: docType, ...result, ai: aiStatus() })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── Pipeline: update a job's user state ─────────────────────
const USER_FIELDS = ['status', 'saved', 'skipped', 'notes', 'applied_date', 'next_action', 'next_action_date', 'reminder_date', 'reminder_set', 'checklist']

app.patch('/api/jobs/:id', requireAuth, async (req, res) => {
  try {
    const jobs = await getJobs(req.userId)
    const job = jobs.find((j) => j.id === req.params.id)
    if (!job) return res.status(404).json({ error: 'job not found' })
    for (const k of USER_FIELDS) {
      if (k in (req.body || {})) job[k] = req.body[k]
    }
    job.updated_at = new Date().toISOString()
    await saveJobs(req.userId, jobs)
    res.json(job)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── Add a job manually (used by the browser extension + manual add) ─────────
app.post('/api/jobs/manual', requireAuth, async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.title) return res.status(400).json({ error: 'title is required' })
    const profile = await getProfile(req.userId)
    const job = {
      user_id: 'user-001',
      id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: String(b.title).slice(0, 200),
      company: b.company || 'Unknown',
      location: b.location || 'Unknown',
      remote_type: b.remote_type || 'unknown',
      salary_min: b.salary_min || undefined,
      salary_max: b.salary_max || undefined,
      salary_currency: 'GBP',
      description: String(b.description || '').slice(0, 6000),
      requirements: [],
      responsibilities: [],
      job_type: 'full_time',
      status: 'new',
      match_score: 0,
      source: b.source || 'Manual',
      source_url: b.source_url || '',
      posted_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    attachAnalysis(job, await scoreJob(profile, job))
    const jobs = await getJobs(req.userId)
    jobs.unshift(job)
    await saveJobs(req.userId, jobs)
    res.json({ job })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── Derived dashboard stats ─────────────────────────────────
const APPLIED_STATUSES = ['applied', 'interview', 'technical_test', 'offer']

function computeStats(jobs) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const scored = jobs.filter((j) => j.match_analysis)
  const byStatus = {}
  for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1
  const avg = scored.length ? Math.round(scored.reduce((s, j) => s + (j.match_score || 0), 0) / scored.length) : 0
  const deadlines = jobs
    .filter((j) => j.next_action_date && new Date(j.next_action_date).getTime() >= Date.now() - 86400000)
    .map((j) => ({ jobId: j.id, title: j.title, company: j.company, deadline: j.next_action_date, action: j.next_action || 'Action due' }))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 6)
  const topMatches = [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0)).slice(0, 6)
  const activity = [...jobs]
    .filter((j) => j.match_analysis || j.status !== 'new')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 8)
    .map((j) => ({ id: `act-${j.id}`, jobId: j.id, status: j.status, title: j.title, company: j.company, score: j.match_score, timestamp: j.updated_at }))
  return {
    totalJobs: jobs.length,
    scoredJobs: scored.length,
    newThisWeek: jobs.filter((j) => new Date(j.created_at).getTime() >= weekAgo).length,
    savedJobs: jobs.filter((j) => j.status === 'saved' || j.saved).length,
    strongMatches: jobs.filter((j) => (j.match_score || 0) >= 85).length,
    applied: jobs.filter((j) => APPLIED_STATUSES.includes(j.status)).length,
    interviewsScheduled: jobs.filter((j) => j.status === 'interview').length,
    needReview: jobs.filter((j) => j.status === 'new' && (j.match_score || 0) >= 70).length,
    averageMatchScore: avg,
    byStatus,
    deadlines,
    topMatches,
    activity,
  }
}

app.get('/api/stats', requireAuth, async (req, res) => {
  res.json(computeStats(await getJobs(req.userId)))
})

// ─── Derived skill gaps (from AI missing_skills across jobs) ──
function categorizeSkill(s) {
  const t = s.toLowerCase()
  if (/(react|frontend|css|tailwind|typescript|next|vue|angular|ui|accessib)/.test(t)) return 'frontend'
  if (/(aws|azure|docker|kubernetes|k8s|ci\/cd|cd|cloud|devops|terraform|render)/.test(t)) return 'devops'
  if (/(system design|architecture|microservice|scal|distributed)/.test(t)) return 'architecture'
  if (/(c\+\+|rust|go\b|embedded|kernel|systems)/.test(t)) return 'systems'
  return 'backend'
}

app.get('/api/skill-gaps', requireAuth, async (req, res) => {
  const jobs = await getJobs(req.userId)
  const profile = await getProfile(req.userId)
  const have = new Set(
    Object.values(profile.skills || {}).flat().map((s) => s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase()),
  )
  const counts = {}
  for (const j of jobs) {
    for (const s of j.match_analysis?.missing_skills || []) {
      const key = s.trim()
      if (key) counts[key] = (counts[key] || 0) + 1
    }
  }
  const max = Math.max(1, ...Object.values(counts))
  const gaps = Object.entries(counts)
    .map(([skill, count]) => ({
      skill,
      count,
      demand: Math.round((count / max) * 100),
      userLevel: have.has(skill.toLowerCase()) ? 55 : 15,
      category: categorizeSkill(skill),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
  res.json(gaps)
})

// ─── Saved documents (generated CVs / cover letters) ─────────
app.get('/api/documents', requireAuth, async (req, res) => {
  res.json(await getDocuments(req.userId))
})

app.post('/api/documents', requireAuth, async (req, res) => {
  try {
    const { job_id, type, content, job_title, company } = req.body || {}
    if (!content) return res.status(400).json({ error: 'content required' })
    const docs = await getDocuments(req.userId)
    const doc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      job_id: job_id || null,
      type: type === 'cover_letter' || type === 'cl' ? 'cover_letter' : 'cv',
      job_title: job_title || '',
      company: company || '',
      content,
      created_at: new Date().toISOString(),
    }
    docs.unshift(doc)
    await saveDocuments(req.userId, docs.slice(0, 200))
    res.json(doc)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── Interview prep ──────────────────────────────────────────
app.post('/api/interview/prep', requireAuth, async (req, res) => {
  try {
    const { job } = req.body || {}
    if (!job || !job.title) return res.status(400).json({ error: 'job (with title) is required' })
    const profile = await getProfile(req.userId)
    const result = await interviewPrep(profile, job)
    res.json({ ...result, ai: aiStatus() })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─── AI Career Coach ─────────────────────────────────────────
app.post('/api/coach', requireAuth, async (req, res) => {
  try {
    const profile = await getProfile(req.userId)
    const jobs = await getJobs(req.userId)
    const stats = computeStats(jobs)
    const result = await coachReply(profile, req.body?.messages || [], { stats, topJobs: stats.topMatches })
    res.json({ ...result, ai: aiStatus() })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.listen(PORT, () => {
  const ai = aiStatus()
  console.log(`\n  JobPilot AI backend → http://localhost:${PORT}`)
  console.log(`  AI provider: ${ai.provider} (${ai.model}) — ${ai.live ? 'LIVE' : 'heuristic fallback'}`)
  console.log(`  Storage: ${supabaseConfigured() ? 'Supabase Postgres (multi-user auth)' : 'local JSON files (single user)'}`)
  startScheduler()
  console.log('')
})
