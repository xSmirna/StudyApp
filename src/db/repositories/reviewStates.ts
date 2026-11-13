import type { AttemptOutcome, QuestionReviewState } from '../../domain/quizTypes'
import { nextReviewState } from '../../domain/spacedRepetition'
import { db } from '../database'

export async function getReviewState(
  questionId: string,
): Promise<QuestionReviewState | undefined> {
  return db.questionReviewStates.get(questionId)
}

export async function listReviewStatesForQuestions(
  questionIds: string[],
): Promise<Map<string, QuestionReviewState>> {
  const map = new Map<string, QuestionReviewState>()
  if (questionIds.length === 0) {
    return map
  }
  const states = await db.questionReviewStates.bulkGet(questionIds)
  for (const state of states) {
    if (state) {
      map.set(state.questionId, state)
    }
  }
  return map
}

export async function applyReviewOutcome(
  questionId: string,
  outcome: AttemptOutcome,
  now = new Date(),
): Promise<QuestionReviewState> {
  const previous = await db.questionReviewStates.get(questionId)
  const updated = nextReviewState(questionId, previous, outcome, now)
  await db.questionReviewStates.put(updated)
  return updated
}
