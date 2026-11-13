import type { QuestionReviewState } from './quizTypes'
import { isDueSoon, isOverdue } from './spacedRepetition'
import { createSeededRandom, shuffleCopy } from './shuffle'
import type { Difficulty, Question, QuestionType } from './types'

export type SelectionCandidate = Question & {
  review?: QuestionReviewState
}

export type SelectQuestionsInput = {
  questions: SelectionCandidate[]
  count: number | 'all'
  seed: number
  strategy: 'prioritise_due_failed' | 'balanced_random'
  types?: QuestionType[]
  difficulties?: Difficulty[]
  now?: Date
}

/**
 * Priority for revision / prioritise_due_failed:
 * 1. overdue
 * 2. previously incorrect (lastOutcome === incorrect)
 * 3. due soon
 * 4. other eligible
 * Within each bucket, order is deterministic via seeded shuffle.
 */
export function selectQuestionsForQuiz(
  input: SelectQuestionsInput,
): Question[] {
  const now = input.now ?? new Date()
  let eligible = input.questions.filter((question) => !question.archivedAt)

  if (input.types && input.types.length > 0) {
    eligible = eligible.filter((question) => input.types!.includes(question.type))
  }
  if (input.difficulties && input.difficulties.length > 0) {
    eligible = eligible.filter((question) =>
      input.difficulties!.includes(question.difficulty),
    )
  }

  const random = createSeededRandom(input.seed)

  if (input.strategy === 'balanced_random') {
    const shuffled = shuffleCopy(eligible, random)
    if (input.count === 'all') {
      return shuffled
    }
    return shuffled.slice(0, Math.max(0, input.count))
  }

  const overdue: SelectionCandidate[] = []
  const incorrect: SelectionCandidate[] = []
  const dueSoon: SelectionCandidate[] = []
  const other: SelectionCandidate[] = []

  for (const question of eligible) {
    if (isOverdue(question.review, now)) {
      overdue.push(question)
    } else if (question.review?.lastOutcome === 'incorrect') {
      incorrect.push(question)
    } else if (isDueSoon(question.review, now)) {
      dueSoon.push(question)
    } else {
      other.push(question)
    }
  }

  const ordered = [
    ...shuffleCopy(overdue, random),
    ...shuffleCopy(incorrect, random),
    ...shuffleCopy(dueSoon, random),
    ...shuffleCopy(other, random),
  ]

  if (input.count === 'all') {
    return ordered
  }
  return ordered.slice(0, Math.max(0, input.count))
}
