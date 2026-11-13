import type { DailyStudyTime } from './studyTime'
import { STREAK_MIN_SECONDS } from './studyTime'
import type { QuestionAttempt, QuizSession } from './quizTypes'
import { resolveAttemptOutcome } from './quizTypes'
import { addLocalDays, toLocalDateKey } from './spacedRepetition'

export type AchievementId =
  | 'first_quiz'
  | 'chapter_complete'
  | 'three_day_streak'
  | 'record_breaker'
  | 'perfect_exam'

export type AchievementDefinition = {
  id: AchievementId
  name: string
  description: string
}

/** Central catalogue — names/descriptions stay hidden until unlocked. */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_quiz',
    name: 'First Quiz',
    description: 'Complete your first quiz.',
  },
  {
    id: 'chapter_complete',
    name: 'Chapter Complete',
    description:
      'Attempt every active question in a chapter at least once.',
  },
  {
    id: 'three_day_streak',
    name: 'Three-Day Streak',
    description:
      'Record at least 5 minutes of productive study time on three consecutive local days.',
  },
  {
    id: 'record_breaker',
    name: 'Record Breaker',
    description:
      'Set a new all-time daily productive-time record on two consecutive local days.',
  },
  {
    id: 'perfect_exam',
    name: 'Perfect Exam',
    description: 'Complete an exam simulation with every question graded Correct.',
  },
]

export type AchievementUnlock = {
  achievementId: AchievementId
  unlockedAt: string
}

export type AchievementEvaluationInput = {
  completedSessions: QuizSession[]
  attempts: QuestionAttempt[]
  dailyStudyTimes: DailyStudyTime[]
  /** Map of chapterId -> active question ids */
  activeQuestionsByChapter: Record<string, string[]>
  alreadyUnlocked: Set<string>
  now?: Date
}

export function evaluateAchievements(
  input: AchievementEvaluationInput,
): AchievementId[] {
  const unlocked: AchievementId[] = []
  const now = input.now ?? new Date()

  const maybe = (id: AchievementId, condition: boolean) => {
    if (condition && !input.alreadyUnlocked.has(id)) {
      unlocked.push(id)
    }
  }

  const completed = input.completedSessions.filter(
    (session) => session.status === 'completed',
  )

  maybe('first_quiz', completed.length >= 1)

  maybe(
    'perfect_exam',
    completed.some((session) => {
      if (session.mode !== 'exam') return false
      const sessionAttempts = input.attempts.filter(
        (attempt) => attempt.sessionId === session.id,
      )
      if (sessionAttempts.length === 0) return false
      if (sessionAttempts.length < session.settings.questionIds.length) {
        return false
      }
      return sessionAttempts.every(
        (attempt) => resolveAttemptOutcome(attempt) === 'correct',
      )
    }),
  )

  const attemptedQuestionIds = new Set(
    input.attempts.map((attempt) => attempt.questionId),
  )
  const chapterComplete = Object.values(input.activeQuestionsByChapter).some(
    (questionIds) =>
      questionIds.length > 0 &&
      questionIds.every((questionId) => attemptedQuestionIds.has(questionId)),
  )
  maybe('chapter_complete', chapterComplete)

  maybe('three_day_streak', hasThreeDayStreak(input.dailyStudyTimes, now))
  maybe('record_breaker', hasRecordBreaker(input.dailyStudyTimes))

  return unlocked
}

export function hasThreeDayStreak(
  rows: DailyStudyTime[],
  now: Date = new Date(),
): boolean {
  const byDate = new Map(rows.map((row) => [row.localDate, row.seconds]))
  // Check any window of 3 consecutive local days ending on or before today
  // that all meet the 5-minute threshold.
  const sortedDates = [...byDate.keys()].sort()
  if (sortedDates.length === 0) return false

  const today = toLocalDateKey(now)
  for (const dateKey of sortedDates) {
    if (dateKey > today) continue
    const start = dateKey
    const mid = toLocalDateKey(addLocalDays(parseLocalDate(start), 1))
    const end = toLocalDateKey(addLocalDays(parseLocalDate(start), 2))
    if (
      (byDate.get(start) ?? 0) >= STREAK_MIN_SECONDS &&
      (byDate.get(mid) ?? 0) >= STREAK_MIN_SECONDS &&
      (byDate.get(end) ?? 0) >= STREAK_MIN_SECONDS
    ) {
      return true
    }
  }
  return false
}

/**
 * Record Breaker: two consecutive local days each set a new all-time daily
 * record, and day 2's total exceeds the record set by day 1.
 */
export function hasRecordBreaker(rows: DailyStudyTime[]): boolean {
  const sorted = [...rows].sort((a, b) => a.localDate.localeCompare(b.localDate))
  if (sorted.length < 2) return false

  let bestBefore = 0
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const day1 = sorted[i]!
    const day2 = sorted[i + 1]!
    const day1IsRecord = day1.seconds > bestBefore && day1.seconds > 0
    const day2IsNewRecord =
      day2.seconds > day1.seconds &&
      day2.seconds > bestBefore &&
      day2.seconds > 0

    if (
      day1IsRecord &&
      day2IsNewRecord &&
      isNextLocalDay(day1.localDate, day2.localDate)
    ) {
      return true
    }

    bestBefore = Math.max(bestBefore, day1.seconds)
  }
  return false
}

function parseLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

function isNextLocalDay(earlier: string, later: string): boolean {
  const expected = toLocalDateKey(addLocalDays(parseLocalDate(earlier), 1))
  return expected === later
}

export function getAchievementDefinition(
  id: AchievementId,
): AchievementDefinition {
  const found = ACHIEVEMENTS.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Unknown achievement: ${id}`)
  }
  return found
}
