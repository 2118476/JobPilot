export type CvProfileSection = 'personal' | 'experience' | 'education' | 'projects' | 'skills' | 'certifications' | 'languages'

export const CV_PERSONAL_FIELDS = ['full_name', 'email', 'phone', 'location', 'headline', 'summary', 'website', 'github', 'linkedin'] as const
export const CV_PROFILE_SECTIONS: CvProfileSection[] = ['personal', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages']

type ExtractedProfile = Record<string, unknown>

const normalise = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const mergeStrings = (existing: unknown, incoming: unknown): string[] => {
  const output: string[] = []
  const seen = new Set<string>()
  for (const value of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const text = String(value || '').trim()
    const key = normalise(text)
    if (text && !seen.has(key)) {
      output.push(text)
      seen.add(key)
    }
  }
  return output
}

const itemIdentity = (section: CvProfileSection, item: unknown) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return normalise(item)
  const entry = item as Record<string, unknown>
  if (section === 'experience') return `${normalise(entry.role)}|${normalise(entry.company)}`
  if (section === 'education') return `${normalise(entry.institution)}|${normalise(entry.degree)}`
  if (section === 'projects') return normalise(entry.name)
  return normalise(JSON.stringify(item))
}

const mergeObjects = (existing: unknown, incoming: unknown, section: CvProfileSection): unknown[] => {
  const output = (Array.isArray(existing) ? existing : []).map((item) => ({ ...(item as Record<string, unknown>) }))
  const indexes = new Map(output.map((item, index) => [itemIdentity(section, item), index]))
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const item = raw as Record<string, unknown>
    const key = itemIdentity(section, item)
    if (!key.replace(/\|/g, '')) continue
    const existingIndex = indexes.get(key)
    if (existingIndex === undefined) {
      indexes.set(key, output.length)
      output.push({ ...item })
      continue
    }
    const current = output[existingIndex] as Record<string, unknown>
    const next = { ...current }
    for (const [field, value] of Object.entries(item)) {
      if (Array.isArray(value)) next[field] = mergeStrings(current[field], value)
      else if (String(value || '').trim()) next[field] = value
    }
    output[existingIndex] = next
  }
  return output
}

/** Merge only the CV sections explicitly approved by the user. */
export function mergeCvProfileSections(
  existingProfile: ExtractedProfile,
  extractedProfile: ExtractedProfile,
  selected: Record<CvProfileSection, boolean>,
  suggestedTrack: 'tech' | 'construction' = 'tech',
  choices: Record<string, 'new' | 'old'> = {},
): ExtractedProfile {
  const merged: ExtractedProfile = { ...existingProfile }
  if (selected.personal) {
    for (const field of CV_PERSONAL_FIELDS) {
      const oldValue = String(existingProfile[field] || '')
      const newValue = String(extractedProfile[field] || '').trim()
      if (choices[field] === 'old') merged[field] = oldValue
      else if (newValue) merged[field] = newValue
    }
  }

  for (const section of ['education', 'experience', 'projects'] as CvProfileSection[]) {
    if (selected[section]) merged[section] = mergeObjects(existingProfile[section], extractedProfile[section], section)
  }

  if (selected.skills) {
    const oldSkills = existingProfile.skills && typeof existingProfile.skills === 'object' && !Array.isArray(existingProfile.skills)
      ? existingProfile.skills as Record<string, string[]>
      : {}
    const newSkills = extractedProfile.skills && typeof extractedProfile.skills === 'object' && !Array.isArray(extractedProfile.skills)
      ? extractedProfile.skills as Record<string, string[]>
      : {}
    const skills: Record<string, string[]> = { ...oldSkills }
    for (const [category, items] of Object.entries(newSkills)) {
      const existingKey = Object.keys(skills).find((key) => normalise(key) === normalise(category)) || category
      skills[existingKey] = mergeStrings(skills[existingKey], items)
    }
    merged.skills = skills
  }

  if (selected.certifications) {
    const certifications = mergeStrings(existingProfile.certifications, extractedProfile.certifications)
    merged.certifications = certifications
    if (suggestedTrack === 'construction') {
      merged.cards_certifications = mergeStrings(existingProfile.cards_certifications, certifications)
    }
  }

  if (selected.languages) {
    const additional = existingProfile.additional && typeof existingProfile.additional === 'object' && !Array.isArray(existingProfile.additional)
      ? existingProfile.additional as Record<string, unknown>
      : {}
    merged.additional = {
      ...additional,
      languages: mergeStrings(additional.languages, extractedProfile.languages),
    }
    delete merged.languages
  }
  return merged
}
