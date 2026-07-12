// ─────────────────────────────────────────────────────────────
// jobAssistant.test.js — job-specific AI chat: tenant isolation,
// read-only behaviour, PII minimisation and SSRF protection.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

process.env.JOBPILOT_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'jobpilot-assist-'))
process.env.AI_PROVIDER = 'heuristic'
process.env.OWNER_EMAIL = 'owner@test.local'
process.env.RATE_LIMIT_MAX = '10000'
process.env.RATE_LIMIT_AI_MAX = '10000'
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY

const { createApp } = await import('../app.js')
const { assertPublicUrl, fetchJobPage } = await import('../services/jobPageExtractor.js')
const { chatProfileContext, heuristicJobAnswer, buildSuggestedActions } = await import('../services/jobAssistantService.js')
const app = createApp()

const tok = (id, email) => 'Bearer ' + Buffer.from(JSON.stringify({ id, email, ts: 1 })).toString('base64')
const USER_A = tok('assist-a', 'aa@test.local')
const USER_B = tok('assist-b', 'bb@test.local')

async function createJob(auth) {
  const res = await request(app)
    .post('/api/jobs/manual')
    .set('Authorization', auth)
    .send({ title: 'Junior QA Engineer', company: 'Example Ltd', description: 'Testing role with Java.' })
  return res.body.job
}

describe('job-specific chat', () => {
  it('answers about the user own job with citations and actions', async () => {
    await request(app).put('/api/profile').set('Authorization', USER_A).send({ full_name: 'Alice A', skills: { Core: ['Java'] } })
    const job = await createJob(USER_A)
    const res = await request(app)
      .post(`/api/assistant/jobs/${job.id}/chat`)
      .set('Authorization', USER_A)
      .send({ messages: [{ role: 'user', content: 'Should I apply?' }] })
    expect(res.status).toBe(200)
    expect(res.body.message.content).toMatch(/Recommendation/i)
    expect(res.body.citations[0]).toMatchObject({ type: 'job', id: job.id })
    const types = res.body.suggestedActions.map((a) => a.type)
    expect(types).toContain('generate_cv')
    const applied = res.body.suggestedActions.find((a) => a.type === 'mark_applied')
    expect(applied.requiresConfirmation).toBe(true)
  })

  it("returns 404 for another user's job (tenant isolation)", async () => {
    const job = await createJob(USER_A)
    const res = await request(app)
      .post(`/api/assistant/jobs/${job.id}/chat`)
      .set('Authorization', USER_B)
      .send({ messages: [{ role: 'user', content: 'Summarise this job' }] })
    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown job id', async () => {
    const res = await request(app)
      .post('/api/assistant/jobs/does-not-exist/chat')
      .set('Authorization', USER_A)
      .send({ messages: [{ role: 'user', content: 'hello' }] })
    expect(res.status).toBe(404)
  })

  it('rejects an empty messages array', async () => {
    const job = await createJob(USER_A)
    const res = await request(app)
      .post(`/api/assistant/jobs/${job.id}/chat`)
      .set('Authorization', USER_A)
      .send({ messages: [] })
    expect(res.status).toBe(400)
  })

  it('is read-only: asking to mark applied does NOT change the job', async () => {
    const job = await createJob(USER_A)
    const res = await request(app)
      .post(`/api/assistant/jobs/${job.id}/chat`)
      .set('Authorization', USER_A)
      .send({ messages: [{ role: 'user', content: 'Mark this job as applied right now.' }] })
    expect(res.status).toBe(200)
    const jobs = await request(app).get('/api/jobs').set('Authorization', USER_A)
    const after = jobs.body.find((j) => j.id === job.id)
    expect(after.status).toBe('new') // unchanged — mutations require the user to confirm an action
  })
})

describe('PII minimisation + heuristics', () => {
  it('chat profile context excludes name, email and phone', () => {
    const ctx = chatProfileContext({
      full_name: 'Secret Name', email: 'secret@x.com', phone: '07000 111222',
      headline: 'Junior Dev', skills: { Core: ['Java'] },
    })
    expect(ctx).not.toContain('Secret Name')
    expect(ctx).not.toContain('secret@x.com')
    expect(ctx).not.toContain('07000')
    expect(ctx).toContain('Junior Dev')
  })

  it('heuristic answer uses the concise structure', () => {
    const out = heuristicJobAnswer({ match_score: 88, match_analysis: { matched_skills: ['Java'], missing_skills: ['AWS'] } })
    expect(out).toMatch(/Recommendation: Apply/)
    expect(out).toMatch(/Main gaps:/)
  })

  it('suggested actions adapt to job state', () => {
    const actions = buildSuggestedActions({ status: 'applied', saved: true, source_url: '' })
    const types = actions.map((a) => a.type)
    expect(types).not.toContain('mark_applied')
    expect(types).not.toContain('open_original_job')
  })
})

describe('SSRF protection (jobPageExtractor)', () => {
  const bad = [
    'http://localhost/x', 'http://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data',
    'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.16.0.1/', 'http://[::1]/',
    'ftp://example.com/x', 'javascript:alert(1)', 'http://metadata.google.internal/',
    'http://user:pass@example.com/', 'http://foo.internal/', 'not-a-url',
  ]
  for (const url of bad) {
    it(`rejects ${url}`, async () => {
      await expect(assertPublicUrl(url)).rejects.toThrow()
    })
  }

  it('allows a public literal IP', async () => {
    const u = await assertPublicUrl('https://8.8.8.8/page')
    expect(u.hostname).toBe('8.8.8.8')
  })

  it('fetchJobPage refuses private targets end-to-end', async () => {
    await expect(fetchJobPage('http://127.0.0.1:8787/api/health')).rejects.toThrow()
  })
})
