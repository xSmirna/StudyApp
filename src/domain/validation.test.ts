import { describe, expect, it } from 'vitest'
import {
  validateOptionalDescription,
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
