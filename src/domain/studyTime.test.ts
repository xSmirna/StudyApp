import { describe, expect, it } from 'vitest'
import {
  accrueActiveSeconds,
  summarizeStudyTime,
  startOfLocalWeek,
} from './studyTime'
import { toLocalDateKey } from './spacedRepetition'

describe('accrueActiveSeconds', () => {
  it('counts visible active time using wall-clock deltas', () => {
    const result = accrueActiveSeconds({
      lastTickAt: 1_000,
      now: 4_000,
      lastInteractionAt: 3_500,
      visible: true,
      active: true,
      idleTimeoutMs: 60_000,
    })
    expect(result.seconds).toBe(3)
    expect(result.stillActive).toBe(true)
  })

  it('stops at the idle deadline and does not count background time', () => {
    const idle = accrueActiveSeconds({
      lastTickAt: 1_000,
      now: 70_000,
      lastInteractionAt: 1_000,
      visible: true,
      active: true,
      idleTimeoutMs: 60_000,
    })
    expect(idle.seconds).toBe(60)
    expect(idle.stillActive).toBe(false)

    const hidden = accrueActiveSeconds({
      lastTickAt: 1_000,
      now: 10_000,
      lastInteractionAt: 9_000,
      visible: false,
      active: true,
    })
    expect(hidden.seconds).toBe(0)
  })
})

describe('summarizeStudyTime', () => {
  it('uses local calendar dates for today/week/total', () => {
    const now = new Date(2026, 10, 13, 12, 0, 0) // Friday local
    const weekStart = startOfLocalWeek(now)
    const summary = summarizeStudyTime(
      [
        { localDate: toLocalDateKey(now), seconds: 120 },
        { localDate: toLocalDateKey(weekStart), seconds: 300 },
        { localDate: '2026-10-01', seconds: 50 },
      ],
      now,
    )
    expect(summary.todaySeconds).toBe(120)
    expect(summary.weekSeconds).toBe(420)
    expect(summary.totalSeconds).toBe(470)
  })
})
