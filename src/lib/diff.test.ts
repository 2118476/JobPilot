import { describe, it, expect } from 'vitest'
import { diffLines, diffStats } from './diff'

describe('diffLines', () => {
  it('marks identical documents as all same', () => {
    const rows = diffLines('a\nb\nc', 'a\nb\nc')
    expect(rows.every((r) => r.type === 'same')).toBe(true)
    expect(rows.length).toBe(3)
  })

  it('detects added and removed lines', () => {
    const rows = diffLines('keep\nold line', 'keep\nnew line')
    const stats = diffStats(rows)
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
    expect(stats.same).toBe(1)
  })

  it('aligns unchanged context around an insertion', () => {
    const rows = diffLines('one\ntwo', 'one\ninserted\ntwo')
    expect(rows.map((r) => r.type)).toEqual(['same', 'added', 'same'])
    expect(rows[1].left).toBeNull()
    expect(rows[1].right).toBe('inserted')
  })

  it('computes changed percentage', () => {
    const stats = diffStats(diffLines('a\nb', 'a\nc'))
    expect(stats.changedPct).toBeGreaterThan(0)
    expect(stats.changedPct).toBeLessThanOrEqual(100)
  })
})
