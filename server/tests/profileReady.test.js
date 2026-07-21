import { describe, expect, it } from 'vitest'
import { profileReady } from '../store.js'

describe('profile readiness', () => {
  it('does not treat identity-only sign-up data as an AI-ready profile', () => {
    expect(profileReady({ full_name: 'New User' })).toBe(false)
    expect(profileReady({ full_name: 'New User', preferences: { titles: ['Developer'] } })).toBe(false)
  })

  it('requires a target and truthful career evidence', () => {
    expect(profileReady({
      full_name: 'Ready User',
      preferences: { titles: ['Developer'] },
      skills: { Core: ['Java'] },
    })).toBe(true)
  })
})
