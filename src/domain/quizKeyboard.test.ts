import { describe, expect, it } from 'vitest'
import { optionIndexFromKey, quizKeyAction } from './quizKeyboard'

describe('quiz keyboard helpers', () => {
  it('maps number and letter keys to option indexes', () => {
    expect(optionIndexFromKey('1')).toBe(0)
    expect(optionIndexFromKey('A')).toBe(0)
    expect(optionIndexFromKey('i')).toBe(8)
    expect(optionIndexFromKey('0')).toBeNull()
  })

  it('maps Space and Enter to reveal/advance actions', () => {
    expect(quizKeyAction(' ')).toEqual({ type: 'reveal' })
    expect(quizKeyAction('Enter')).toEqual({ type: 'advance' })
    expect(quizKeyAction('2')).toEqual({ type: 'select_option', index: 1 })
  })
})
