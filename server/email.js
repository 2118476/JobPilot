// ─────────────────────────────────────────────────────────────
// email.js — transactional email via Resend (https://resend.com).
// Opt-in: inert unless RESEND_API_KEY + EMAIL_TO are set, so the app
// runs fine without it. Uses fetch (no SDK dependency).
//   RESEND_API_KEY  — Resend API key
//   EMAIL_TO        — where alerts are sent
//   EMAIL_FROM      — verified sender (default Resend onboarding address)
// ─────────────────────────────────────────────────────────────

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Send an email. `to` defaults to EMAIL_TO (single-user setups). */
export async function sendEmail({ to, subject, html, text }) {
  const recipient = to || process.env.EMAIL_TO
  if (!emailConfigured() || !recipient) return { sent: false, reason: 'not configured' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'JobPilot <onboarding@resend.dev>',
        to: [recipient],
        subject,
        html,
        text,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return { sent: false, error: `Resend ${res.status}: ${t.slice(0, 160)}` }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: String(e.message || e) }
  }
}

const wrap = (title, inner) =>
  `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <h2 style="color:#4f46e5">${esc(title)}</h2>${inner}
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Sent by JobPilot — your AI job-search co-pilot.</p>
  </div>`

/** Email a digest of newly-found strong matches (>= minScore, default 85). */
export async function notifyStrongMatches(jobs, { to, minScore = 85 } = {}) {
  if (!emailConfigured()) return { sent: false, reason: 'not configured' }
  const strong = (jobs || []).filter((j) => (j.match_score || 0) >= minScore)
  if (!strong.length) return { sent: false, reason: 'no strong matches' }
  const top = strong.slice(0, 10)
  const rows = top
    .map(
      (j) =>
        `<li style="margin-bottom:8px"><b>${esc(j.title)}</b> — ${esc(j.company)} · <b style="color:#10b981">${j.match_score}%</b>${
          j.source_url ? ` · <a href="${esc(j.source_url)}">view</a>` : ''
        }</li>`,
    )
    .join('')
  const text = top.map((j) => `${j.title} — ${j.company} — ${j.match_score}%  ${j.source_url || ''}`).join('\n')
  return sendEmail({
    to,
    subject: `JobPilot: ${strong.length} strong match${strong.length === 1 ? '' : 'es'} found`,
    html: wrap(`${strong.length} strong match${strong.length === 1 ? '' : 'es'}`, `<ul>${rows}</ul>`),
    text,
  })
}

/** Email upcoming application deadlines (next ~2 days). */
export async function notifyDeadlines(jobs, { to } = {}) {
  if (!emailConfigured()) return { sent: false, reason: 'not configured' }
  const now = Date.now()
  const soon = (jobs || []).filter((j) => {
    if (!j.next_action_date) return false
    const d = new Date(j.next_action_date).getTime()
    return d >= now - 86400000 && d <= now + 2 * 86400000
  })
  if (!soon.length) return { sent: false, reason: 'no deadlines' }
  const rows = soon
    .map(
      (j) =>
        `<li style="margin-bottom:8px"><b>${esc(j.title)}</b> — ${esc(j.company)} · ${esc(
          j.next_action || 'Action due',
        )} (${esc(new Date(j.next_action_date).toDateString())})</li>`,
    )
    .join('')
  const text = soon
    .map((j) => `${j.title} — ${j.company} — ${j.next_action || 'Action due'} (${new Date(j.next_action_date).toDateString()})`)
    .join('\n')
  return sendEmail({
    to,
    subject: `JobPilot: ${soon.length} deadline${soon.length === 1 ? '' : 's'} coming up`,
    html: wrap('Upcoming deadlines', `<ul>${rows}</ul>`),
    text,
  })
}
