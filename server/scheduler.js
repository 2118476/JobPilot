// ─────────────────────────────────────────────────────────────
// scheduler.js — opt-in background automation. Runs the job search
// at set times each day and emails a deadline digest. Operates on the
// owner's local store (single-tenant). Enable with ENABLE_SCHEDULER=true.
//   SCHEDULE_TIMES        — comma list of HH:MM to run search (default 08:00,18:00)
//   DEADLINE_DIGEST_TIME  — HH:MM to email upcoming deadlines (default 07:30)
// (Per-user scheduling for a multi-tenant deployment is a future step.)
// ─────────────────────────────────────────────────────────────
import { runSearch } from './searchRunner.js'
import { getJobs } from './store.js'
import { notifyStrongMatches, notifyDeadlines, emailConfigured } from './email.js'

const SCHEDULE_USER = 'local'
const RUN_AT = (process.env.SCHEDULE_TIMES || '08:00,18:00').split(',').map((s) => s.trim()).filter(Boolean)
const DEADLINE_AT = (process.env.DEADLINE_DIGEST_TIME || '07:30').trim()
const done = new Set() // de-dupe per slot per day

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function tick() {
  const now = new Date()
  const time = hhmm(now)
  const day = now.toISOString().slice(0, 10)

  if (RUN_AT.includes(time)) {
    const key = `${day} ${time} search`
    if (!done.has(key)) {
      done.add(key)
      try {
        const r = await runSearch(SCHEDULE_USER, {})
        console.log(`  [scheduler] search done: +${r.added} new, ${r.scored} scored`)
        const mail = await notifyStrongMatches(r.newlyScored)
        if (mail.sent) console.log('  [scheduler] strong-match email sent')
      } catch (e) {
        console.warn('  [scheduler] search failed:', e.message)
      }
    }
  }

  if (time === DEADLINE_AT) {
    const key = `${day} deadline`
    if (!done.has(key)) {
      done.add(key)
      try {
        const mail = await notifyDeadlines(await getJobs(SCHEDULE_USER))
        if (mail.sent) console.log('  [scheduler] deadline digest sent')
      } catch (e) {
        console.warn('  [scheduler] deadline digest failed:', e.message)
      }
    }
  }

  // Forget yesterday's keys so the set stays small.
  if (done.size > 50) for (const k of done) if (!k.startsWith(day)) done.delete(k)
}

export function startScheduler() {
  if (process.env.ENABLE_SCHEDULER !== 'true') return
  console.log(
    `  Scheduler: ON — search at ${RUN_AT.join(', ')}; deadline digest at ${DEADLINE_AT}` +
      (emailConfigured() ? ' (email enabled)' : ' (email off — set RESEND_API_KEY + EMAIL_TO)'),
  )
  const timer = setInterval(tick, 60_000)
  timer.unref?.()
}
