import { describe, expect, it } from 'vitest'
import { orderQuestionsForLearn } from './learnSelection'
import type { Question } from './types'

function q(
  id: string,
  difficulty: Question['difficulty'],
): Question {
  return {
    id,
    chapterId: 'c1',
    type: 'short_answer',
    text: id,
    difficulty,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

describe('orderQuestionsForLearn', () => {
  const pool = [
    q('e1', 'easy'),
    q('e2', 'easy'),
    q('m1', 'medium'),
    q('h1', 'hard'),
    q('h2', 'hard'),
  ]

  it('orders beginner easy then medium then hard', () => {
    const ordered = orderQuestionsForLearn(pool, 'beginner', 7, 'all')
    const difficulties = ordered.map((item) => item.difficulty)
    expect(difficulties.indexOf('easy')).toBeLessThan(difficulties.indexOf('medium'))
    expect(difficulties.indexOf('medium')).toBeLessThan(difficulties.indexOf('hard'))
  })

  it('orders intermediate medium then hard then easy', () => {
    const ordered = orderQuestionsForLearn(pool, 'intermediate', 11, 'all')
    const firstMedium = ordered.findIndex((item) => item.difficulty === 'medium')
    const firstHard = ordered.findIndex((item) => item.difficulty === 'hard')
    const firstEasy = ordered.findIndex((item) => item.difficulty === 'easy')
    expect(firstMedium).toBeLessThan(firstHard)
    expect(firstHard).toBeLessThan(firstEasy)
  })

  it('respects count for beginner', () => {
    const ordered = orderQuestionsForLearn(pool, 'beginner', 3, 2)
    expect(ordered).toHaveLength(2)
    expect(ordered.every((item) => item.difficulty === 'easy')).toBe(true)
  })

  it('is deterministic for freeplay seed', () => {
    const a = orderQuestionsForLearn(pool, 'freeplay', 99, 'all').map((item) => item.id)
    const b = orderQuestionsForLearn(pool, 'freeplay', 99, 'all').map((item) => item.id)
    expect(a).toEqual(b)
  })
})
