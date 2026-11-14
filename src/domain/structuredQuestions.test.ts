import { describe, expect, it } from 'vitest'
import {
  buildGapTemplate,
  parseGapTemplate,
  pickBlankTableCells,
  validateGapFillContent,
  validateTableFillContent,
} from './structuredQuestions'

describe('gap template helpers', () => {
  it('parses placeholders and rebuilds contiguous indices', () => {
    const segments = parseGapTemplate('The {{0}} is {{1}}.')
    expect(segments).toEqual([
      { kind: 'text', value: 'The ' },
      { kind: 'gap', index: 0 },
      { kind: 'text', value: ' is ' },
      { kind: 'gap', index: 1 },
      { kind: 'text', value: '.' },
    ])
    expect(
      buildGapTemplate([
        { kind: 'text', value: 'A ' },
        { kind: 'gap' },
        { kind: 'text', value: ' B ' },
        { kind: 'gap' },
      ]),
    ).toBe('A {{0}} B {{1}}')
  })

  it('validates gap fill answers', () => {
    expect(
      validateGapFillContent('Hello {{0}}', ['world']).ok,
    ).toBe(true)
    expect(validateGapFillContent('No blanks', []).ok).toBe(false)
    expect(validateGapFillContent('{{0}} {{2}}', ['a', 'b']).ok).toBe(false)
    expect(validateGapFillContent('Only {{0}}', ['']).ok).toBe(false)
  })
})

describe('validateTableFillContent', () => {
  it('accepts a filled header and rows', () => {
    const result = validateTableFillContent({
      headers: ['A', 'B'],
      rows: [
        ['1', '2'],
        ['3', '4'],
      ],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects empty cells and oversized tables', () => {
    expect(
      validateTableFillContent({
        headers: ['A', ''],
        rows: [['1', '2']],
      }).ok,
    ).toBe(false)
    expect(
      validateTableFillContent({
        headers: ['A'],
        rows: Array.from({ length: 11 }, () => ['x']),
      }).ok,
    ).toBe(false)
  })
})

describe('pickBlankTableCells', () => {
  it('blanks about 40% and never a full row or column', () => {
    const blanks = pickBlankTableCells({
      rowCount: 4,
      colCount: 3,
      sessionSeed: 42,
      questionId: 'q1',
      ratio: 0.4,
    })
    expect(blanks.length).toBe(5)

    const byRow = new Map<number, number>()
    const byCol = new Map<number, number>()
    for (const cell of blanks) {
      byRow.set(cell.row, (byRow.get(cell.row) ?? 0) + 1)
      byCol.set(cell.col, (byCol.get(cell.col) ?? 0) + 1)
    }
    for (const count of byRow.values()) {
      expect(count).toBeLessThan(3)
    }
    for (const count of byCol.values()) {
      expect(count).toBeLessThan(4)
    }
  })

  it('is deterministic for the same seed and question', () => {
    const a = pickBlankTableCells({
      rowCount: 5,
      colCount: 4,
      sessionSeed: 99,
      questionId: 'abc',
    })
    const b = pickBlankTableCells({
      rowCount: 5,
      colCount: 4,
      sessionSeed: 99,
      questionId: 'abc',
    })
    expect(a).toEqual(b)
  })
})
