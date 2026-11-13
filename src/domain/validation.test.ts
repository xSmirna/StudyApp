import { describe, expect, it } from 'vitest'
import {
  validateOptionalDescription,
  validateQuestionInput,
  validateRequiredName,
} from './validation'

describe('validateRequiredName', () => {
  it('rejects empty or whitespace names', () => {
    expect(validateRequiredName('').ok).toBe(false)
    expect(validateRequiredName('   ').ok).toBe(false)
  })

  it('trims and accepts Unicode names', () => {
    const result = validateRequiredName('  Βιολογία  ')
    expect(result).toEqual({ ok: true, value: 'Βιολογία' })
  })
})

describe('validateOptionalDescription', () => {
  it('allows empty description', () => {
    expect(validateOptionalDescription(undefined)).toEqual({
      ok: true,
      value: '',
    })
  })

  it('preserves French text', () => {
    const result = validateOptionalDescription('Révision du chapitre')
    expect(result).toEqual({ ok: true, value: 'Révision du chapitre' })
  })
})

describe('validateQuestionInput', () => {
  it('requires exactly one correct option for single choice', () => {
    const result = validateQuestionInput({
      chapterId: 'c1',
      type: 'single_choice',
      text: 'Capital of France?',
      difficulty: 'easy',
      options: [
        { text: 'Paris', isCorrect: true, order: 0 },
        { text: 'Lyon', isCorrect: true, order: 1 },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('requires at least one correct option for multiple select', () => {
    const result = validateQuestionInput({
      chapterId: 'c1',
      type: 'multiple_select',
      text: 'Select vowels',
      difficulty: 'medium',
      options: [
        { text: 'A', isCorrect: false, order: 0 },
        { text: 'B', isCorrect: false, order: 1 },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('requires a boolean for true/false', () => {
    const result = validateQuestionInput({
      chapterId: 'c1',
      type: 'true_false',
      text: 'Η Γη είναι στρογγυλή',
      difficulty: 'easy',
    })
    expect(result.ok).toBe(false)
  })

  it('accepts Unicode written questions', () => {
    const result = validateQuestionInput({
      chapterId: 'c1',
      type: 'short_answer',
      text: 'Traduisez: καλημέρα',
      difficulty: 'hard',
      referenceAnswer: 'bonjour',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.text).toBe('Traduisez: καλημέρα')
      expect(result.value.referenceAnswer).toBe('bonjour')
    }
  })
})
