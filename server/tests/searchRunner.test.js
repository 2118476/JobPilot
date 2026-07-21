import { describe, expect, it } from 'vitest'
import { applySearchFilters } from '../searchRunner.js'
import { searchSources } from '../sources.js'

const NOW = Date.parse('2026-07-21T12:00:00Z')
const jobs = [
  { id: '1', title: 'Junior Developer', company: 'Good Ltd', remote_type: 'remote', salary_min: 30000, salary_max: 38000, posted_date: '2026-07-20' },
  { id: '2', title: 'Senior Developer', company: 'Blocked Corp', remote_type: 'onsite', salary_min: 60000, salary_max: 80000, posted_date: '2026-06-01' },
  { id: '3', title: 'Graduate Engineer', company: 'Good Ltd', remote_type: 'hybrid', salary_min: 25000, salary_max: 29000, posted_date: '2026-07-19' },
]

describe('search preferences', () => {
  it('applies account exclusions, arrangement, salary and recency filters', () => {
    const filtered = applySearchFilters(jobs, {
      excluded_companies: ['blocked'],
      excluded_titles: ['senior'],
      exclusions: [],
      work_arrangements: ['remote', 'hybrid'],
      remote_preference: 'no_preference',
      salary_min: 30000,
      salary_max: 50000,
      date_posted_days: 7,
    }, NOW)
    expect(filtered.map((job) => job.id)).toEqual(['1'])
  })

  it('does not contact providers when every source is disabled', async () => {
    await expect(searchSources(['developer'], 'London', 'tech', { sources: [] })).resolves.toEqual([])
  })
})
