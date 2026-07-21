// Consent-gated profile updates proposed by AI Coach.
// The model can suggest a small allow-listed patch; only the authenticated
// confirmation endpoint is allowed to merge and persist it.

const MAX_LIST = 40

const cleanString = (value, max = 2000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

const cleanStringList = (value, max = MAX_LIST) => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .map((item) => cleanString(item, 300))
    .filter((item) => {
      const key = item.toLowerCase()
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, max)
}

const cleanObjectList = (value, fields, required) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const out = {}
      for (const field of fields) {
        if (field === 'tech') out.tech = cleanStringList(item.tech)
        else {
          const text = cleanString(item[field], ['detail', 'description', 'note'].includes(field) ? 4000 : 500)
          if (text) out[field] = text
        }
      }
      return required.some((field) => out[field]) ? out : null
    })
    .filter(Boolean)
    .slice(0, 20)
}

export function sanitizeCoachProfileUpdate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
  const raw = candidate.changes && typeof candidate.changes === 'object' && !Array.isArray(candidate.changes)
    ? candidate.changes
    : {}
  const changes = {}

  for (const field of ['full_name', 'email', 'phone', 'website', 'linkedin', 'github', 'location', 'headline', 'summary', 'goals']) {
    const value = cleanString(raw[field], ['summary', 'goals'].includes(field) ? 4000 : 500)
    if (value) changes[field] = value
  }

  if (raw.skills && typeof raw.skills === 'object' && !Array.isArray(raw.skills)) {
    const skills = {}
    for (const [category, values] of Object.entries(raw.skills).slice(0, 15)) {
      const safeCategory = cleanString(category, 80)
      const safeValues = cleanStringList(values)
      if (safeCategory && safeValues.length) skills[safeCategory] = safeValues
    }
    if (Object.keys(skills).length) changes.skills = skills
  }

  for (const field of ['cards_certifications', 'certifications', 'skills_to_learn']) {
    const list = cleanStringList(raw[field])
    if (list.length) changes[field] = list
  }

  const experience = cleanObjectList(raw.experience, ['role', 'company', 'dates', 'startDate', 'endDate', 'detail'], ['role'])
  const education = cleanObjectList(raw.education, ['institution', 'degree', 'dates', 'note'], ['institution', 'degree'])
  const projects = cleanObjectList(raw.projects, ['name', 'year', 'detail', 'description', 'tech', 'github_url', 'live_url'], ['name'])
  if (experience.length) changes.experience = experience
  if (education.length) changes.education = education
  if (projects.length) changes.projects = projects

  if (raw.preferences && typeof raw.preferences === 'object' && !Array.isArray(raw.preferences)) {
    const preferences = {}
    for (const field of ['titles', 'seniority', 'locations', 'work_styles', 'avoid']) {
      const list = cleanStringList(raw.preferences[field])
      if (list.length) preferences[field] = list
    }
    for (const field of ['salary_min', 'salary_max']) {
      const value = Number(raw.preferences[field])
      if (Number.isFinite(value) && value >= 0 && value <= 10000000) preferences[field] = Math.round(value)
    }
    const currency = cleanString(raw.preferences.currency, 10)
    if (currency) preferences.currency = currency
    if (Object.keys(preferences).length) changes.preferences = preferences
  }

  if (raw.additional && typeof raw.additional === 'object' && !Array.isArray(raw.additional)) {
    const additional = {}
    for (const field of ['availability', 'right_to_work', 'driving_licence']) {
      const value = cleanString(raw.additional[field], 500)
      if (value) additional[field] = value
    }
    const languages = cleanStringList(raw.additional.languages)
    if (languages.length) additional.languages = languages
    if (Object.keys(additional).length) changes.additional = additional
  }

  if (!Object.keys(changes).length) return null
  return {
    summary: cleanString(candidate.summary, 1200) || 'Add the details shared in this conversation to your profile.',
    changes,
  }
}

const mergeStringLists = (current, incoming) => {
  const result = Array.isArray(current) ? [...current] : []
  const seen = new Set(result.map((item) => String(item).toLowerCase()))
  for (const item of incoming || []) {
    const key = String(item).toLowerCase()
    if (!seen.has(key)) {
      result.push(item)
      seen.add(key)
    }
  }
  return result
}

const mergeObjectList = (current, incoming, identity) => {
  const result = Array.isArray(current) ? current.map((item) => ({ ...item })) : []
  for (const item of incoming || []) {
    const key = identity(item)
    const index = result.findIndex((existing) => identity(existing) === key)
    if (index === -1) result.push({ ...item })
    else {
      const merged = { ...result[index], ...item }
      if (Array.isArray(result[index].tech) || Array.isArray(item.tech)) {
        merged.tech = mergeStringLists(result[index].tech, item.tech)
      }
      result[index] = merged
    }
  }
  return result
}

export function mergeCoachProfileUpdate(profile, candidate, track = 'tech') {
  const proposal = sanitizeCoachProfileUpdate(candidate)
  if (!proposal) throw new Error('This profile update has no supported details.')
  const changes = proposal.changes
  const next = { ...(profile || {}), track: track === 'construction' ? 'construction' : 'tech' }

  for (const field of ['full_name', 'email', 'phone', 'website', 'linkedin', 'github', 'location', 'headline', 'summary', 'goals']) {
    if (changes[field]) next[field] = changes[field]
  }

  if (changes.skills) {
    next.skills = { ...(next.skills || {}) }
    for (const [category, values] of Object.entries(changes.skills)) {
      const existingKey = Object.keys(next.skills).find((key) => key.toLowerCase() === category.toLowerCase()) || category
      next.skills[existingKey] = mergeStringLists(next.skills[existingKey], values)
    }
  }

  for (const field of ['cards_certifications', 'certifications', 'skills_to_learn']) {
    if (changes[field]) next[field] = mergeStringLists(next[field], changes[field])
  }

  if (changes.experience) {
    next.experience = mergeObjectList(next.experience, changes.experience, (item) =>
      `${String(item.role || '').toLowerCase()}|${String(item.company || '').toLowerCase()}`,
    )
  }
  if (changes.education) {
    next.education = mergeObjectList(next.education, changes.education, (item) =>
      `${String(item.institution || '').toLowerCase()}|${String(item.degree || '').toLowerCase()}`,
    )
  }
  if (changes.projects) {
    next.projects = mergeObjectList(next.projects, changes.projects, (item) => String(item.name || '').toLowerCase())
  }

  if (changes.preferences) {
    next.preferences = { ...(next.preferences || {}) }
    for (const field of ['titles', 'seniority', 'locations', 'work_styles', 'avoid']) {
      if (changes.preferences[field]) {
        next.preferences[field] = mergeStringLists(next.preferences[field], changes.preferences[field])
      }
    }
    for (const field of ['salary_min', 'salary_max', 'currency']) {
      if (changes.preferences[field] !== undefined) next.preferences[field] = changes.preferences[field]
    }
  }

  if (changes.additional) {
    next.additional = { ...(next.additional || {}), ...changes.additional }
    if (changes.additional.languages) {
      next.additional.languages = mergeStringLists(profile?.additional?.languages, changes.additional.languages)
    }
  }

  return { profile: next, proposal }
}
