// ─────────────────────────────────────────────────────────────
// index.js — JobPilot API entrypoint.
// Loads env, enforces production config, serves the app, starts the
// (opt-in) scheduler. All routes live in app.js; storage in store.js.
// ─────────────────────────────────────────────────────────────
import { assertProductionConfig } from './config.js'

try {
  assertProductionConfig()
} catch (e) {
  console.error(`\n${e.message}\n`)
  process.exit(1)
}

const { createApp } = await import('./app.js')
const { aiStatus } = await import('./ai.js')
const { supabaseConfigured } = await import('./supabaseAdmin.js')
const { startScheduler } = await import('./scheduler.js')

const PORT = process.env.PORT || 8787
const app = createApp()

app.listen(PORT, () => {
  const ai = aiStatus()
  console.log(`\n  JobPilot AI backend → http://localhost:${PORT}`)
  console.log(`  AI provider: ${ai.provider} (${ai.model}) — ${ai.live ? 'LIVE' : 'heuristic fallback'}`)
  console.log(`  Storage: ${supabaseConfigured() ? 'Supabase Postgres (multi-user auth)' : 'local JSON files (dev mode, per-account namespaces)'}`)
  startScheduler()
  console.log('')
})
