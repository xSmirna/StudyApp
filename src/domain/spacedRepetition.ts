import type { AttemptOutcome, QuestionReviewState } from './quizTypes'

/**
 * Simple transparent spaced-repetition rules (not a claimed scientific model):
 * - Incorrect → due in 1 local day; resets successfulReviewCount and intervalDays to 1
 * - Partially correct → due in 2 local days; resets successfulReviewCount; intervalDays = 2
 * - Correct on first success streak → due in 3 local days; intervalDays = 3
 * - Correct on later success → intervalDays = min(previousInterval * 2, 60)
 * Local calendar dates are used for due scheduling.
 */
export const CORRECT_INTERVAL_MULTIPLIER = 2
export const MAX_INTERVAL_DAYS = 60

export function addLocalDays(from: Date, days: number): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  result.setDate(result.getDate() + days)
  return result
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localDateKeyToStart(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function emptyReviewState(questionId: string): QuestionReviewState {
  return {
    questionId,
    intervalDays: 0,
    successfulReviewCount: 0,
    attemptCount: 0,
    incorrectCount: 0,
  }
}

export function nextReviewState(
  questionId: string,
  previous: QuestionReviewState | undefined,
  outcome: AttemptOutcome,
  now: Date = new Date(),
): QuestionReviewState {
  const base = previous ?? emptyReviewState(questionId)
  const attemptCount = base.attemptCount + 1
  let successfulReviewCount = base.successfulReviewCount
  let incorrectCount = base.incorrectCount
  let intervalDays = base.intervalDays

  if (outcome === 'incorrect') {
    incorrectCount += 1
    successfulReviewCount = 0
    intervalDays = 1
  } else if (outcome === 'partially_correct') {
    successfulReviewCount = 0
    intervalDays = 2
  } else if (successfulReviewCount === 0) {
    successfulReviewCount = 1
    intervalDays = 3
  } else {
    successfulReviewCount += 1
    const previousInterval = intervalDays > 0 ? intervalDays : 3
    intervalDays = Math.min(
      previousInterval * CORRECT_INTERVAL_MULTIPLIER,
      MAX_INTERVAL_DAYS,
    )
  }

  const dueDate = addLocalDays(now, intervalDays)
  dueDate.setHours(0, 0, 0, 0)

  return {
    questionId,
    lastAttemptAt: now.toISOString(),
    nextDueAt: dueDate.toISOString(),
    intervalDays,
    successfulReviewCount,
    attemptCount,
    incorrectCount,
    lastOutcome: outcome,
  }
}

export function isOverdue(
  state: QuestionReviewState | undefined,
  now: Date = new Date(),
): boolean {
  if (!state?.nextDueAt) {
    return false
  }
  return new Date(state.nextDueAt).getTime() <= now.getTime()
}

export function isDueSoon(
  state: QuestionReviewState | undefined,
  now: Date = new Date(),
  withinDays = 2,
): boolean {
  if (!state?.nextDueAt || isOverdue(state, now)) {
    return false
  }
  const due = new Date(state.nextDueAt).getTime()
  const limit = addLocalDays(now, withinDays).getTime()
  return due <= limit
}
