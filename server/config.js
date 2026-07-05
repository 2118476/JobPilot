// ─────────────────────────────────────────────────────────────
// config.js — env loading + production configuration guard.
// Imported FIRST (before anything reads process.env).
// ─────────────────────────────────────────────────────────────
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') })

export const isProduction = () => process.env.NODE_ENV === 'production'

/**
 * In production, refuse to run without real auth: Supabase must be configured
 * unless ALLOW_MOCK_AUTH=true was set explicitly (demo deployments only).
 * Throws with a clear message; the entrypoint exits non-zero.
 */
export function assertProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return
  const hasSupabase = !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
  if (!hasSupabase && env.ALLOW_MOCK_AUTH !== 'true') {
    throw new Error(
      'FATAL: NODE_ENV=production but Supabase auth is not configured.\n' +
        '  Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see server/.env.example),\n' +
        '  or — for a throwaway demo only — set ALLOW_MOCK_AUTH=true explicitly.',
    )
  }
  if (!env.GEMINI_API_KEY && (env.AI_PROVIDER || 'gemini') === 'gemini') {
    console.warn('  WARNING: no GEMINI_API_KEY set — AI features will use heuristic fallbacks.')
  }
}
