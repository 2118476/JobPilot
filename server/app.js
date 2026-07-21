// ─────────────────────────────────────────────────────────────
// app.js — the JobPilot API (exported for tests; index.js serves it).
// Auth: every route except /api/health requires auth (see auth.js).
// All data access is scoped to req.userId. Request bodies are
// zod-validated; AI endpoints have stricter rate limits and require
// real saved data so nothing is ever invented. Job-specific generation
// requires a completed profile; the general coach can also help a new user
// get started when their profile is still blank.
// ─────────────────────────────────────────────────────────────
import './config.js'
import express from 'express'
import cors from 'cors'
import {
  getProfile, saveProfile, getJobs, saveJobs, getDocuments, saveDocuments, deleteDocument,
  getActiveTrack, setActiveTrack, listTracks, profileReady,
  getSearchSettings, saveSearchSettings, exportUserData, importUserData, deleteUserData,
} from './store.js'
import { aiStatus, scoreJob, tailorDocument, interviewPrep, coachReply } from './ai.js'
import { mergeCoachProfileUpdate, sanitizeCoachProfileUpdate } from './profileUpdate.js'
import { requireAuth } from './auth.js'
import { supabaseConfigured } from './supabaseAdmin.js'
import { rateLimit, aiRateLimit } from './rateLimit.js'
import { runSearch, attachAnalysis } from './searchRunner.js'
import { notifyStrongMatches } from './email.js'
import { validate, schemas } from './validation.js'
import multer from 'multer'
import { jobChat } from './services/jobAssistantService.js'
import { fetchJobPage } from './services/jobPageExtractor.js'
import { extractTextFromUpload, runCvExtraction } from './services/cvImportService.js'

export function createApp() {
  const app = express()

  // ── CORS: lock to configured origins in production ──
  const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  app.use(cors(origins.length ? { origin: origins } : {}))

  // ── Minimal security headers ──
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('X-Frame-Options', 'DENY')
    res.set('Referrer-Policy', 'no-referrer')
    if (process.env.NODE_ENV === 'production') {
      res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
    }
    next()
  })

  app.use(express.json({ limit: '2mb' }))
  app.use('/api', rateLimit)

  // Run async jobs with a small concurrency cap (protects free-tier rate limits)
  async function mapLimit(items, limit, fn) {
    let i = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        await fn(items[idx], idx)
      }
    })
    await Promise.all(workers)
  }

  const byScore = (a, b) => (b.match_score || 0) - (a.match_score || 0)

  const PROFILE_INCOMPLETE = {
    error: 'Complete your profile first — JobPilot only uses your real saved details and never invents anything.',
    code: 'PROFILE_INCOMPLETE',
  }

  // ─── Health (the only unauthenticated route) ───────────────
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ai: aiStatus(), auth: supabaseConfigured() ? 'supabase' : 'local' })
  })

  // ─── Career tracks ──────────────────────────────────────────
  app.get('/api/tracks', requireAuth, async (req, res) => {
    res.json({ active: await getActiveTrack(req.userId), tracks: listTracks() })
  })
  app.post('/api/tracks/active', requireAuth, validate(schemas.track), async (req, res) => {
    const active = await setActiveTrack(req.userId, req.body.track)
    res.json({ active, tracks: listTracks() })
  })

  // ─── Profile ─────────────────────────────────────────────────
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

  app.post('/api/jobs/search', requireAuth, aiRateLimit, validate(schemas.searchBody), async (req, res) => {
    try {
      const profile = await getProfile(req.userId)
      // A search needs either a completed profile or an explicit query.
      if (!req.body.query && !profileReady(profile) && !(profile.preferences?.titles?.length)) {
        return res.status(422).json(PROFILE_INCOMPLETE)
      }
      const r = await runSearch(req.userId, {
        query: req.body.query,
        location: req.body.location || profile.preferences?.locations?.[0] || 'UK',
        scoreLimit: req.body.scoreLimit ?? 15,
      })
      notifyStrongMatches(r.newlyScored).catch(() => {})
      res.json({ total: r.total, fetched: r.fetched, added: r.added, scored: r.scored, ai: aiStatus(), jobs: r.jobs.sort(byScore) })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  app.post('/api/jobs/score', requireAuth, aiRateLimit, async (req, res) => {
    try {
      const userId = req.userId
      const profile = await getProfile(userId)
      if (!profileReady(profile)) return res.status(422).json(PROFILE_INCOMPLETE)
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

  // ─── Add a job manually (browser extension + manual add) ────
  app.post('/api/jobs/manual', requireAuth, validate(schemas.manualJob), async (req, res) => {
    try {
      const b = req.body
      const profile = await getProfile(req.userId)
      const job = {
        user_id: req.userId,
        id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: b.title,
        company: b.company || 'Unknown',
        location: b.location || 'Unknown',
        remote_type: b.remote_type || 'unknown',
        salary_min: b.salary_min || undefined,
        salary_max: b.salary_max || undefined,
        salary_currency: 'GBP',
        description: (b.description || '').slice(0, 6000),
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
      if (profileReady(profile)) attachAnalysis(job, await scoreJob(profile, job))
      const jobs = await getJobs(req.userId)
      jobs.unshift(job)
      await saveJobs(req.userId, jobs)
      res.json({ job })
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

  // ─── Derived skill gaps ──────────────────────────────────────
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
        if (!key) continue
        const entry = counts[key] || { count: 0, blocking: 0, jobs: [] }
        entry.count++
        if ((j.match_score || 0) >= 70) entry.blocking++
        if (entry.jobs.length < 5 && !entry.jobs.includes(j.title)) entry.jobs.push(j.title)
        counts[key] = entry
      }
    }
    const max = Math.max(1, ...Object.values(counts).map((entry) => entry.count))
    const gaps = Object.entries(counts)
      .map(([skill, entry]) => ({
        skill,
        count: entry.count,
        blocking: entry.blocking,
        jobs: entry.jobs,
        demand: Math.round((entry.count / max) * 100),
        userLevel: have.has(skill.toLowerCase()) ? 55 : 15,
        category: categorizeSkill(skill),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
    res.json(gaps)
  })

  // ─── Saved documents ─────────────────────────────────────────
  app.get('/api/documents', requireAuth, async (req, res) => {
    res.json(await getDocuments(req.userId))
  })

  app.post('/api/documents', requireAuth, validate(schemas.document), async (req, res) => {
    try {
      const { job_id, type, content, job_title, company } = req.body
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

  app.delete('/api/documents/:id', requireAuth, async (req, res) => {
    try {
      await deleteDocument(req.userId, req.params.id)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  // ─── CV / cover-letter tailoring ─────────────────────────────
  app.post('/api/cv/tailor', requireAuth, aiRateLimit, validate(schemas.tailor), async (req, res) => {
    try {
      const { job, type = 'cv', tone, options } = req.body
      const profile = await getProfile(req.userId)
      if (!profileReady(profile)) return res.status(422).json(PROFILE_INCOMPLETE)
      const docType = type === 'cl' || type === 'cover_letter' ? 'cover_letter' : 'cv'
      const result = await tailorDocument(profile, job, docType, { tone, ...(options || {}) })
      res.json({ type: docType, ...result, ai: aiStatus() })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  // ─── Interview prep ──────────────────────────────────────────
  app.post('/api/interview/prep', requireAuth, aiRateLimit, validate(schemas.interviewPrep), async (req, res) => {
    try {
      const profile = await getProfile(req.userId)
      if (!profileReady(profile)) return res.status(422).json(PROFILE_INCOMPLETE)
      const result = await interviewPrep(profile, req.body.job)
      res.json({ ...result, ai: aiStatus() })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  // ─── AI Career Coach ─────────────────────────────────────────
  app.post('/api/coach', requireAuth, aiRateLimit, validate(schemas.coach), async (req, res) => {
    try {
      const [activeTrack, profile, jobs, documents] = await Promise.all([
        getActiveTrack(req.userId),
        getProfile(req.userId),
        getJobs(req.userId),
        getDocuments(req.userId),
      ])
      const stats = computeStats(jobs)
      const result = await coachReply(profile, req.body.messages || [], {
        activeTrack,
        stats,
        topJobs: stats.topMatches,
        documents,
      })
      const proposal = sanitizeCoachProfileUpdate(result.profile_update)
      res.json({
        ...result,
        profile_update: proposal ? { ...proposal, track: activeTrack } : null,
        ai: aiStatus(),
      })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  // ─── Job-specific AI assistant ───────────────────────────────
  // Chat about ONE job. The job is resolved from the AUTHENTICATED user's
  // own store — a job id belonging to someone else simply returns 404.
  app.post('/api/coach/profile-update', requireAuth, validate(schemas.coachProfileUpdate), async (req, res) => {
    try {
      const track = req.body.track
      const current = await getProfile(req.userId, track)
      const { profile, proposal } = mergeCoachProfileUpdate(current, req.body.profile_update, track)
      const saved = await saveProfile(req.userId, profile, track)
      res.json({ ok: true, track, summary: proposal.summary, profile: saved })
    } catch (e) {
      res.status(422).json({ error: String(e.message || 'This profile update could not be applied.') })
    }
  })

  app.post('/api/assistant/jobs/:jobId/chat', requireAuth, aiRateLimit, validate(schemas.jobChat), async (req, res) => {
    try {
      const jobs = await getJobs(req.userId)
      const job = jobs.find((j) => j.id === req.params.jobId)
      if (!job) return res.status(404).json({ error: 'Job not found in your account.' })

      const [profile, documents] = await Promise.all([getProfile(req.userId), getDocuments(req.userId)])

      // Optionally fetch the ORIGINAL public listing (SSRF-protected).
      let pageText = null
      let pageNote = null
      if (req.body.includeOriginalPage && job.source_url) {
        try {
          pageText = await fetchJobPage(job.source_url)
        } catch (e) {
          pageNote = `Original listing could not be read (${e.message}); using the stored description instead.`
        }
      }

      const result = await jobChat({
        job,
        profile,
        documents,
        messages: req.body.messages,
        pageText,
        detail: !!req.body.detail,
      })
      if (pageNote) result.message.content = `${result.message.content}\n\n(${pageNote})`
      res.json(result)
    } catch (e) {
      res.status(500).json({ error: 'The assistant could not answer right now — please try again.' , detail: String(e.message || '').slice(0, 120) })
    }
  })

  // ─── CV upload → profile extraction PREVIEW ──────────────────
  // Returns extracted data for the user to review/edit. NOTHING is saved
  // here — the profile is only written when the user approves via the
  // normal authenticated PUT /api/profile.
  const cvUpload = multer({
    storage: multer.memoryStorage(), // never written to disk — nothing to clean up or leak
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  })
  app.post('/api/profile/import-cv', requireAuth, aiRateLimit, (req, res) => {
    cvUpload.single('cv')(req, res, async (err) => {
      try {
        if (err) {
          const tooBig = err.code === 'LIMIT_FILE_SIZE'
          return res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'File too large — maximum size is 8 MB.' : 'Upload failed — please try again.' })
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded — attach a PDF or DOCX CV as "cv".' })
        const { text } = await extractTextFromUpload(req.file.buffer, req.file.mimetype, req.file.originalname || '')
        const result = await runCvExtraction(text)
        res.json(result)
      } catch (e) {
        const msg = String(e.message || 'Could not process this file.')
        res.status(/unsupported file type/i.test(msg) ? 415 : 422).json({ error: msg })
      }
    })
  })

  // ─── Search automation settings (per user) ───────────────────
  app.get('/api/search-settings', requireAuth, async (req, res) => {
    res.json(await getSearchSettings(req.userId))
  })
  app.put('/api/search-settings', requireAuth, validate(schemas.searchSettings), async (req, res) => {
    try {
      const current = await getSearchSettings(req.userId)
      const saved = await saveSearchSettings(req.userId, { ...current, ...req.body })
      res.json(saved)
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  // ─── Own-data export / deletion (privacy) ────────────────────
  app.get('/api/export', requireAuth, async (req, res) => {
    try {
      res.json(await exportUserData(req.userId))
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })
  app.post('/api/import', requireAuth, async (req, res) => {
    try {
      const archive = req.body?.archive || req.body
      const result = await importUserData(req.userId, archive, { replace: req.body?.replace === true })
      res.json(result)
    } catch (e) {
      res.status(422).json({ error: String(e.message || 'Invalid JobPilot archive.') })
    }
  })
  app.delete('/api/data', requireAuth, async (req, res) => {
    try {
      await deleteUserData(req.userId)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ error: String(e.message || e) })
    }
  })

  return app
}
