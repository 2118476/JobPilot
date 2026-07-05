// ─────────────────────────────────────────────────────────────
// searchRunner.js — the core "fetch + merge + AI-score" routine,
// shared by the /api/jobs/search route and the background scheduler.
// Always scoped to a userId.
// ─────────────────────────────────────────────────────────────
import { getProfile, getActiveTrack, getJobs, saveJobs } from './store.js'
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

/**
 * Run a search for a user: fetch from sources, merge with their stored jobs,
 * AI-score the new ones, persist. Returns counts + the newly-scored jobs.
 */
export async function runSearch(userId, { query, location, scoreLimit = 15 } = {}) {
  const track = await getActiveTrack(userId)
  const profile = await getProfile(userId)
  const queries = query
    ? [query]
    : profile.preferences?.titles?.length
    ? profile.preferences.titles
    : ['junior software developer']
  const loc = location || 'London, UK'

  const fetched = await searchSources(queries, loc, track)

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

  const unscored = merged.filter((j) => !j.match_analysis).slice(0, Math.min(scoreLimit, 25))
  await mapLimit(unscored, 2, async (job) => attachAnalysis(job, await scoreJob(profile, job)))

  await saveJobs(userId, merged)
  return { total: merged.length, fetched: fetched.length, added, scored: unscored.length, jobs: merged, newlyScored: unscored }
}
