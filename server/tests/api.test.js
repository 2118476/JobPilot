// ─────────────────────────────────────────────────────────────
// api.test.js — backend API tests (local mode, isolated temp data dir).
// Verifies auth scoping, per-user isolation, validation, AI guards,
// and the production configuration guard.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// Isolated environment BEFORE the app (and its dotenv) loads.
process.env.JOBPILOT_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'jobpilot-test-'))
process.env.AI_PROVIDER = 'heuristic' // never call live AI in tests
process.env.OWNER_EMAIL = 'owner@test.local'
process.env.RATE_LIMIT_MAX = '10000'
process.env.RATE_LIMIT_AI_MAX = '10000'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY

const { createApp } = await import('../app.js')
const { assertProductionConfig } = await import('../config.js')
const app = createApp()

// Local-mode mock tokens (base64 {id,email}) — one per fake account.
const tok = (id, email) => 'Bearer ' + Buffer.from(JSON.stringify({ id, email, ts: 1 })).toString('base64')
const USER_A = tok('user-a', 'a@test.local')
const USER_B = tok('user-b', 'b@test.local')

describe('health', () => {
  it('is public and reports local auth mode', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.auth).toBe('local')
  })
})

describe('profile isolation', () => {
  it('new accounts start with a blank profile', async () => {
    const res = await request(app).get('/api/profile').set('Authorization', USER_A)
    expect(res.status).toBe(200)
    expect(res.body.full_name).toBe('')
  })

  it('saving a profile only affects that account', async () => {
    const put = await request(app)
      .put('/api/profile')
      .set('Authorization', USER_A)
      .send({ full_name: 'Alice Test', skills: { Core: ['Testing'] }, preferences: { titles: ['QA Tester'] } })
    expect(put.status).toBe(200)

    const a = await request(app).get('/api/profile').set('Authorization', USER_A)
    expect(a.body.full_name).toBe('Alice Test')

    const b = await request(app).get('/api/profile').set('Authorization', USER_B)
    expect(b.body.full_name).toBe('')
  })
})

describe('manual jobs', () => {
  it('rejects a job without a title', async () => {
    const res = await request(app).post('/api/jobs/manual').set('Authorization', USER_A).send({ company: 'X' })
    expect(res.status).toBe(400)
  })

  it('scopes the job to the authenticated user (no hardcoded ids)', async () => {
    const res = await request(app)
      .post('/api/jobs/manual')
      .set('Authorization', USER_A)
      .send({ title: 'QA Tester', company: 'Acme', description: 'Testing role' })
    expect(res.status).toBe(200)
    expect(res.body.job.user_id).toBe('mock-user-a')
    expect(res.body.job.user_id).not.toBe('user-001')

    const jobsA = await request(app).get('/api/jobs').set('Authorization', USER_A)
    expect(jobsA.body.length).toBe(1)

    const jobsB = await request(app).get('/api/jobs').set('Authorization', USER_B)
    expect(jobsB.body.length).toBe(0)
  })
})

describe('AI guards', () => {
  it('allows the general coach to help before a profile is completed', async () => {
    const res = await request(app)
      .post('/api/coach')
      .set('Authorization', USER_B)
      .send({ messages: [{ role: 'user', content: 'Where should I start?' }] })
    expect(res.status).toBe(200)
    expect(res.body.text).toBeTruthy()
    expect(res.body.fallback).toBe(true)
  })

  it('refuses to generate documents for an incomplete profile', async () => {
    const res = await request(app)
      .post('/api/cv/tailor')
      .set('Authorization', USER_B) // B never completed a profile
      .send({ job: { title: 'Some Job' }, type: 'cv' })
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('PROFILE_INCOMPLETE')
  })

  it('refuses a search with no profile and no query', async () => {
    const res = await request(app).post('/api/jobs/search').set('Authorization', USER_B).send({})
    expect(res.status).toBe(422)
    expect(res.body.code).toBe('PROFILE_INCOMPLETE')
  })
})

describe('documents', () => {
  it('save/list/delete only affect the current user', async () => {
    const created = await request(app)
      .post('/api/documents')
      .set('Authorization', USER_A)
      .send({ type: 'cv', job_title: 'QA Tester', company: 'Acme', content: 'CV BODY' })
    expect(created.status).toBe(200)

    const listA = await request(app).get('/api/documents').set('Authorization', USER_A)
    expect(listA.body.length).toBe(1)
    const listB = await request(app).get('/api/documents').set('Authorization', USER_B)
    expect(listB.body.length).toBe(0)

    const del = await request(app).delete(`/api/documents/${created.body.id}`).set('Authorization', USER_A)
    expect(del.status).toBe(200)
    const after = await request(app).get('/api/documents').set('Authorization', USER_A)
    expect(after.body.length).toBe(0)
  })

  it('rejects a document without content', async () => {
    const res = await request(app).post('/api/documents').set('Authorization', USER_A).send({ type: 'cv' })
    expect(res.status).toBe(400)
  })
})

describe('search settings (automation)', () => {
  it('round-trips per user and validates input', async () => {
    const put = await request(app)
      .put('/api/search-settings')
      .set('Authorization', USER_A)
      .send({ enabled: true, min_score_alert: 90, email_alerts: true, alert_email: 'a@test.local' })
    expect(put.status).toBe(200)
    expect(put.body.enabled).toBe(true)

    const a = await request(app).get('/api/search-settings').set('Authorization', USER_A)
    expect(a.body.min_score_alert).toBe(90)

    const b = await request(app).get('/api/search-settings').set('Authorization', USER_B)
    expect(b.body.enabled).toBe(false) // defaults — untouched by A

    const bad = await request(app)
      .put('/api/search-settings')
      .set('Authorization', USER_A)
      .send({ min_score_alert: 500 })
    expect(bad.status).toBe(400)
  })
})

describe('validation', () => {
  it('rejects an invalid career track', async () => {
    const res = await request(app).post('/api/tracks/active').set('Authorization', USER_A).send({ track: 'pilot' })
    expect(res.status).toBe(400)
  })
})

describe('data export & deletion', () => {
  it('exports only the current user data', async () => {
    const res = await request(app).get('/api/export').set('Authorization', USER_A)
    expect(res.status).toBe(200)
    expect(res.body.profiles.tech.full_name).toBe('Alice Test')
    expect(Array.isArray(res.body.jobs)).toBe(true)
  })

  it('deletes only the current user data', async () => {
    const del = await request(app).delete('/api/data').set('Authorization', USER_A)
    expect(del.status).toBe(200)
    const a = await request(app).get('/api/profile').set('Authorization', USER_A)
    expect(a.body.full_name).toBe('')
  })
})

describe('production configuration guard', () => {
  it('throws in production without Supabase', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'production' })).toThrow(/Supabase/)
  })
  it('allows production with Supabase configured', () => {
    expect(() =>
      assertProductionConfig({ NODE_ENV: 'production', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', GEMINI_API_KEY: 'g' }),
    ).not.toThrow()
  })
  it('allows an explicit mock-auth demo', () => {
    expect(() =>
      assertProductionConfig({ NODE_ENV: 'production', ALLOW_MOCK_AUTH: 'true', GEMINI_API_KEY: 'g' }),
    ).not.toThrow()
  })
  it('is a no-op outside production', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'development' })).not.toThrow()
  })
})
