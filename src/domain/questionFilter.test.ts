import { describe, expect, it } from 'vitest'
import { filterQuestions, paginateItems } from './questionFilter'
import type { Question } from './types'

function q(
  partial: Pick<Question, 'id' | 'text' | 'type' | 'difficulty'> &
    Partial<Question>,
): Question {
  return {
    chapterId: 'ch1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('filterQuestions', () => {
  const questions = [
    q({
      id: '1',
      text: 'Τι είναι το κύτταρο;',
      type: 'short_answer',
      difficulty: 'easy',
    }),
    q({
      id: '2',
      text: 'Qu’est-ce que la photosynthèse?',
      type: 'long_answer',
      difficulty: 'hard',
    }),
    q({
      id: '3',
      text: 'Water freezes at 0°C',
      type: 'true_false',
      difficulty: 'easy',
      archivedAt: '2026-01-02T00:00:00.000Z',
    }),
  ]

  it('filters by Unicode keyword', () => {
    const filtered = filterQuestions(questions, {
      keyword: 'κύτταρο',
      type: 'all',
      difficulty: 'all',
      includeArchived: false,
    })
    expect(filtered.map((item) => item.id)).toEqual(['1'])
  })

  it('filters by type and difficulty', () => {
    const filtered = filterQuestions(questions, {
      keyword: '',
      type: 'long_answer',
      difficulty: 'hard',
      includeArchived: true,
    })
    expect(filtered.map((item) => item.id)).toEqual(['2'])
  })

  it('hides archived by default', () => {
    const filtered = filterQuestions(questions, {
      keyword: '',
      type: 'all',
      difficulty: 'all',
      includeArchived: false,
    })
    expect(filtered.map((item) => item.id)).toEqual(['1', '2'])
  })
})

describe('paginateItems', () => {
  it('pages when there are more than 50 items', () => {
    const items = Array.from({ length: 55 }, (_, index) => index)
    const first = paginateItems(items, 1, 50)
    const second = paginateItems(items, 2, 50)
    expect(first.pageItems).toHaveLength(50)
    expect(second.pageItems).toHaveLength(5)
    expect(second.totalPages).toBe(2)
  })
})
