// ─────────────────────────────────────────────────────────────
// searchRunner.js — the core "fetch + merge + AI-score" routine,
// shared by the /api/jobs/search route and the background scheduler.
// Always scoped to a userId.
// ─────────────────────────────────────────────────────────────
import { getProfile, getActiveTrack, getJobs, saveJobs, getSearchSettings, profileReady } from './store.js'
import { scoreJob } from './ai.js'
import { searchSources } from './sources.js'

async function mapLimit(items, limit, fn) {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
}

export function attachAnalysis(job, s) {
  job.match_score = s.overall_score
  job.match_analysis = {
    id: `ma-${job.id}`,
    job_id: job.id,
    overall_score: s.overall_score,
    skill_match_score: s.skill_match_score,
    experience_match_score: s.experience_match_score,
    location_match_score: s.location_match_score,
    salary_match_score: s.salary_match_score,
    explanation: s.explanation,
    matched_skills: s.matched_skills,
    missing_skills: s.missing_skills,
    skill_gaps: (s.missing_skills || []).map((skill) => ({
      skill,
      required_level: 'intermediate',
      user_level: 'beginner',
      gap_description: `Strengthen ${skill} to be a stronger match`,
    })),
    created_at: new Date().toISOString(),
  }
  job.updated_at = new Date().toISOString()
  return job
}

export function applySearchFilters(jobs, settings, now = Date.now()) {
  const excludedCompanies = (settings.excluded_companies || []).map((value) => value.toLowerCase())
  const excludedTitles = [...(settings.excluded_titles || []), ...(settings.exclusions || [])].map((value) => value.toLowerCase())
  const workArrangements = new Set(settings.work_arrangements || [])
  const postedAfter = settings.date_posted_days
    ? now - settings.date_posted_days * 24 * 60 * 60 * 1000
    : 0
  return jobs.filter((job) => {
    const company = String(job.company || '').toLowerCase()
    const title = String(job.title || '').toLowerCase()
    if (excludedCompanies.some((value) => company.includes(value))) return false
    if (excludedTitles.some((value) => title.includes(value))) return false
    if (settings.remote_preference && settings.remote_preference !== 'no_preference' && job.remote_type !== settings.remote_preference) return false
    if (workArrangements.size && !workArrangements.has(job.remote_type)) return false
    if (settings.salary_min && job.salary_max && job.salary_max < settings.salary_min) return false
    if (settings.salary_max && job.salary_min && job.salary_min > settings.salary_max) return false
    if (postedAfter && job.posted_date) {
      const posted = Date.parse(job.posted_date)
      if (Number.isFinite(posted) && posted < postedAfter) return false
    }
    return true
  })
}

/**
 * Run a search for a user: fetch from sources, merge with their stored jobs,
 * AI-score the new ones, persist. Returns counts + the newly-scored jobs.
 */
export async function runSearch(userId, { query, location, scoreLimit = 15 } = {}) {
  const track = await getActiveTrack(userId)
  const [profile, settings] = await Promise.all([getProfile(userId), getSearchSettings(userId)])
  const profileTitles = profile.preferences?.titles || []
  const experienceTitles = (profile.experience || []).map((item) => item?.title || item?.role).filter(Boolean)
  const queries = query
    ? [query]
    : settings.query
      ? [settings.query]
      : settings.job_titles?.length
        ? settings.job_titles
        : profileTitles.length
          ? profileTitles
          : experienceTitles.length
            ? experienceTitles
            : settings.keywords?.length
              ? settings.keywords
              : [track === 'construction' ? 'traffic marshal' : profile.headline || 'junior software developer']
  const loc = location || settings.preferred_locations?.[0] || settings.location || profile.preferences?.locations?.[0] || profile.location || 'UK'

  const rawFetched = await searchSources(queries, loc, track, { sources: settings.sources })
  const fetched = applySearchFilters(rawFetched, settings)

  const existing = await getJobs(userId)
  const byUrl = new Map(existing.map((j) => [(j.source_url || j.id).toLowerCase(), j]))
  let added = 0
  for (const j of fetched) {
    const key = (j.source_url || j.id).toLowerCase()
    if (!byUrl.has(key)) {
      j.user_id = userId // scope every stored job to its owner
      byUrl.set(key, j)
      added++
    }
  }
  const merged = [...byUrl.values()]

  const unscored = profileReady(profile)
    ? merged.filter((j) => !j.match_analysis).slice(0, Math.min(scoreLimit, 25))
    : []
  await mapLimit(unscored, 2, async (job) => attachAnalysis(job, await scoreJob(profile, job)))

  await saveJobs(userId, merged)
  return { total: merged.length, fetched: fetched.length, added, scored: unscored.length, jobs: merged, newlyScored: unscored }
}
