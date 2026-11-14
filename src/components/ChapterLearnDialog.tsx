import { useEffect, useState } from 'react'
import {
  ALL_LEARN_LEVELS,
  LEARN_LEVEL_LABELS,
  type LearnLevel,
} from '../domain/learnSelection'
import type { Chapter } from '../domain/types'
import { startQuiz } from '../services/quiz'
import { toUserMessage } from '../services/errors'
import { CreamButton } from './CreamButton'

type ChapterLearnDialogProps = {
  subjectId: string
  chapter: Chapter
  questionCount: number
  onStarted: (sessionId: string) => void
  onCancel: () => void
}

export function ChapterLearnDialog({
  subjectId,
  chapter,
  questionCount,
  onStarted,
  onCancel,
}: ChapterLearnDialogProps) {
  const [level, setLevel] = useState<LearnLevel>('beginner')
  const [count, setCount] = useState(Math.max(1, Math.min(10, questionCount)))
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const isFreeplay = level === 'freeplay'
  const maxCount = Math.max(1, questionCount)

  useEffect(() => {
    setCount((current) => Math.min(Math.max(1, current), maxCount))
  }, [maxCount])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  async function handleStart() {
    if (questionCount < 1) {
      setError('This chapter has no active questions yet.')
      return
    }
    setStarting(true)
    setError(null)
    try {
      const result = await startQuiz({
        mode: 'learn',
        subjectId,
        chapterIds: [chapter.id],
        questionCount: isFreeplay ? 'all' : count,
        learnLevel: level,
      })
      onStarted(result.session.id)
    } catch (err) {
      setError(toUserMessage(err))
      setStarting(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog question-editor-dialog forest-panel chapter-learn-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-learn-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-title-row question-editor-dialog-header">
          <h2 id="chapter-learn-title" className="panel-inline-title">
            Learn {chapter.name}
          </h2>
          <CreamButton
            iconOnly
            className="progress-collapse-button"
            aria-label="Close"
            title="Close"
            onClick={onCancel}
          >
            ×
          </CreamButton>
        </div>

        <span className="field-label" id="learn-level-label">
          Level
        </span>
        <div
          className="difficulty-tag-row"
          role="group"
          aria-labelledby="learn-level-label"
        >
          {ALL_LEARN_LEVELS.map((value) => (
            <button
              key={value}
              type="button"
              className={[
                'difficulty-tag',
                level === value ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={level === value}
              onClick={() => setLevel(value)}
            >
              <span className="difficulty-tag-label">
                {LEARN_LEVEL_LABELS[value]}
              </span>
            </button>
          ))}
        </div>
        <p className="muted learn-level-hint">
          {level === 'beginner'
            ? 'Starts with easy, then medium, then difficult.'
            : null}
          {level === 'intermediate'
            ? 'Starts with medium, then difficult, then easy.'
            : null}
          {level === 'freeplay'
            ? 'Ignores difficulty and continues until an incorrect answer.'
            : null}
        </p>

        <label
          className={isFreeplay ? 'field-label is-disabled' : 'field-label'}
          htmlFor="learn-question-count"
        >
          Questions: {isFreeplay ? 'Until first miss' : count}
        </label>
        <input
          id="learn-question-count"
          className="learn-count-slider"
          type="range"
          min={1}
          max={maxCount}
          step={1}
          value={isFreeplay ? maxCount : count}
          disabled={isFreeplay || questionCount < 1}
          onChange={(event) => setCount(Number(event.target.value))}
        />
        <div className="learn-count-scale muted">
          <span>1</span>
          <span>{maxCount}</span>
        </div>

        {error ? (
          <p className="error-banner" role="alert">
            {error}
          </p>
        ) : null}

        <div className="row-actions">
          <CreamButton onClick={() => void handleStart()} disabled={starting}>
            {starting ? 'Starting…' : 'Start learning'}
          </CreamButton>
          <CreamButton onClick={onCancel} disabled={starting}>
            Cancel
          </CreamButton>
        </div>
      </div>
    </div>
  )
}
