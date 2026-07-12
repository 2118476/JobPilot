// ─────────────────────────────────────────────────────────────
// jobPageExtractor.js — safely fetch the PUBLIC page of a stored
// job's source_url so the AI can reference the original listing.
//
// SSRF protection:
//   • http/https only, no credentials in URL
//   • hostname blocklist (localhost, *.internal, metadata hosts)
//   • DNS-resolves the host and rejects private/reserved IPs (v4+v6)
//   • manual redirects (each hop re-validated, max 3)
//   • strict timeout + response-size cap + content-type allow-list
//   • never sends cookies/auth; never executes page JavaScript
// Returned text is UNTRUSTED reference data — callers must wrap it
// in <untrusted_job_page> and instruct the model to ignore any
// instructions inside it.
// Known limitation: DNS is checked before fetch (a hostile DNS server
// doing a rebind between check and fetch is not fully mitigated).
// ─────────────────────────────────────────────────────────────
import { lookup } from 'node:dns/promises'
import net from 'node:net'

const TIMEOUT_MS = 8000
const MAX_BYTES = 600_000
const MAX_TEXT = 12_000
const MAX_REDIRECTS = 3

const BLOCKED_HOSTS = new Set([
  'localhost', 'metadata.google.internal', 'metadata', 'instance-data',
  '169.254.169.254', 'metadata.azure.com',
])

function isPrivateIPv4(ip) {
  return (
    /^10\./.test(ip) ||
    /^127\./.test(ip) ||
    /^0\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) || // CGNAT
    /^192\.0\.0\./.test(ip) ||
    /^198\.1[89]\./.test(ip) ||
    ip === '255.255.255.255'
  )
}

function isPrivateIp(ip) {
  const v = net.isIP(ip)
  if (v === 4) return isPrivateIPv4(ip)
  if (v === 6) {
    const low = ip.toLowerCase()
    if (low === '::1' || low === '::') return true
    if (low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) return true
    const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIPv4(mapped[1])
    return false
  }
  return true // not a valid IP at all → treat as unsafe
}

/** Validate a URL is a public http(s) address. Throws on anything unsafe. */
export async function assertPublicUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http/https URLs are allowed')
  }
  if (url.username || url.password) throw new Error('Credentials in URLs are not allowed')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('Host is not allowed')
  }
  // Literal IP host?
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Private/reserved IP addresses are not allowed')
    return url
  }
  // Resolve and verify EVERY address is public.
  let addrs
  try {
    addrs = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new Error('Host could not be resolved')
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('Host resolves to a private/reserved address')
  }
  return url
}

function stripHtmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|aside|noscript|svg|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&rdquo;|&ldquo;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/**
 * Fetch the public job page and return clean text (capped).
 * Throws with a safe message on any failure — callers fall back to the
 * job description already stored in JobPilot.
 */
export async function fetchJobPage(rawUrl) {
  let url = await assertPublicUrl(rawUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    let res
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: ctrl.signal,
        credentials: 'omit',
        headers: { 'User-Agent': 'JobPilotBot/1.0 (+job-listing-reader)', Accept: 'text/html,text/plain' },
      })
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc || hop === MAX_REDIRECTS) throw new Error('Too many redirects')
      url = await assertPublicUrl(new URL(loc, url).toString())
      continue
    }
    if (!res.ok) throw new Error(`Page returned ${res.status}`)

    const ctype = (res.headers.get('content-type') || '').toLowerCase()
    if (!ctype.startsWith('text/html') && !ctype.startsWith('text/plain') && !ctype.startsWith('application/xhtml')) {
      throw new Error('Unsupported content type')
    }
    const len = Number(res.headers.get('content-length') || 0)
    if (len > MAX_BYTES) throw new Error('Page too large')

    const raw = await res.text()
    const text = stripHtmlToText(raw.slice(0, MAX_BYTES)).slice(0, MAX_TEXT)
    if (!text) throw new Error('No readable text on page')
    return text
  }
  throw new Error('Too many redirects')
}
