// ─────────────────────────────────────────────────────────────
// auth.test.js — JWT enforcement when Supabase IS configured.
// Mocks the Supabase admin module: only a valid token passes.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabaseAdmin.js', () => ({
  supabaseConfigured: () => true,
  getUserFromToken: async (token) => (token === 'valid-jwt' ? { id: 'supa-user-1', email: 'real@user.com' } : null),
  getUserEmailById: async () => null,
  admin: () => null,
}))

const { requireAuth } = await import('../auth.js')

function fakeRes() {
  return {
    code: 0,
    body: null,
    status(c) { this.code = c; return this },
    json(b) { this.body = b; return this },
  }
}

describe('requireAuth (Supabase mode)', () => {
  it('rejects requests without a token', async () => {
    const req = { headers: {} }
    const res = fakeRes()
    let nextCalled = false
    await requireAuth(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res.code).toBe(401)
  })

  it('rejects invalid tokens (including old mock tokens)', async () => {
    const mock = 'Bearer ' + Buffer.from(JSON.stringify({ id: 'x', email: 'x@y.z' })).toString('base64')
    const req = { headers: { authorization: mock } }
    const res = fakeRes()
    let nextCalled = false
    await requireAuth(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(false)
    expect(res.code).toBe(401)
  })

  it('accepts a valid JWT and sets the real user id', async () => {
    const req = { headers: { authorization: 'Bearer valid-jwt' } }
    const res = fakeRes()
    let nextCalled = false
    await requireAuth(req, res, () => { nextCalled = true })
    expect(nextCalled).toBe(true)
    expect(req.userId).toBe('supa-user-1')
  })
})
