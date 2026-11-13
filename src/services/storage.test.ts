import { describe, expect, it } from 'vitest'
import { formatBytes } from './storage'

describe('formatBytes', () => {
  it('formats common sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('handles unknown values', () => {
    expect(formatBytes(undefined)).toBe('Unknown')
  })
})
