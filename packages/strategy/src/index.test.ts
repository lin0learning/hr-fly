import { describe, expect, it } from 'vitest'
import {
  adviseTrip,
  createDefaultUserState,
  getBoundaryOptions,
  getCalendarQuarter,
  getHomeBanner,
  resolveQuarterForDate,
} from './index'

describe('strategy engine', () => {
  const state2026 = createDefaultUserState(2026)

  it('2026-10-01 eligible Q4', () => {
    const advice = adviseTrip('2026-10-01', state2026)
    expect(advice.reimbursementMode).toBe('eligible')
    expect(advice.suggestedQuarter).toBe('Q4')
  })

  it('2026-09-30 boundary choice required', () => {
    const advice = adviseTrip('2026-09-30', state2026)
    expect(advice.reimbursementMode).toBe('boundary_choice_required')
    expect(advice.boundaryOptions).toEqual(['Q3', 'Q4'])
  })

  it('2026-09-30 with Q3 assignment but Q3 used', () => {
    const state = {
      ...state2026,
      quarters: { ...state2026.quarters, Q3: { reimbursed: true } },
      boundaryAssignments: [{ date: '2026-09-30', assignTo: 'Q3' as const }],
    }
    const advice = adviseTrip('2026-09-30', state)
    expect(advice.reimbursementMode).toBe('quota_used')
  })

  it('2026-01-01 assign to Q4 via prevQ4 pattern', () => {
    const state = {
      ...state2026,
      boundaryAssignments: [{ date: '2026-01-01', assignTo: 'Q4' as const }],
    }
    expect(resolveQuarterForDate('2026-01-01', state)).toBe('Q4')
  })

  it('2026-04-04 qingming self pay', () => {
    const advice = adviseTrip('2026-04-04', state2026)
    expect(advice.reimbursementMode).toBe('self_pay')
  })

  it('Q3 used warns on august trip', () => {
    const state = {
      ...state2026,
      quarters: { ...state2026.quarters, Q3: { reimbursed: true } },
    }
    const advice = adviseTrip('2026-08-15', state)
    expect(advice.reimbursementMode).toBe('quota_used')
  })

  it('home banner includes quarter status', () => {
    const banner = getHomeBanner('2026-07-06', state2026)
    expect(banner.lines[0]).toContain('第三季度')
  })

  it('boundary options for 10-01', () => {
    expect(getBoundaryOptions('2026-10-01')).toEqual(['Q3', 'Q4'])
  })

  it('calendar quarter', () => {
    expect(getCalendarQuarter('2026-10-01')).toBe('Q4')
    expect(getCalendarQuarter('2026-03-15')).toBe('Q1')
  })
})
