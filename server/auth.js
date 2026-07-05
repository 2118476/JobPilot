// ─────────────────────────────────────────────────────────────
// auth.js — Express auth middleware
//
// Supabase configured (production): every protected route requires a
// valid Bearer JWT; req.userId is the authenticated Supabase user id.
//
// Not configured (LOCAL DEVELOPMENT ONLY — see config.js, which refuses
// to start in production without Supabase unless ALLOW_MOCK_AUTH=true):
// the frontend's localStorage mock auth sends a base64 token {id,email}.
// Each account maps to its own isolated JSON namespace. If OWNER_EMAIL is
// set in the environment, that one account maps to the primary 'local'
// store; tokenless callers (curl, the scheduler) also use 'local'.
// No personal data is hardcoded here — identity comes from env/config.
// ─────────────────────────────────────────────────────────────
import { supabaseConfigured, getUserFromToken } from './supabaseAdmin.js'

export const LOCAL_USER = 'local'

/** Parse the localStorage-mock token (base64 JSON {id,email,ts}) — not a JWT. */
function parseMockToken(token) {
  try {
    const p = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
    if (p && (p.id || p.email)) return p
  } catch { /* not a mock token */ }
  return null
}

export async function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null

  if (!supabaseConfigured()) {
    const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase()
    req.userId = LOCAL_USER // tokenless callers: curl, scheduler
    if (token) {
      const p = parseMockToken(token)
      const email = String(p?.email || '').toLowerCase()
      if (email && (!ownerEmail || email !== ownerEmail)) {
        // A non-primary local account → its own isolated data namespace.
        req.userId = 'mock-' + String(p.id || email).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48)
        req.userEmail = email
      } else if (email) {
        req.userEmail = email
      }
    }
    return next()
  }

  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated. Please sign in.' })
  req.userId = user.id
  req.userEmail = user.email
  next()
}
