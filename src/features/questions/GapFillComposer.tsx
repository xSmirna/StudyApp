import type { KeyboardEvent } from 'react'
import {
  buildGapTemplate,
  countGapPlaceholders,
  parseGapTemplate,
} from '../../domain/structuredQuestions'
import { MAX_GAP_BLANKS } from '../../domain/types'

type GapFillComposerProps = {
  text: string
  gaps: string[]
  onTextChange: (text: string) => void
  onGapsChange: (gaps: string[]) => void
}

function syncGapsToTemplate(text: string, gaps: string[]): string[] {
  const count = countGapPlaceholders(text)
  const next = gaps.slice(0, count)
  while (next.length < count) {
    next.push('')
  }
  return next
}

export function GapFillComposer({
  text,
  gaps,
  onTextChange,
  onGapsChange,
}: GapFillComposerProps) {
  const blankCount = countGapPlaceholders(text)

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) {
      return
    }

    const target = event.currentTarget
    const start = target.selectionStart
    const end = target.selectionEnd
    if (start !== end) {
      return
    }

    const before = text.slice(0, start)
    if (!before.endsWith('  ')) {
      return
    }

    if (blankCount >= MAX_GAP_BLANKS) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    const withoutSpaces = before.slice(0, -2)
    const after = text.slice(start)
    const nextIndex = blankCount
    const nextText = `${withoutSpaces}{{${nextIndex}}}${after}`
    onTextChange(nextText)
    onGapsChange(syncGapsToTemplate(nextText, gaps))

    requestAnimationFrame(() => {
      const cursor = withoutSpaces.length + `{{${nextIndex}}}`.length
      target.setSelectionRange(cursor, cursor)
    })
  }

  function handleTextChange(nextText: string) {
    const count = countGapPlaceholders(nextText)
    if (count > MAX_GAP_BLANKS) {
      return
    }
    const segments = parseGapTemplate(nextText)
    const gapIndexes = segments
      .filter(
        (segment): segment is { kind: 'gap'; index: number } =>
          segment.kind === 'gap',
      )
      .map((segment) => segment.index)
    const contiguous = gapIndexes.every((index, order) => index === order)
    const normalized = contiguous
      ? nextText
      : buildGapTemplate(
          segments.map((segment) =>
            segment.kind === 'text'
              ? { kind: 'text' as const, value: segment.value }
              : { kind: 'gap' as const },
          ),
        )
    onTextChange(normalized)
    onGapsChange(syncGapsToTemplate(normalized, gaps))
  }

  function updateGapAnswer(index: number, value: string) {
    const next = [...syncGapsToTemplate(text, gaps)]
    next[index] = value
    onGapsChange(next)
  }

  function removeGap(index: number) {
    const segments = parseGapTemplate(text).filter(
      (segment) => !(segment.kind === 'gap' && segment.index === index),
    )
    const nextText = buildGapTemplate(
      segments.map((segment) =>
        segment.kind === 'text'
          ? { kind: 'text' as const, value: segment.value }
          : { kind: 'gap' as const },
      ),
    )
    const nextGaps = gaps.filter((_, gapIndex) => gapIndex !== index)
    onTextChange(nextText)
    onGapsChange(syncGapsToTemplate(nextText, nextGaps))
  }

  return (
    <div className="gap-fill-composer">
      <label htmlFor="gap-fill-text">Question text</label>
      <p className="muted gap-fill-hint">
        Press Space three times to insert a blank ({blankCount}/{MAX_GAP_BLANKS}
        ).
      </p>
      <textarea
        id="gap-fill-text"
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        placeholder="Type the sentence… Space Space Space creates a blank"
      />

      {blankCount > 0 ? (
        <fieldset className="option-fieldset">
          <legend>Blank answers</legend>
          {Array.from({ length: blankCount }, (_, index) => (
            <div key={index} className="option-row gap-answer-row">
              <label className="sr-only" htmlFor={`gap-answer-${index}`}>
                Answer for blank {index + 1}
              </label>
              <span className="gap-answer-index">{`{{${index}}}`}</span>
              <input
                id={`gap-answer-${index}`}
                value={gaps[index] ?? ''}
                onChange={(event) => updateGapAnswer(index, event.target.value)}
                placeholder={`Correct answer ${index + 1}`}
              />
              <button
                type="button"
                className="danger"
                onClick={() => removeGap(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </fieldset>
      ) : null}
    </div>
  )
}
