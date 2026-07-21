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
const { buildCoachSystem } = await import('../ai.js')
const app = createApp()

// Local-mode mock tokens (base64 {id,email}) — one per fake account.
const tok = (id, email) => 'Bearer ' + Buffer.from(JSON.stringify({ id, email, ts: 1 })).toString('base64')
const USER_A = tok('user-a', 'a@test.local')
const USER_B = tok('user-b', 'b@test.local')
const USER_C = tok('user-c', 'c@test.local')

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

  it('previews a grounded score without adding another job', async () => {
    const before = await request(app).get('/api/jobs').set('Authorization', USER_A)
    const preview = await request(app)
      .post('/api/jobs/manual/analyze')
      .set('Authorization', USER_A)
      .send({ title: 'Automation QA Engineer', company: 'Acme', description: 'Testing automation quality assurance role using Testing.' })
    expect(preview.status).toBe(200)
    expect(preview.body.job.match_analysis).toBeTruthy()
    expect(preview.body.job.match_score).toBeTypeOf('number')

    const after = await request(app).get('/api/jobs').set('Authorization', USER_A)
    expect(after.body).toHaveLength(before.body.length)
  })

  it('requires a completed profile before previewing an AI score', async () => {
    const preview = await request(app)
      .post('/api/jobs/manual/analyze')
      .set('Authorization', USER_B)
      .send({ title: 'Site Operative', description: 'A detailed construction site operative listing for an applicant.' })
    expect(preview.status).toBe(422)
    expect(preview.body.code).toBe('PROFILE_INCOMPLETE')
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

  it('grounds the coach in JobPilot data and keeps actions in-product', () => {
    const prompt = buildCoachSystem(
      { full_name: 'Alice', projects: [{ name: 'Real Project', tech: ['Java'], detail: 'Built an API' }], skills: { Core: ['Java'] } },
      { stats: { totalJobs: 2 }, topJobs: [], documents: [{ type: 'cv', job_title: 'QA Engineer', content: 'REAL SAVED CV EVIDENCE' }] },
    )
    expect(prompt).toContain('Real Project')
    expect(prompt).toContain('REAL SAVED CV EVIDENCE')
    expect(prompt).toContain('JOBPILOT-FIRST RULES')
    expect(prompt).toMatch(/Do not tell the user to browse LinkedIn/)
    expect(prompt).toContain('Career Profile, Project Library, Jobs, Applications, CV Manager')
    expect(prompt).toContain('You CAN propose authenticated profile updates')
    expect(prompt).toContain('save it only after Yes')
    expect(prompt).toContain('RESPONSE CONTRACT')
  })

  it('does not pretend a blank profile is personalised', () => {
    const prompt = buildCoachSystem({ full_name: '', skills: {}, projects: [] }, { stats: {}, documents: [] })
    expect(prompt).toContain('PROFILE NOT COMPLETED')
    expect(prompt).toContain('ask one focused question at a time')
  })
})

describe('AI Coach profile-update consent', () => {
  it('merges approved facts into only the selected track and account', async () => {
    const update = {
      track: 'construction',
      profile_update: {
        summary: 'Add site-work experience, cards and location.',
        changes: {
          headline: 'Traffic Marshal / Banksman / Gateman',
          location: 'Acton, London W3 6DR',
          skills: { 'Site Operations': ['Traffic Marshalling', 'Banksman duties'] },
          cards_certifications: ['Blue CPCS Traffic Marshal', 'CSCS card'],
          experience: [{
            role: 'Traffic Marshal / Banksman / Gateman',
            dates: '6 years',
            detail: 'Managed vehicle movements, directed deliveries and maintained site safety.',
          }],
          user_id: 'must-not-be-saved',
        },
      },
    }
    const approved = await request(app)
      .post('/api/coach/profile-update')
      .set('Authorization', USER_C)
      .send(update)
    expect(approved.status).toBe(200)
    expect(approved.body).toMatchObject({ ok: true, track: 'construction' })

    const construction = await request(app).get('/api/profile?track=construction').set('Authorization', USER_C)
    expect(construction.body.location).toBe('Acton, London W3 6DR')
    expect(construction.body.headline).toContain('Traffic Marshal')
    expect(construction.body.cards_certifications).toEqual(expect.arrayContaining(['Blue CPCS Traffic Marshal', 'CSCS card']))
    expect(construction.body.experience).toHaveLength(1)
    expect(construction.body.user_id).toBeUndefined()

    const second = await request(app)
      .post('/api/coach/profile-update')
      .set('Authorization', USER_C)
      .send({
        track: 'construction',
        profile_update: {
          summary: 'Add one more card without replacing existing details.',
          changes: {
            cards_certifications: ['CSCS card', 'First Aid at Work'],
            experience: [{ role: 'Traffic Marshal / Banksman / Gateman', dates: '6 years' }],
          },
        },
      })
    expect(second.status).toBe(200)
    expect(second.body.profile.cards_certifications).toEqual(expect.arrayContaining([
      'Blue CPCS Traffic Marshal', 'CSCS card', 'First Aid at Work',
    ]))
    expect(second.body.profile.experience).toHaveLength(1)

    const tech = await request(app).get('/api/profile?track=tech').set('Authorization', USER_C)
    expect(tech.body.full_name).toBe('')
    expect(tech.body.location).toBe('')
  })

  it('rejects profile updates without an explicit valid target track', async () => {
    const response = await request(app)
      .post('/api/coach/profile-update')
      .set('Authorization', USER_C)
      .send({ track: 'other', profile_update: { changes: { location: 'London' } } })
    expect(response.status).toBe(400)
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
      .send({
        enabled: true,
        min_score_alert: 90,
        email_alerts: true,
        alert_email: 'a@test.local',
        keywords: ['QA', 'Automation'],
        preferred_locations: ['London'],
        sources: ['adzuna', 'reed'],
        daily_search_limit: 25,
      })
    expect(put.status).toBe(200)
    expect(put.body.enabled).toBe(true)

    const a = await request(app).get('/api/search-settings').set('Authorization', USER_A)
    expect(a.body.min_score_alert).toBe(90)
    expect(a.body.keywords).toEqual(['QA', 'Automation'])
    expect(a.body.preferred_locations).toEqual(['London'])
    expect(a.body.sources).toEqual(['adzuna', 'reed'])

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
    expect(res.body).toMatchObject({ format: 'jobpilot-workspace', version: 1 })
  })

  it('imports a workspace only into the authenticated account', async () => {
    const archive = {
      format: 'jobpilot-workspace', version: 1, active_track: 'construction',
      profiles: {
        tech: { full_name: 'Bob Tech', skills: { Core: ['React'] } },
        construction: { full_name: 'Bob Site', skills: { Site: ['Banksman'] } },
      },
      jobs: [{ id: 'imported-job', title: 'Imported Role', company: 'Acme', status: 'saved' }],
      documents: [{ id: 'imported-doc', type: 'cv', content: 'Imported CV', created_at: new Date().toISOString() }],
      search_settings: { enabled: false, query: 'imported query' },
    }
    const imported = await request(app).post('/api/import').set('Authorization', USER_B).send({ archive })
    expect(imported.status).toBe(200)
    expect(imported.body).toMatchObject({ ok: true, profiles: 2, jobs: 1, documents: 1, active_track: 'construction' })

    const bProfile = await request(app).get('/api/profile?track=tech').set('Authorization', USER_B)
    expect(bProfile.body.full_name).toBe('Bob Tech')
    const bJobs = await request(app).get('/api/jobs').set('Authorization', USER_B)
    expect(bJobs.body[0]).toMatchObject({ id: 'imported-job', user_id: 'mock-user-b' })
    const aProfile = await request(app).get('/api/profile').set('Authorization', USER_A)
    expect(aProfile.body.full_name).toBe('Alice Test')
  })

  it('rejects a malformed workspace archive', async () => {
    const res = await request(app).post('/api/import').set('Authorization', USER_B).send({ archive: [] })
    expect(res.status).toBe(422)
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
      assertProductionConfig({ NODE_ENV: 'production', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: 'https://jobpilot.example' }),
    ).not.toThrow()
  })
  it('allows an explicit mock-auth demo', () => {
    expect(() =>
      assertProductionConfig({ NODE_ENV: 'production', ALLOW_MOCK_AUTH: 'true', GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: 'https://jobpilot.example' }),
    ).not.toThrow()
  })
  it('requires an exact frontend origin in production', () => {
    const base = { NODE_ENV: 'production', ALLOW_MOCK_AUTH: 'true', GEMINI_API_KEY: 'g' }
    expect(() => assertProductionConfig(base)).toThrow(/ALLOWED_ORIGINS/)
    expect(() => assertProductionConfig({ ...base, ALLOWED_ORIGINS: '*' })).toThrow(/invalid|exact HTTP/)
  })
  it('is a no-op outside production', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'development' })).not.toThrow()
  })
})
