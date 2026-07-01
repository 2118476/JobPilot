// ─────────────────────────────────────────────────────────────
// sources.js — fetch real job listings from public APIs and
// normalize them into the app's Job shape.
// Free (no key): Remotive, Arbeitnow, The Muse.
// Optional (free key): Adzuna, Reed (UK coverage + salaries).
// ─────────────────────────────────────────────────────────────

function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&rdquo;|&ldquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function remoteType(text = '') {
  const t = text.toLowerCase()
  if (t.includes('hybrid')) return 'hybrid'
  if (t.includes('remote')) return 'remote'
  if (t.includes('on-site') || t.includes('onsite') || t.includes('on site')) return 'onsite'
  return 'unknown'
}

const nowIso = () => new Date().toISOString()
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

function baseJob(partial) {
  return {
    user_id: 'user-001',
    remote_type: 'unknown',
    salary_currency: 'GBP',
    requirements: [],
    responsibilities: [],
    job_type: 'full_time',
    status: 'new',
    match_score: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...partial,
  }
}

async function fetchJson(url, opts) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ─── Remotive (remote tech jobs, no key) ─────────────────────
async function fromRemotive(query) {
  try {
    const data = await fetchJson(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=25`,
    )
    return (data.jobs || []).map((j) =>
      baseJob({
        id: `rmt-${j.id}`,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Remote',
        remote_type: 'remote',
        salary_min: undefined,
        salary_max: undefined,
        description: stripHtml(j.description).slice(0, 4000),
        source: 'Remotive',
        source_url: j.url,
        posted_date: (j.publication_date || '').slice(0, 10),
      }),
    )
  } catch {
    return []
  }
}

// ─── Arbeitnow (EU/UK job board, no key) ─────────────────────
async function fromArbeitnow(query) {
  try {
    const data = await fetchJson('https://www.arbeitnow.com/api/job-board-api')
    const q = query.toLowerCase().split(/\s+/)
    return (data.data || [])
      .filter((j) => {
        const hay = `${j.title} ${(j.tags || []).join(' ')}`.toLowerCase()
        return q.some((w) => hay.includes(w))
      })
      .slice(0, 25)
      .map((j) =>
        baseJob({
          id: `arb-${slug(j.slug || j.title)}`,
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? 'Remote' : 'Unknown'),
          remote_type: j.remote ? 'remote' : remoteType(j.location),
          description: stripHtml(j.description).slice(0, 4000),
          source: 'Arbeitnow',
          source_url: j.url,
          posted_date: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : undefined,
        }),
      )
  } catch {
    return []
  }
}

// ─── The Muse (tech jobs with seniority levels, no key) ──────
async function fromTheMuse(query, location) {
  try {
    const loc = location && /london|uk|united kingdom/i.test(location) ? '&location=London%2C%20United%20Kingdom' : ''
    const data = await fetchJson(
      `https://www.themuse.com/api/public/jobs?category=Software%20Engineering&level=Entry%20Level&page=1${loc}`,
    )
    return (data.results || [])
      .slice(0, 25)
      .map((j) =>
        baseJob({
          id: `muse-${j.id}`,
          title: j.name,
          company: j.company?.name || 'Unknown',
          location: (j.locations || []).map((l) => l.name).join(', ') || 'Flexible',
          remote_type: remoteType((j.locations || []).map((l) => l.name).join(' ')),
          description: stripHtml(j.contents).slice(0, 4000),
          source: 'The Muse',
          source_url: j.refs?.landing_page,
          posted_date: (j.publication_date || '').slice(0, 10),
        }),
      )
  } catch {
    return []
  }
}

// ─── Adzuna (UK, optional key — best salary data) ────────────
async function fromAdzuna(query, location) {
  const id = process.env.ADZUNA_APP_ID
  const key = process.env.ADZUNA_APP_KEY
  if (!id || !key) return []
  try {
    const where = location && /london|uk|united kingdom/i.test(location) ? location.replace(/\(.*?\)/g, '').trim() : 'UK'
    const data = await fetchJson(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${id}&app_key=${key}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(where)}&results_per_page=25&content-type=application/json`,
    )
    return (data.results || []).map((j) =>
      baseJob({
        id: `adz-${j.id}`,
        title: j.title,
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || 'UK',
        remote_type: remoteType(`${j.title} ${j.description} ${j.location?.display_name}`),
        salary_min: j.salary_min ? Math.round(j.salary_min) : undefined,
        salary_max: j.salary_max ? Math.round(j.salary_max) : undefined,
        salary_currency: 'GBP',
        description: stripHtml(j.description).slice(0, 4000),
        source: 'Adzuna',
        source_url: j.redirect_url,
        posted_date: (j.created || '').slice(0, 10),
      }),
    )
  } catch {
    return []
  }
}

// ─── Reed (UK, optional key) ─────────────────────────────────
async function fromReed(query, location) {
  const key = process.env.REED_API_KEY
  if (!key) return []
  try {
    const where = location && /london|uk|united kingdom/i.test(location) ? `&locationName=${encodeURIComponent(location.replace(/\(.*?\)/g, '').trim())}` : ''
    const auth = 'Basic ' + Buffer.from(`${key}:`).toString('base64')
    const data = await fetchJson(
      `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}${where}&resultsToTake=25`,
      { headers: { Authorization: auth } },
    )
    return (data.results || []).map((j) =>
      baseJob({
        id: `reed-${j.jobId}`,
        title: j.jobTitle,
        company: j.employerName || 'Unknown',
        location: j.locationName || 'UK',
        remote_type: remoteType(`${j.jobTitle} ${j.jobDescription}`),
        salary_min: j.minimumSalary ? Math.round(j.minimumSalary) : undefined,
        salary_max: j.maximumSalary ? Math.round(j.maximumSalary) : undefined,
        salary_currency: 'GBP',
        description: stripHtml(j.jobDescription).slice(0, 4000),
        source: 'Reed',
        source_url: j.jobUrl,
        posted_date: undefined,
      }),
    )
  } catch {
    return []
  }
}

// ─── Jobicy (remote jobs, dev industry, no key) ──────────────
async function fromJobicy(query) {
  try {
    const data = await fetchJson('https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev')
    const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    return (data.jobs || [])
      .filter((j) => {
        const hay = (j.jobTitle || '').toLowerCase()
        const lvl = (j.jobLevel || '').toLowerCase()
        return /junior|graduate|entry|trainee|junior/.test(hay) || lvl.includes('junior') || lvl.includes('entry') || q.some((w) => hay.includes(w))
      })
      .slice(0, 25)
      .map((j) =>
        baseJob({
          id: `jcy-${j.id}`,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo || 'Remote',
          remote_type: 'remote',
          description: stripHtml(j.jobExcerpt || j.jobDescription || '').slice(0, 4000),
          source: 'Jobicy',
          source_url: j.url,
          posted_date: (j.pubDate || '').slice(0, 10),
        }),
      )
  } catch {
    return []
  }
}

// ─── Civil Service Jobs (UK government, no key) ──────────────
async function fetchText(url, opts) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 14000)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function parseRss(xml) {
  const items = []
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = re.exec(xml)) !== null) {
    const body = m[1]
    const x = (tag) => {
      const r = new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`,
        'is',
      )
      const hit = body.match(r)
      return hit ? hit[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim() : ''
    }
    items.push({
      title: x('title'),
      link: x('link') || x('guid'),
      description: x('description'),
      location: x('location') || x('job_location'),
      salary: x('salary') || x('salary_range'),
      closingDate: x('closing_date') || x('apply_by') || x('pubDate'),
      department: x('department') || x('company') || x('company_name'),
      category: x('category'),
    })
  }
  return items
}

function parseSalary(str = '') {
  const nums = str.replace(/,/g, '').match(/\d{4,6}/g)
  if (!nums) return {}
  return {
    salary_min: Math.round(Number(nums[0])),
    salary_max: nums[1] ? Math.round(Number(nums[1])) : Math.round(Number(nums[0]) * 1.2),
  }
}

async function fromCivilService(query) {
  try {
    const q = encodeURIComponent(query)
    // Try the main Civil Service Jobs RSS feed with a keyword search
    const url = `https://www.civilservicejobs.service.gov.uk/csr/jobs.cgi?pageaction=searchresults&fld_search_description=${q}&fld_jobsource=rss`
    const xml = await fetchText(url)
    const items = parseRss(xml)
    return items
      .filter((it) => it.title && it.link)
      .slice(0, 20)
      .map((it) =>
        baseJob({
          id: `cs-${slug(it.link || it.title)}`,
          title: it.title,
          company: it.department || 'Civil Service',
          location: it.location || 'UK',
          remote_type: remoteType(`${it.title} ${it.description} ${it.location}`),
          ...parseSalary(it.salary),
          salary_currency: 'GBP',
          description: stripHtml(it.description).slice(0, 4000),
          source: 'Civil Service Jobs',
          source_url: it.link,
          posted_date: (it.closingDate || '').slice(0, 10),
          job_type: 'public_sector',
        }),
      )
  } catch {
    return []
  }
}

// ─── Find A Job – DWP (UK government board, no key) ──────────
async function fromFindAJob(query, location) {
  try {
    const q = encodeURIComponent(query)
    const loc = location && /london|uk|united kingdom/i.test(location) ? encodeURIComponent('London') : 'UK'
    // FindAJob public RSS/search feed
    const url = `https://findajob.dwp.gov.uk/search?q=${q}&l=${loc}&pp=25&fmt=rss`
    const xml = await fetchText(url)
    const items = parseRss(xml)
    return items
      .filter((it) => it.title && it.link)
      .slice(0, 20)
      .map((it) =>
        baseJob({
          id: `faj-${slug(it.link || it.title)}`,
          title: it.title,
          company: it.department || 'Unknown',
          location: it.location || location || 'UK',
          remote_type: remoteType(`${it.title} ${it.description} ${it.location}`),
          salary_currency: 'GBP',
          description: stripHtml(it.description).slice(0, 4000),
          source: 'Find A Job (GOV.UK)',
          source_url: it.link,
          posted_date: (it.closingDate || '').slice(0, 10),
        }),
      )
  } catch {
    return []
  }
}

// ─── Aggregate + dedupe + junior-first ranking ───────────────
function juniorRank(title = '') {
  if (/\b(junior|graduate|entry[- ]?level|trainee|apprentice|placement|intern)\b/i.test(title)) return 0
  if (/\b(senior|lead|principal|staff|head of|director|manager|vp|architect)\b/i.test(title)) return 2
  return 1
}

export async function searchSources(queries, location, track = 'tech') {
  const qs = (Array.isArray(queries) ? queries : [queries]).map((q) => String(q || '').trim()).filter(Boolean)
  const fallback = track === 'construction' ? 'traffic marshal' : 'junior software developer'
  const list = qs.length ? qs.slice(0, 4) : [fallback]
  const primary = list[0]

  let tasks
  if (track === 'construction') {
    // Construction/site roles live on UK general boards (Adzuna, Reed, GOV.UK
    // Find A Job) — not on the remote-tech boards. Query several titles to widen
    // coverage. Adzuna/Reed need a free key; Find A Job works without one.
    tasks = [
      fromFindAJob(primary, location),
      fromArbeitnow(list.join(' ')),
    ]
    for (const q of list.slice(0, 3)) {
      tasks.push(fromAdzuna(q, location), fromReed(q, location))
    }
  } else {
    tasks = [
      fromAdzuna(primary, location),
      fromReed(primary, location),
      fromArbeitnow(list.join(' ')), // keyword-filtered across all target titles
      fromTheMuse(primary, location), // Entry-Level filtered
      fromJobicy(primary),
      fromCivilService(primary),          // UK Civil Service Jobs
      fromFindAJob(primary, location),    // GOV.UK Find A Job
    ]
    // Remotive is a keyword search — run it for each target title
    for (const q of list.slice(0, 3)) tasks.push(fromRemotive(q))
  }

  const results = await Promise.all(tasks)
  const all = results.flat().filter((j) => j.title && j.company && j.source_url)

  const seen = new Set()
  const deduped = []
  for (const j of all) {
    const key = (j.source_url || `${j.title}|${j.company}`).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(j)
  }
  // Civil service + junior/graduate roles first, senior roles last
  deduped.sort((a, b) => {
    const isGovA = a.source === 'Civil Service Jobs' || a.source === 'Find A Job (GOV.UK)' ? -1 : 0
    const isGovB = b.source === 'Civil Service Jobs' || b.source === 'Find A Job (GOV.UK)' ? -1 : 0
    const rankA = juniorRank(a.title) + isGovA
    const rankB = juniorRank(b.title) + isGovB
    return rankA - rankB
  })
  return deduped
}
