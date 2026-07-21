import { describe, expect, it } from 'vitest'
import { slotsFor } from '../scheduler.js'

describe('per-account search schedules', () => {
  it('uses the account morning and evening times', () => {
    expect(slotsFor({ frequency: 'twice_daily', morning_time: '07:15', evening_time: '19:45' })).toEqual(['07:15', '19:45'])
    expect(slotsFor({ frequency: 'daily', morning_time: '09:30' })).toEqual(['09:30'])
    expect(slotsFor({ frequency: 'manual' })).toEqual([])
  })
})
