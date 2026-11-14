import { useState, type FormEvent } from 'react'
import { CreamButton } from '../../components/CreamButton'
import { createId } from '../../domain/ids'
import type {
  Difficulty,
  OptionInput,
  QuestionInput,
  QuestionType,
  QuestionWithOptions,
  TableFillData,
} from '../../domain/types'
import {
  ALL_DIFFICULTIES,
  ALL_QUESTION_TYPES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  isChoiceType,
  isGapFillType,
  isTableFillType,
  isWrittenType,
} from '../../domain/types'
import { GapFillComposer } from './GapFillComposer'
import { TableFillEditor, createEmptyTable } from './TableFillEditor'

type DraftOption = OptionInput & { id: string }

export type QuestionEditorFormProps = {
  chapterId: string
  initial?: QuestionWithOptions
  submitLabel: string
  onSubmit: (input: QuestionInput) => Promise<void>
  onCancel: () => void
}

function emptyOptions(): DraftOption[] {
  return [
    { id: createId(), text: '', isCorrect: true, order: 0 },
    { id: createId(), text: '', isCorrect: false, order: 1 },
  ]
}

export function QuestionEditorForm({
  chapterId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: QuestionEditorFormProps) {
  const [type, setType] = useState<QuestionType>(
    initial?.type ?? 'single_choice',
  )
  const [text, setText] = useState(initial?.text ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty ?? 'medium',
  )
  const [referenceAnswer, setReferenceAnswer] = useState(
    initial?.referenceAnswer ?? '',
  )
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [correctBoolean, setCorrectBoolean] = useState<boolean>(
    initial?.correctBoolean ?? true,
  )
  const [gaps, setGaps] = useState<string[]>(initial?.gaps ?? [])
  const [table, setTable] = useState<TableFillData>(
    initial?.table ?? createEmptyTable(),
  )
  const [options, setOptions] = useState<DraftOption[]>(
    initial?.options?.length
      ? initial.options.map((option, index) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          order: index,
        }))
      : emptyOptions(),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleTypeChange(nextType: QuestionType) {
    setType(nextType)
    if (isChoiceType(nextType) && options.length < 2) {
      setOptions(emptyOptions())
    }
    if (nextType === 'single_choice') {
      setOptions((current) => {
        const firstCorrect = current.findIndex((option) => option.isCorrect)
        return current.map((option, index) => ({
          ...option,
          isCorrect: index === (firstCorrect >= 0 ? firstCorrect : 0),
        }))
      })
    }
    if (isTableFillType(nextType) && !initial?.table && table.rows.length === 0) {
      setTable(createEmptyTable())
    }
    if (isTableFillType(nextType) && !text.trim()) {
      setText('Complete the table')
    }
  }

  function updateOption(id: string, patch: Partial<DraftOption>) {
    setOptions((current) =>
      current.map((option) =>
        option.id === id ? { ...option, ...patch } : option,
      ),
    )
  }

  function setSingleCorrect(id: string) {
    setOptions((current) =>
      current.map((option) => ({
        ...option,
        isCorrect: option.id === id,
      })),
    )
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        id: createId(),
        text: '',
        isCorrect: false,
        order: current.length,
      },
    ])
  }

  function removeOption(id: string) {
    setOptions((current) => {
      if (current.length <= 2) {
        return current
      }
      return current.filter((option) => option.id !== id)
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        chapterId,
        type,
        text,
        difficulty,
        referenceAnswer,
        explanation,
        correctBoolean,
        gaps: isGapFillType(type) ? gaps : undefined,
        table: isTableFillType(type) ? table : undefined,
        options: isChoiceType(type) ? options : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save question.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="stack-form question-editor-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label htmlFor="question-type">Question type</label>
      <select
        id="question-type"
        className="filter-select"
        value={type}
        onChange={(event) =>
          handleTypeChange(event.target.value as QuestionType)
        }
      >
        {ALL_QUESTION_TYPES.map((value) => (
          <option key={value} value={value}>
            {QUESTION_TYPE_LABELS[value]}
          </option>
        ))}
      </select>

      <span className="field-label" id="question-difficulty-label">
        Difficulty
      </span>
      <div
        className="difficulty-tag-row"
        role="group"
        aria-labelledby="question-difficulty-label"
      >
        {ALL_DIFFICULTIES.map((value) => (
          <button
            key={value}
            type="button"
            className={[
              'difficulty-tag',
              `difficulty-tag--${value}`,
              difficulty === value ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={difficulty === value}
            onClick={() => setDifficulty(value)}
          >
            <span className="difficulty-tag-fx" aria-hidden="true" />
            <span className="difficulty-tag-label">
              {DIFFICULTY_LABELS[value]}
            </span>
          </button>
        ))}
      </div>

      {isGapFillType(type) ? (
        <GapFillComposer
          text={text}
          gaps={gaps}
          onTextChange={setText}
          onGapsChange={setGaps}
        />
      ) : (
        <>
          <label htmlFor="question-text">Question text</label>
          <textarea
            id="question-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
          />
        </>
      )}

      {type === 'true_false' ? (
        <fieldset className="option-fieldset">
          <legend>Correct answer</legend>
          <label>
            <input
              type="radio"
              name="correct-boolean"
              checked={correctBoolean === true}
              onChange={() => setCorrectBoolean(true)}
            />{' '}
            True
          </label>
          <label>
            <input
              type="radio"
              name="correct-boolean"
              checked={correctBoolean === false}
              onChange={() => setCorrectBoolean(false)}
            />{' '}
            False
          </label>
        </fieldset>
      ) : null}

      {isWrittenType(type) ? (
        <>
          <label htmlFor="reference-answer">Reference answer (optional)</label>
          <textarea
            id="reference-answer"
            value={referenceAnswer}
            onChange={(event) => setReferenceAnswer(event.target.value)}
            rows={type === 'long_answer' ? 6 : 3}
          />
        </>
      ) : null}

      {isTableFillType(type) ? (
        <TableFillEditor table={table} onChange={setTable} />
      ) : null}

      {isChoiceType(type) ? (
        <fieldset className="option-fieldset">
          <legend>Options</legend>
          {options.map((option, index) => (
            <div key={option.id} className="option-row">
              <label className="sr-only" htmlFor={`option-text-${option.id}`}>
                Option {index + 1} text
              </label>
              <input
                id={`option-text-${option.id}`}
                value={option.text}
                onChange={(event) =>
                  updateOption(option.id, { text: event.target.value })
                }
                placeholder={`Option ${index + 1}`}
              />
              <label className="option-correct">
                <input
                  type={type === 'single_choice' ? 'radio' : 'checkbox'}
                  name={
                    type === 'single_choice'
                      ? 'single-correct'
                      : `multi-${option.id}`
                  }
                  checked={option.isCorrect}
                  onChange={(event) => {
                    if (type === 'single_choice') {
                      setSingleCorrect(option.id)
                    } else {
                      updateOption(option.id, {
                        isCorrect: event.target.checked,
                      })
                    }
                  }}
                />{' '}
                Correct
              </label>
              <CreamButton
                iconOnly
                className="option-delete-button"
                aria-label={`Remove option ${index + 1}`}
                title="Remove"
                disabled={options.length <= 2}
                onClick={() => removeOption(option.id)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M6 7h12v2H6V7zm2 3h8l-.7 10.05a1 1 0 0 1-1 .95H9.7a1 1 0 0 1-1-.95L9 10zm3-5h2l1 1h4v2H5V6h4l1-1z"
                  />
                </svg>
              </CreamButton>
            </div>
          ))}
          <button type="button" onClick={addOption}>
            Add option
          </button>
        </fieldset>
      ) : null}

      <label htmlFor="question-explanation">Explanation (optional)</label>
      <textarea
        id="question-explanation"
        value={explanation}
        onChange={(event) => setExplanation(event.target.value)}
        rows={3}
      />

      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="row-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
