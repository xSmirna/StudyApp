import { useState, type FormEvent } from 'react'
import { createId } from '../../domain/ids'
import type {
  Difficulty,
  OptionInput,
  QuestionInput,
  QuestionType,
  QuestionWithOptions,
} from '../../domain/types'
import {
  ALL_DIFFICULTIES,
  ALL_QUESTION_TYPES,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  isChoiceType,
  isWrittenType,
} from '../../domain/types'

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

  function moveOption(id: string, direction: -1 | 1) {
    setOptions((current) => {
      const index = current.findIndex((option) => option.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) {
        return current
      }
      const next = [...current]
      const temp = next[index]!
      next[index] = next[target]!
      next[target] = temp
      return next.map((option, order) => ({ ...option, order }))
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
        options: isChoiceType(type) ? options : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save question.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={(event) => void handleSubmit(event)}>
      <label htmlFor="question-type">Question type</label>
      <select
        id="question-type"
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

      <label htmlFor="question-difficulty">Difficulty</label>
      <select
        id="question-difficulty"
        value={difficulty}
        onChange={(event) =>
          setDifficulty(event.target.value as Difficulty)
        }
      >
        {ALL_DIFFICULTIES.map((value) => (
          <option key={value} value={value}>
            {DIFFICULTY_LABELS[value]}
          </option>
        ))}
      </select>

      <label htmlFor="question-text">Question text</label>
      <textarea
        id="question-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
      />

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
              <label>
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
              <button
                type="button"
                onClick={() => moveOption(option.id, -1)}
                disabled={index === 0}
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => moveOption(option.id, 1)}
                disabled={index === options.length - 1}
              >
                Down
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeOption(option.id)}
                disabled={options.length <= 2}
              >
                Remove
              </button>
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
