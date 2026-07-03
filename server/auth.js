// ─────────────────────────────────────────────────────────────
// auth.js — Express auth middleware
// Supabase configured: requires a valid Bearer JWT, sets req.userId to
// the authenticated Supabase user id (multi-user, Postgres).
// NOT configured (local mode): still multi-account! The frontend's mock
// auth sends a base64 token containing {id, email}. The OWNER_EMAIL
// account (and tokenless callers like curl/scheduler) map to the 'local'
// store — the owner's original data. Every other account gets its own
// namespaced JSON store, starting blank (onboarding collects their info).
// ─────────────────────────────────────────────────────────────
import { supabaseConfigured, getUserFromToken } from './supabaseAdmin.js'

export const LOCAL_USER = 'local'

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'mihretabtesfahun2124@gmail.com').toLowerCase()

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
    req.userId = LOCAL_USER // default: owner (curl, scheduler, extension)
    if (token) {
      const p = parseMockToken(token)
      const email = String(p?.email || '').toLowerCase()
      if (email && email !== OWNER_EMAIL) {
        // A non-owner local account → its own isolated data namespace.
        req.userId = 'mock-' + String(p.id || email).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48)
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
