// ─────────────────────────────────────────────────────────────
// validation.js — zod request-body validation for the API.
// Rejects malformed input with a 400 before it reaches handlers/AI.
// ─────────────────────────────────────────────────────────────
import { z } from 'zod'

const shortStr = (max = 200) => z.string().trim().max(max)

export const schemas = {
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
    source_url: shortStr(2000).optional(),
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
