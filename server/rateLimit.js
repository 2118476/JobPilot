// ─────────────────────────────────────────────────────────────
// rateLimit.js — lightweight in-memory sliding-window limiter (per IP).
// No external deps. Protects the API from abuse / runaway clients.
// Tune with RATE_LIMIT_MAX (requests per minute per IP, default 120).
// ─────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000
const MAX = Number(process.env.RATE_LIMIT_MAX || 120)
const hits = new Map() // ip -> number[] (timestamps)

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return ((Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0] || req.socket?.remoteAddress || 'unknown').trim()
}

export function rateLimit(req, res, next) {
  const ip = clientIp(req)
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  hits.set(ip, arr)
  if (arr.length > MAX) {
    res.set('Retry-After', '60')
    return res.status(429).json({ error: 'Too many requests — please slow down and try again shortly.' })
  }
  next()
}

// Periodic cleanup so the map doesn't grow unbounded.
const timer = setInterval(() => {
  const now = Date.now()
  for (const [ip, arr] of hits) {
    const fresh = arr.filter((t) => now - t < WINDOW_MS)
    if (fresh.length) hits.set(ip, fresh)
    else hits.delete(ip)
  }
}, WINDOW_MS)
timer.unref?.()
