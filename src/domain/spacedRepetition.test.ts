import { describe, expect, it } from 'vitest'
import { nextReviewState } from './spacedRepetition'

describe('nextReviewState', () => {
  const now = new Date('2026-11-13T15:30:00')

  it('schedules incorrect for the next local day and resets streak', () => {
    const result = nextReviewState(
      'q1',
      {
        questionId: 'q1',
        intervalDays: 12,
        successfulReviewCount: 3,
        attemptCount: 3,
        incorrectCount: 0,
        lastOutcome: 'correct',
      },
      'incorrect',
      now,
    )
    expect(result.intervalDays).toBe(1)
    expect(result.successfulReviewCount).toBe(0)
    expect(result.incorrectCount).toBe(1)
    expect(new Date(result.nextDueAt!).getDate()).toBe(14)
  })

  it('uses 3 days for first correct and doubles later up to 60', () => {
    const first = nextReviewState('q1', undefined, 'correct', now)
    expect(first.intervalDays).toBe(3)
    expect(first.successfulReviewCount).toBe(1)

    const second = nextReviewState('q1', first, 'correct', now)
    expect(second.intervalDays).toBe(6)

    let state = second
    for (let i = 0; i < 10; i += 1) {
      state = nextReviewState('q1', state, 'correct', now)
    }
    expect(state.intervalDays).toBeLessThanOrEqual(60)
  })

  it('schedules partially correct in 2 days', () => {
    const result = nextReviewState('q1', undefined, 'partially_correct', now)
    expect(result.intervalDays).toBe(2)
    expect(result.successfulReviewCount).toBe(0)
  })
})
