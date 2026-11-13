import { describe, expect, it } from 'vitest'
import {
  gradeMultipleSelect,
  gradeSingleChoice,
  gradeTrueFalse,
  type GradableOption,
} from './grading'

const singleOptions: GradableOption[] = [
  { id: 'a', isCorrect: false },
  { id: 'b', isCorrect: true },
  { id: 'c', isCorrect: false },
]

const multiOptions: GradableOption[] = [
  { id: 'a', isCorrect: false },
  { id: 'b', isCorrect: true },
  { id: 'c', isCorrect: true },
]

describe('grading by stable option IDs', () => {
  it('grades single choice by option id, not visible index', () => {
    expect(gradeSingleChoice(['b'], singleOptions)).toBe('correct')
    expect(gradeSingleChoice(['a'], singleOptions)).toBe('incorrect')
    expect(gradeSingleChoice(['b', 'c'], singleOptions)).toBe('incorrect')
  })

  it('requires exact set match for multiple select', () => {
    expect(gradeMultipleSelect(['b', 'c'], multiOptions)).toBe('correct')
    expect(gradeMultipleSelect(['c', 'b'], multiOptions)).toBe('correct')
    expect(gradeMultipleSelect(['b'], multiOptions)).toBe('incorrect')
    expect(gradeMultipleSelect(['a', 'b', 'c'], multiOptions)).toBe('incorrect')
  })

  it('grades true/false explicitly', () => {
    expect(gradeTrueFalse(true, true)).toBe('correct')
    expect(gradeTrueFalse(false, true)).toBe('incorrect')
    expect(gradeTrueFalse(undefined, true)).toBe('incorrect')
  })
})
