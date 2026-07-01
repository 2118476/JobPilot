// ─────────────────────────────────────────────────────────────
// auth.js — Express auth middleware
// When Supabase is configured: requires a valid Bearer JWT and sets
// req.userId to the authenticated user's id (multi-user mode).
// When NOT configured: single local user ('local'), no auth required
// (preserves local/dev/static behavior on JSON files).
// ─────────────────────────────────────────────────────────────
import { supabaseConfigured, getUserFromToken } from './supabaseAdmin.js'

export const LOCAL_USER = 'local'

export async function requireAuth(req, res, next) {
  if (!supabaseConfigured()) {
    req.userId = LOCAL_USER
    return next()
  }
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated. Please sign in.' })
  req.userId = user.id
  req.userEmail = user.email
  next()
}
