// ─────────────────────────────────────────────────────────────
// rateLimit.js — lightweight in-memory sliding-window limiters.
// No external deps. General limiter for all /api traffic plus a
// stricter one for AI-heavy endpoints (keyed per user when known).
//   RATE_LIMIT_MAX     — general requests/min per client (default 120)
//   RATE_LIMIT_AI_MAX  — AI requests/min per client (default 12)
// ─────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000

function clientKey(req) {
  if (req.userId) return `u:${req.userId}`
  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`
}

export function makeRateLimit({ max, message }) {
  const hits = new Map() // key -> number[] timestamps
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [k, arr] of hits) {
      const fresh = arr.filter((t) => now - t < WINDOW_MS)
      if (fresh.length) hits.set(k, fresh)
      else hits.delete(k)
    }
  }, WINDOW_MS)
  timer.unref?.()

  return function rateLimit(req, res, next) {
    const key = clientKey(req)
    const now = Date.now()
    const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)
    arr.push(now)
    hits.set(key, arr)
    if (arr.length > max()) {
      res.set('Retry-After', '60')
      return res.status(429).json({ error: message })
    }
    next()
  }
}

/** General limiter for all API routes. */
export const rateLimit = makeRateLimit({
  max: () => Number(process.env.RATE_LIMIT_MAX || 120),
  message: 'Too many requests — please slow down and try again shortly.',
})

/** Stricter limiter for AI-heavy endpoints (scoring, CV, coach, interview). */
export const aiRateLimit = makeRateLimit({
  max: () => Number(process.env.RATE_LIMIT_AI_MAX || 12),
  message: 'AI request limit reached — please wait a minute before generating more.',
})
