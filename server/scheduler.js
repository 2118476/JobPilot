// ─────────────────────────────────────────────────────────────
// scheduler.js — opt-in background automation, PER USER.
// Enable with ENABLE_SCHEDULER=true. At each schedule slot it loops
// through every user who turned auto-search ON (search_settings) and:
//   • runs a job search using THAT user's profile + settings
//   • emails THAT user their own strong matches / deadline digest
// Users with incomplete profiles and no custom query are skipped.
// Logs counts only — never personal data.
//   SCHEDULE_TIMES        — HH:MM list for searches (default 08:00,18:00)
//   DEADLINE_DIGEST_TIME  — HH:MM for the deadline email (default 07:30)
// ─────────────────────────────────────────────────────────────
import { runSearch } from './searchRunner.js'
import { getJobs, getProfile, profileReady, listAutomationUsers } from './store.js'
import { notifyStrongMatches, notifyDeadlines, emailConfigured } from './email.js'
import { getUserEmailById } from './supabaseAdmin.js'

const RUN_AT = (process.env.SCHEDULE_TIMES || '08:00,18:00').split(',').map((s) => s.trim()).filter(Boolean)
const DEADLINE_AT = (process.env.DEADLINE_DIGEST_TIME || '07:30').trim()
const done = new Set() // de-dupe per slot per day

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Which schedule slots apply to a user's chosen frequency. */
function slotsFor(frequency) {
  if (frequency === 'manual') return []
  if (frequency === 'daily') return RUN_AT.slice(0, 1)
  return RUN_AT // twice_daily (default)
}

async function recipientFor(userId, settings) {
  if (settings.alert_email) return settings.alert_email
  return (await getUserEmailById(userId)) || undefined
}

async function runForUser({ userId, settings }, time) {
  if (!slotsFor(settings.frequency).includes(time)) return
  const profile = await getProfile(userId)
  // Never search on an empty profile unless the user set an explicit query.
  if (!profileReady(profile) && !settings.query) return

  const r = await runSearch(userId, {
    query: settings.query || undefined,
    location: settings.location || undefined,
    scoreLimit: 10,
  })
  console.log(`  [scheduler] user search done: +${r.added} new, ${r.scored} scored`)

  if (settings.email_alerts) {
    const to = await recipientFor(userId, settings)
    if (to) {
      const mail = await notifyStrongMatches(r.newlyScored, { to, minScore: settings.min_score_alert ?? 85 })
      if (mail.sent) console.log('  [scheduler] match alert emailed')
    }
  }
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
        const users = await listAutomationUsers()
        console.log(`  [scheduler] ${time} — ${users.length} user(s) with automation on`)
        for (const u of users) {
          try {
            await runForUser(u, time)
          } catch (e) {
            console.warn('  [scheduler] user run failed:', e.message)
          }
          await new Promise((r) => setTimeout(r, 3000)) // pace between users (API quotas)
        }
      } catch (e) {
        console.warn('  [scheduler] run failed:', e.message)
      }
    }
  }

  if (time === DEADLINE_AT) {
    const key = `${day} deadline`
    if (!done.has(key)) {
      done.add(key)
      try {
        const users = await listAutomationUsers()
        for (const { userId, settings } of users) {
          if (!settings.email_alerts) continue
          const to = await recipientFor(userId, settings)
          if (!to) continue
          const mail = await notifyDeadlines(await getJobs(userId), { to })
          if (mail.sent) console.log('  [scheduler] deadline digest emailed')
        }
      } catch (e) {
        console.warn('  [scheduler] deadline digest failed:', e.message)
      }
    }
  }

  if (done.size > 100) for (const k of done) if (!k.startsWith(day)) done.delete(k)
}

export function startScheduler() {
  if (process.env.ENABLE_SCHEDULER !== 'true') return
  console.log(
    `  Scheduler: ON — per-user auto-search at ${RUN_AT.join(', ')}; deadline digest at ${DEADLINE_AT}` +
      (emailConfigured() ? ' (email enabled)' : ' (email off — set RESEND_API_KEY)'),
  )
  const timer = setInterval(tick, 60_000)
  timer.unref?.()
}
