import { describe, expect, it } from 'vitest'
import { createSeededRandom, shuffleCopy } from './shuffle'

describe('shuffleCopy', () => {
  it('does not mutate the original array', () => {
    const original = ['a', 'b', 'c', 'd']
    const snapshot = [...original]
    shuffleCopy(original, createSeededRandom(42))
    expect(original).toEqual(snapshot)
  })

  it('is deterministic for a fixed seed', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const first = shuffleCopy(items, createSeededRandom(99))
    const second = shuffleCopy(items, createSeededRandom(99))
    expect(first).toEqual(second)
  })

  it('preserves membership so grading by id still works after shuffle', () => {
    const ids = ['opt-1', 'opt-2', 'opt-correct']
    const shuffled = shuffleCopy(ids, createSeededRandom(7))
    expect(shuffled.sort()).toEqual([...ids].sort())
    expect(shuffled).toContain('opt-correct')
  })
})
