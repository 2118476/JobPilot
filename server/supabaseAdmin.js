// ─────────────────────────────────────────────────────────────
// supabaseAdmin.js — server-side Supabase client (service role)
// Used for: (1) verifying user JWTs, (2) reading/writing Postgres
// scoped to the authenticated user. Falls back to "not configured"
// when env vars are absent, so the app still runs on JSON files.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

let _admin = null

/** True when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set. */
export function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/** Lazily-created service-role client (bypasses RLS — always filter by user_id). */
export function admin() {
  if (!supabaseConfigured()) return null
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _admin
}

/** Verify a user access-token (JWT) and return the Supabase user, or null. */
export async function getUserFromToken(token) {
  const a = admin()
  if (!a || !token) return null
  try {
    const { data, error } = await a.auth.getUser(token)
    if (error) return null
    return data?.user || null
  } catch {
    return null
  }
}
