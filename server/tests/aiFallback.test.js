import { describe, expect, it } from 'vitest'
import { heuristicQuestions, heuristicScore } from '../ai.js'

describe('truth-first AI fallbacks', () => {
  it('does not award a high score when no candidate evidence matches', () => {
    const result = heuristicScore(
      { full_name: 'Candidate', skills: {}, experience: [], preferences: {} },
      { title: 'Senior Platform Engineer', company: 'Example', location: 'Leeds', description: 'Kubernetes and Go. 7+ years required.' },
    )
    expect(result.overall_score).toBeLessThan(45)
    expect(result.matched_skills).toEqual([])
    expect(result.explanation).not.toMatch(/your agile|project delivery experience/i)
  })

  it('does not invent a technology, project or employment background in interview tips', () => {
    const questions = heuristicQuestions(
      { skills: {}, projects: [] },
      { title: 'Operations Assistant', company: 'Example', match_analysis: { matched_skills: [], missing_skills: [] } },
    )
    const text = JSON.stringify(questions)
    expect(text).not.toMatch(/Java|Spring Boot|Node\.js|JUnit|salon|freelance/i)
    expect(text).toContain('real example')
  })
})
