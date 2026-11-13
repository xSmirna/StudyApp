import { describe, expect, it } from 'vitest'
import { selectQuestionsForQuiz } from './questionSelection'
import type { Question } from './types'

function question(
  id: string,
  extras: Partial<Question> = {},
): Question {
  return {
    id,
    chapterId: 'ch',
    type: 'short_answer',
    text: id,
    difficulty: 'easy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extras,
  }
}

describe('selectQuestionsForQuiz', () => {
  const now = new Date('2026-11-13T12:00:00.000Z')

  it('prioritises overdue, then incorrect, then due soon', () => {
    const selected = selectQuestionsForQuiz({
      questions: [
        {
          ...question('other'),
          review: {
            questionId: 'other',
            intervalDays: 10,
            successfulReviewCount: 2,
            attemptCount: 2,
            incorrectCount: 0,
            nextDueAt: '2026-12-01T00:00:00.000Z',
            lastOutcome: 'correct',
          },
        },
        {
          ...question('dueSoon'),
          review: {
            questionId: 'dueSoon',
            intervalDays: 3,
            successfulReviewCount: 1,
            attemptCount: 1,
            incorrectCount: 0,
            nextDueAt: '2026-11-14T00:00:00.000Z',
            lastOutcome: 'correct',
          },
        },
        {
          ...question('incorrect'),
          review: {
            questionId: 'incorrect',
            intervalDays: 1,
            successfulReviewCount: 0,
            attemptCount: 1,
            incorrectCount: 1,
            nextDueAt: '2026-11-20T00:00:00.000Z',
            lastOutcome: 'incorrect',
          },
        },
        {
          ...question('overdue'),
          review: {
            questionId: 'overdue',
            intervalDays: 1,
            successfulReviewCount: 0,
            attemptCount: 1,
            incorrectCount: 1,
            nextDueAt: '2026-11-10T00:00:00.000Z',
            lastOutcome: 'incorrect',
          },
        },
      ],
      count: 4,
      seed: 1,
      strategy: 'prioritise_due_failed',
      now,
    })

    expect(selected.map((item) => item.id)).toEqual([
      'overdue',
      'incorrect',
      'dueSoon',
      'other',
    ])
  })

  it('excludes archived questions and never mixes subjects at this layer', () => {
    const selected = selectQuestionsForQuiz({
      questions: [
        question('active'),
        question('archived', {
          archivedAt: '2026-11-01T00:00:00.000Z',
        }),
      ],
      count: 'all',
      seed: 3,
      strategy: 'balanced_random',
      now,
    })
    expect(selected.map((item) => item.id)).toEqual(['active'])
  })
})
