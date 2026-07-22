// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { mergeCvProfileSections, type CvProfileSection } from '@/lib/cvProfileMerge'

const sections = (enabled: CvProfileSection[]) => ({
  personal: enabled.includes('personal'),
  experience: enabled.includes('experience'),
  education: enabled.includes('education'),
  projects: enabled.includes('projects'),
  skills: enabled.includes('skills'),
  certifications: enabled.includes('certifications'),
  languages: enabled.includes('languages'),
})

describe('CV profile section merge', () => {
  it('changes only approved sections and never erases existing values with empty extraction', () => {
    const existing = {
      full_name: 'Existing Name',
      email: 'existing@example.com',
      preferences: { titles: ['Support Analyst'] },
      skills: { Core: ['Windows'] },
    }
    const extracted = {
      full_name: 'Uploaded Name',
      email: '',
      skills: { Core: ['Microsoft 365'] },
    }

    const merged = mergeCvProfileSections(existing, extracted, sections(['personal']))

    expect(merged.full_name).toBe('Uploaded Name')
    expect(merged.email).toBe('existing@example.com')
    expect(merged.preferences).toEqual(existing.preferences)
    expect(merged.skills).toEqual(existing.skills)
  })

  it('deduplicates matching experience and merges its populated fields', () => {
    const merged = mergeCvProfileSections(
      { experience: [{ role: 'Support Analyst', company: 'Acme', dates: '2022-2024', detail: 'Tickets' }] },
      { experience: [{ role: 'support analyst', company: 'ACME', detail: 'Tickets and Microsoft 365', tech: ['M365'] }] },
      sections(['experience']),
    )

    const experience = merged.experience as Record<string, unknown>[]
    expect(experience).toHaveLength(1)
    expect(experience[0]).toMatchObject({
      role: 'support analyst',
      company: 'ACME',
      dates: '2022-2024',
      detail: 'Tickets and Microsoft 365',
      tech: ['M365'],
    })
  })

  it('places languages in additional details and construction certificates in cards', () => {
    const merged = mergeCvProfileSections(
      { additional: { right_to_work: 'UK Citizen', languages: ['English'] }, cards_certifications: ['CSCS'] },
      { languages: ['English', 'Amharic'], certifications: ['CSCS', 'CPCS'] },
      sections(['languages', 'certifications']),
      'construction',
    )

    expect(merged.additional).toEqual({ right_to_work: 'UK Citizen', languages: ['English', 'Amharic'] })
    expect(merged.certifications).toEqual(['CSCS', 'CPCS'])
    expect(merged.cards_certifications).toEqual(['CSCS', 'CPCS'])
    expect(merged).not.toHaveProperty('languages')
  })
})
