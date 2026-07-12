// ─────────────────────────────────────────────────────────────
// profileCompletion.ts — deterministic profile-completion score.
// Never an AI-generated percentage: computed from defined required
// sections so it's transparent and reproducible.
// ─────────────────────────────────────────────────────────────

export interface CompletionSection {
  key: string
  label: string
  complete: boolean
}

export interface ProfileCompletion {
  percent: number
  sections: CompletionSection[]
  missing: CompletionSection[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function has(v: any): boolean {
  if (Array.isArray(v)) return v.length > 0
  if (v && typeof v === 'object') return Object.keys(v).length > 0
  return typeof v === 'string' ? v.trim().length > 0 : !!v
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeProfileCompletion(profile: any): ProfileCompletion {
  const p = profile || {}
  const prefs = p.preferences || {}
  const sections: CompletionSection[] = [
    { key: 'full_name', label: 'Name', complete: has(p.full_name) },
    { key: 'location', label: 'Location', complete: has(p.location) },
    { key: 'headline', label: 'Headline', complete: has(p.headline) },
    { key: 'summary', label: 'Professional summary', complete: has(p.summary) },
    { key: 'skills', label: 'Skills', complete: has(p.skills) && Object.values(p.skills || {}).flat().length > 0 },
    { key: 'experience_or_projects', label: 'Experience or projects', complete: has(p.experience) || has(p.projects) },
    { key: 'education', label: 'Education', complete: has(p.education) },
    { key: 'target_roles', label: 'Target roles', complete: has(prefs.titles) },
    { key: 'preferred_locations', label: 'Preferred locations', complete: has(prefs.locations) },
    { key: 'work_preference', label: 'Work preference', complete: has(prefs.work_styles) || has(prefs.seniority) },
    { key: 'salary_range', label: 'Salary range', complete: !!(prefs.salary_min || prefs.salary_max) },
  ]
  const done = sections.filter((s) => s.complete).length
  return {
    percent: Math.round((done / sections.length) * 100),
    sections,
    missing: sections.filter((s) => !s.complete),
  }
}
