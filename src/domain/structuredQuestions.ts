import { createSeededRandom, shuffleCopy } from './shuffle'
import {
  MAX_GAP_BLANKS,
  MAX_TABLE_COLUMNS,
  MAX_TABLE_DATA_ROWS,
  type TableFillData,
} from './types'

export const GAP_PLACEHOLDER_RE = /\{\{(\d+)\}\}/g

export type GapSegment =
  | { kind: 'text'; value: string }
  | { kind: 'gap'; index: number }

export type TableCellCoord = { row: number; col: number }

export function parseGapTemplate(text: string): GapSegment[] {
  const segments: GapSegment[] = []
  let lastIndex = 0
  const re = new RegExp(GAP_PLACEHOLDER_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'gap', index: Number(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }
  return segments
}

export function buildGapTemplate(
  segments: Array<{ kind: 'text'; value: string } | { kind: 'gap' }>,
): string {
  let gapIndex = 0
  return segments
    .map((segment) => {
      if (segment.kind === 'text') {
        return segment.value
      }
      const token = `{{${gapIndex}}}`
      gapIndex += 1
      return token
    })
    .join('')
}

export function countGapPlaceholders(text: string): number {
  return parseGapTemplate(text).filter((segment) => segment.kind === 'gap')
    .length
}

export function validateGapFillContent(
  text: string,
  gaps: string[] | undefined,
): { ok: true; gaps: string[] } | { ok: false; error: string } {
  const segments = parseGapTemplate(text)
  const gapSegments = segments.filter(
    (segment): segment is Extract<GapSegment, { kind: 'gap' }> =>
      segment.kind === 'gap',
  )

  if (gapSegments.length < 1) {
    return {
      ok: false,
      error: 'Fill-in-the-gaps questions need at least one blank.',
    }
  }
  if (gapSegments.length > MAX_GAP_BLANKS) {
    return {
      ok: false,
      error: `Fill-in-the-gaps questions support at most ${MAX_GAP_BLANKS} blanks.`,
    }
  }

  for (let i = 0; i < gapSegments.length; i += 1) {
    if (gapSegments[i]!.index !== i) {
      return {
        ok: false,
        error: 'Gap placeholders must be contiguous starting at {{0}}.',
      }
    }
  }

  const plainText = segments
    .filter((segment) => segment.kind === 'text')
    .map((segment) => segment.value)
    .join('')
    .trim()
  if (!plainText) {
    return {
      ok: false,
      error: 'Add some question text around the blanks.',
    }
  }

  const answers = gaps ?? []
  if (answers.length !== gapSegments.length) {
    return {
      ok: false,
      error: 'Each blank needs a correct answer.',
    }
  }

  const cleaned: string[] = []
  for (const [index, answer] of answers.entries()) {
    const value = answer.trim()
    if (!value) {
      return {
        ok: false,
        error: `Blank ${index + 1} needs a correct answer.`,
      }
    }
    cleaned.push(value)
  }

  return { ok: true, gaps: cleaned }
}

export function validateTableFillContent(
  table: TableFillData | undefined,
): { ok: true; table: TableFillData } | { ok: false; error: string } {
  if (!table) {
    return { ok: false, error: 'Table questions need a table.' }
  }

  const headers = table.headers.map((header) => header.trim())
  if (headers.length < 1 || headers.length > MAX_TABLE_COLUMNS) {
    return {
      ok: false,
      error: `Tables need between 1 and ${MAX_TABLE_COLUMNS} columns.`,
    }
  }
  if (headers.some((header) => !header)) {
    return { ok: false, error: 'Every header cell is required.' }
  }

  const rows = table.rows
  if (rows.length < 1 || rows.length > MAX_TABLE_DATA_ROWS) {
    return {
      ok: false,
      error: `Tables need between 1 and ${MAX_TABLE_DATA_ROWS} data rows.`,
    }
  }

  const cleanedRows: string[][] = []
  for (const [rowIndex, row] of rows.entries()) {
    if (row.length !== headers.length) {
      return {
        ok: false,
        error: `Row ${rowIndex + 1} must have ${headers.length} cells.`,
      }
    }
    const cleanedRow = row.map((cell) => cell.trim())
    if (cleanedRow.some((cell) => !cell)) {
      return {
        ok: false,
        error: `Every cell in row ${rowIndex + 1} is required.`,
      }
    }
    cleanedRows.push(cleanedRow)
  }

  return {
    ok: true,
    table: {
      headers,
      rows: cleanedRows,
    },
  }
}

function hashStringToSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Pick ~ratio of data cells to blank. Never blanks an entire row or column.
 * Deterministic from sessionSeed + questionId.
 */
export function pickBlankTableCells(input: {
  rowCount: number
  colCount: number
  sessionSeed: number
  questionId: string
  ratio?: number
}): TableCellCoord[] {
  const ratio = input.ratio ?? 0.4
  const { rowCount, colCount } = input
  if (rowCount < 1 || colCount < 1) {
    return []
  }

  const allCells: TableCellCoord[] = []
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      allCells.push({ row, col })
    }
  }

  const total = allCells.length
  // Need at least one visible cell per row and per column.
  const maxBlankable = Math.max(0, total - Math.max(rowCount, colCount))
  const target = Math.min(
    maxBlankable,
    Math.max(total > 1 ? 1 : 0, Math.round(total * ratio)),
  )
  if (target < 1) {
    return []
  }

  const random = createSeededRandom(
    (input.sessionSeed ^ hashStringToSeed(input.questionId)) >>> 0,
  )
  const candidates = shuffleCopy(allCells, random)
  const selected: TableCellCoord[] = []
  const blankedRows = new Array(rowCount).fill(0) as number[]
  const blankedCols = new Array(colCount).fill(0) as number[]

  for (const cell of candidates) {
    if (selected.length >= target) {
      break
    }
    const nextRowCount = blankedRows[cell.row]! + 1
    const nextColCount = blankedCols[cell.col]! + 1
    if (nextRowCount >= colCount) {
      continue
    }
    if (nextColCount >= rowCount) {
      continue
    }
    selected.push(cell)
    blankedRows[cell.row] = nextRowCount
    blankedCols[cell.col] = nextColCount
  }

  return selected
}

export function tableCellKey(cell: TableCellCoord): string {
  return `${cell.row}:${cell.col}`
}
