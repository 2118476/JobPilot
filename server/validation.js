// ─────────────────────────────────────────────────────────────
// validation.js — zod request-body validation for the API.
// Rejects malformed input with a 400 before it reaches handlers/AI.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod'

const shortStr = (max = 200) => z.string().trim().max(max)
const optionalDate = z.union([
  z.string().trim().datetime({ offset: true }),
  z.string().trim().date(),
  z.literal(''),
  z.null(),
]).optional()
const profileItem = z.object({}).passthrough()

export const schemas = {
  profile: z.object({
    full_name: shortStr(160).optional(),
    email: z.union([z.string().trim().email().max(320), z.literal('')]).optional(),
    phone: shortStr(80).optional(),
    website: shortStr(2000).optional(),
    linkedin: shortStr(2000).optional(),
    github: shortStr(2000).optional(),
    location: shortStr(240).optional(),
    headline: shortStr(300).optional(),
    summary: z.string().trim().max(5000).optional(),
    education: z.array(profileItem).max(100).optional(),
    experience: z.array(profileItem).max(100).optional(),
    skills: z.union([z.record(z.string().max(100), z.unknown()), z.array(profileItem).max(300)]).optional(),
    projects: z.array(profileItem).max(200).optional(),
    preferences: z.object({}).passthrough().optional(),
    goals: z.string().trim().max(5000).optional(),
    skills_to_learn: z.array(shortStr(160)).max(200).optional(),
    additional: z.record(z.string().max(100), z.unknown()).optional(),
    track: z.enum(['tech', 'construction']).optional(),
  }).passthrough(),

  searchBody: z.object({
    query: shortStr(200).optional(),
    location: shortStr(120).optional(),
    scoreLimit: z.number().int().min(1).max(25).optional(),
  }),

  manualJob: z.object({
    title: shortStr(200).min(1, 'title is required'),
    company: shortStr(160).optional(),
    location: shortStr(160).optional(),
    description: z.string().max(20000).optional(),
    source: shortStr(60).optional(),
    source_url: z.union([z.string().trim().url().max(2000), z.literal('')]).optional(),
    remote_type: z.enum(['remote', 'hybrid', 'onsite', 'unknown']).optional(),
    salary_min: z.number().int().min(0).max(10000000).optional(),
    salary_max: z.number().int().min(0).max(10000000).optional(),
  }),

  tailor: z.object({
    job: z.object({ title: shortStr(200).min(1) }).passthrough(),
    type: z.enum(['cv', 'cl', 'cover_letter']).optional(),
    tone: shortStr(40).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
  }),

  interviewPrep: z.object({
    job: z.object({ title: shortStr(200).min(1) }).passthrough(),
  }),

  coach: z.object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(4000),
        }),
      )
      .max(24)
      .optional(),
  }),

  scoreJobs: z.object({
    limit: z.number().int().min(1).max(20).optional(),
  }),

  jobPatch: z.object({
    status: z.enum(['new', 'saved', 'cv_drafted', 'cl_drafted', 'ready_to_apply', 'applied', 'interview', 'technical_test', 'rejected', 'offer', 'closed', 'withdrawn', 'skipped']).optional(),
    saved: z.boolean().optional(),
    skipped: z.boolean().optional(),
    notes: z.string().trim().max(10000).optional(),
    applied_date: optionalDate,
    next_action: shortStr(500).optional(),
    next_action_date: optionalDate,
    reminder_date: optionalDate,
    reminder_set: z.boolean().optional(),
    checklist: z.record(z.string().max(120), z.boolean()).optional(),
  }),

  coachProfileUpdate: z.object({
    track: z.enum(['tech', 'construction']),
    profile_update: z.object({
      summary: z.string().trim().max(1200).optional(),
      changes: z.record(z.string(), z.unknown()),
    }),
  }),

  document: z.object({
    job_id: shortStr(120).nullish(),
    type: z.enum(['cv', 'cl', 'cover_letter']).optional(),
    job_title: shortStr(200).optional(),
    company: shortStr(160).optional(),
    content: z.string().min(1, 'content required').max(100000),
  }),

  searchSettings: z.object({
    enabled: z.boolean().optional(),
    query: shortStr(200).optional(),
    location: shortStr(120).optional(),
    min_score_alert: z.number().int().min(0).max(100).optional(),
    email_alerts: z.boolean().optional(),
    alert_email: z.union([z.string().trim().email(), z.literal('')]).optional(),
    frequency: z.enum(['twice_daily', 'daily', 'manual']).optional(),
    keywords: z.array(shortStr(100)).max(40).optional(),
    exclusions: z.array(shortStr(100)).max(40).optional(),
    excluded_companies: z.array(shortStr(160)).max(100).optional(),
    excluded_titles: z.array(shortStr(160)).max(100).optional(),
    preferred_locations: z.array(shortStr(160)).max(25).optional(),
    remote_preference: z.enum(['remote', 'onsite', 'hybrid', 'no_preference']).optional(),
    salary_min: z.number().int().min(0).max(10000000).optional(),
    salary_max: z.number().int().min(0).max(10000000).optional(),
    currency: z.enum(['GBP', 'EUR', 'USD']).optional(),
    morning_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    evening_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    daily_search_limit: z.number().int().min(1).max(100).optional(),
    sources: z.array(shortStr(40)).max(20).optional(),
    seniority_levels: z.array(shortStr(60)).max(20).optional(),
    role_types: z.array(shortStr(60)).max(20).optional(),
    work_arrangements: z.array(shortStr(60)).max(10).optional(),
    date_posted_days: z.number().int().min(1).max(90).optional(),
    job_titles: z.array(shortStr(160)).max(40).optional(),
  }),

  track: z.object({ track: z.enum(['tech', 'construction']) }),

  jobChat: z.object({
    messages: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) }))
      .min(1)
      .max(20),
    includeOriginalPage: z.boolean().optional(),
    detail: z.boolean().optional(),
  }),
}

/** Express middleware: validate req.body against a schema (replaces body with parsed data). */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const detail = result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ')
      return res.status(400).json({ error: `Invalid request — ${detail}` })
    }
    req.body = result.data
    next()
  }
}
