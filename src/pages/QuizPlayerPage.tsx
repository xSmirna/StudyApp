import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  parseGapTemplate,
  pickBlankTableCells,
  tableCellKey,
} from '../domain/structuredQuestions'
import type {
  AttemptOutcome,
  QuestionAttempt,
  QuizQuestionPayload,
  QuizSession,
} from '../domain/quizTypes'
import { resolveAttemptOutcome } from '../domain/quizTypes'
import { isTypingTarget, quizKeyAction } from '../domain/quizKeyboard'
import {
  isChoiceType,
  isGapFillType,
  isSelfAssessedType,
  isTableFillType,
  isWrittenType,
} from '../domain/types'
import type { Route } from '../navigation'
import {
  completeQuizSession,
  discardQuizSession,
  resumeQuiz,
  submitAnswer,
  updateSessionProgress,
} from '../services/quiz'
import { toUserMessage } from '../services/errors'

interface QuizPlayerPageProps {
  sessionId: string
  onNavigate: (route: Route) => void
}

type VisibleOption = QuizQuestionPayload['options'][number]

function SelfAssessmentFields({
  value,
  onChange,
}: {
  value: AttemptOutcome | undefined
  onChange: (value: AttemptOutcome) => void
}) {
  return (
    <fieldset className="option-fieldset">
      <legend>Self-assessment</legend>
      {(
        ['correct', 'partially_correct', 'incorrect'] as AttemptOutcome[]
      ).map((outcome) => (
        <label key={outcome}>
          <input
            type="radio"
            name="written-assessment"
            checked={value === outcome}
            onChange={() => onChange(outcome)}
          />{' '}
          {outcome.replaceAll('_', ' ')}
        </label>
      ))}
    </fieldset>
  )
}

export function QuizPlayerPage({ sessionId, onNavigate }: QuizPlayerPageProps) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [questions, setQuestions] = useState<QuizQuestionPayload[]>([])
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([])
  const [index, setIndex] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [selectedBoolean, setSelectedBoolean] = useState<boolean | undefined>()
  const [writtenAssessment, setWrittenAssessment] = useState<
    AttemptOutcome | undefined
  >()
  const [gapAnswers, setGapAnswers] = useState<string[]>([])
  const [tableAnswers, setTableAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<AttemptOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [examSelfIndex, setExamSelfIndex] = useState<number | null>(null)

  const question = questions[index]
  const isExam = session?.mode === 'exam'
  const showImmediateFeedback = !isExam

  const visibleOptions: VisibleOption[] = useMemo(() => {
    if (!question || !isChoiceType(question.type)) {
      return []
    }
    const order =
      session?.settings.optionOrders[question.id] ??
      question.options.map((option) => option.id)
    const byId = new Map(question.options.map((option) => [option.id, option]))
    return order
      .map((id) => byId.get(id))
      .filter((option): option is VisibleOption => Boolean(option))
  }, [question, session])

  const gapSegments = useMemo(
    () => (question && isGapFillType(question.type) ? parseGapTemplate(question.text) : []),
    [question],
  )

  const blankCells = useMemo(() => {
    if (!session || !question || !isTableFillType(question.type) || !question.table) {
      return []
    }
    return pickBlankTableCells({
      rowCount: question.table.rows.length,
      colCount: question.table.headers.length,
      sessionSeed: session.settings.seed,
      questionId: question.id,
    })
  }, [session, question])

  const blankCellKeys = useMemo(
    () => new Set(blankCells.map((cell) => tableCellKey(cell))),
    [blankCells],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const resumed = await resumeQuiz(sessionId)
        if (!cancelled) {
          setSession(resumed.session)
          setQuestions(resumed.questions)
          setAttempts(resumed.attempts)
          setIndex(resumed.session.settings.currentIndex)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(toUserMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    if (!question) return
    const existing = attempts.find((attempt) => attempt.questionId === question.id)
    setSelectedOptionIds(existing?.selectedOptionIds ?? [])
    setSelectedBoolean(existing?.selectedBoolean)
    setWrittenAssessment(existing?.writtenSelfAssessment)
    setGapAnswers(
      isGapFillType(question.type)
        ? Array.from({ length: question.gaps?.length ?? 0 }, () => '')
        : [],
    )
    setTableAnswers({})
    setFeedback(
      existing && showImmediateFeedback
        ? resolveAttemptOutcome(existing) ?? null
        : null,
    )
    setRevealed(Boolean(existing && showImmediateFeedback))
  }, [question, attempts, showImmediateFeedback])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return
      }
      const action = quizKeyAction(event.key)
      if (!action || !question) {
        return
      }
      event.preventDefault()

      if (action.type === 'select_option') {
        const option = visibleOptions[action.index]
        if (!option) return
        if (question.type === 'single_choice') {
          setSelectedOptionIds([option.id])
        } else if (question.type === 'multiple_select') {
          setSelectedOptionIds((current) =>
            current.includes(option.id)
              ? current.filter((id) => id !== option.id)
              : [...current, option.id],
          )
        }
        return
      }

      if (action.type === 'reveal' && showImmediateFeedback) {
        setRevealed(true)
        return
      }

      if (action.type === 'advance') {
        void handlePrimaryAction()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    question,
    visibleOptions,
    selectedOptionIds,
    selectedBoolean,
    writtenAssessment,
    revealed,
    feedback,
    showImmediateFeedback,
    index,
    questions.length,
  ])

  async function persistProgress(nextIndex: number) {
    if (!session) return
    const updated = await updateSessionProgress(session.id, {
      settings: {
        ...session.settings,
        currentIndex: nextIndex,
      },
    })
    setSession(updated)
  }

  async function saveCurrentAnswer(options?: {
    forceWritten?: AttemptOutcome
  }): Promise<QuestionAttempt | null> {
    if (!session || !question) return null

    if (isSelfAssessedType(question.type) && showImmediateFeedback) {
      const assessment = options?.forceWritten ?? writtenAssessment
      if (!assessment) {
        throw new Error(
          'Mark the answer as Correct, Partially correct, or Incorrect.',
        )
      }
    }

    if (
      (question.type === 'single_choice' || question.type === 'multiple_select') &&
      selectedOptionIds.length === 0
    ) {
      throw new Error('Select at least one option.')
    }

    if (question.type === 'true_false' && typeof selectedBoolean !== 'boolean') {
      throw new Error('Choose True or False.')
    }

    const attempt = await submitAnswer({
      sessionId: session.id,
      question,
      shownOptionOrder: visibleOptions.map((option) => option.id),
      selectedOptionIds: isChoiceType(question.type)
        ? selectedOptionIds
        : undefined,
      selectedBoolean:
        question.type === 'true_false' ? selectedBoolean : undefined,
      writtenSelfAssessment: isSelfAssessedType(question.type)
        ? (options?.forceWritten ?? writtenAssessment)
        : undefined,
    })

    setAttempts((current) => {
      const without = current.filter(
        (item) => item.questionId !== attempt.questionId,
      )
      return [...without, attempt]
    })
    return attempt
  }

  async function handlePrimaryAction() {
    if (!session || !question || saving) return
    setSaving(true)
    setError(null)
    try {
      if (examSelfIndex !== null) {
        await finishExamSelfAssessment()
        return
      }

      if (showImmediateFeedback && !feedback) {
        if (isSelfAssessedType(question.type)) {
          if (!revealed) {
            setRevealed(true)
            return
          }
          if (!writtenAssessment) {
            throw new Error(
              'Choose Correct, Partially correct, or Incorrect.',
            )
          }
        }
        const attempt = await saveCurrentAnswer()
        const outcome = attempt ? resolveAttemptOutcome(attempt) : null
        setFeedback(outcome ?? null)
        setRevealed(true)
        return
      }

      if (isExam && !feedback) {
        await saveCurrentAnswer()
      }

      if (index < questions.length - 1) {
        const next = index + 1
        setIndex(next)
        await persistProgress(next)
        return
      }

      if (isExam) {
        await beginExamCompletion()
        return
      }

      await completeQuizSession(session.id)
      onNavigate({ name: 'quiz-results', sessionId: session.id })
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function beginExamCompletion() {
    if (!session) return
    const latestAttempts = await resumeQuiz(session.id)
    setAttempts(latestAttempts.attempts)

    const pendingSelf = latestAttempts.questions
      .map((item, qIndex) => ({ item, qIndex }))
      .filter(({ item }) => isSelfAssessedType(item.type))
      .filter(({ item }) => {
        const attempt = latestAttempts.attempts.find(
          (entry) => entry.questionId === item.id,
        )
        return !attempt?.writtenSelfAssessment
      })

    if (pendingSelf.length > 0) {
      setExamSelfIndex(0)
      setIndex(pendingSelf[0]!.qIndex)
      setRevealed(true)
      return
    }

    await completeQuizSession(session.id)
    onNavigate({ name: 'quiz-results', sessionId: session.id })
  }

  async function finishExamSelfAssessment() {
    if (!session || !question || examSelfIndex === null) return
    if (!writtenAssessment) {
      throw new Error('Choose a self-assessment for this question.')
    }
    await saveCurrentAnswer({ forceWritten: writtenAssessment })

    const refreshed = await resumeQuiz(session.id)
    setAttempts(refreshed.attempts)
    const stillPending = refreshed.questions
      .map((item, qIndex) => ({ item, qIndex }))
      .filter(({ item }) => isSelfAssessedType(item.type))
      .filter(({ item }) => {
        const attempt = refreshed.attempts.find(
          (entry) => entry.questionId === item.id,
        )
        return !attempt?.writtenSelfAssessment
      })

    if (stillPending.length > 0) {
      setExamSelfIndex(examSelfIndex + 1)
      setIndex(stillPending[0]!.qIndex)
      setWrittenAssessment(undefined)
      setRevealed(true)
      return
    }

    await completeQuizSession(session.id)
    onNavigate({ name: 'quiz-results', sessionId: session.id })
  }

  async function handleDiscard() {
    try {
      await discardQuizSession(sessionId)
      onNavigate({ name: 'dashboard' })
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  function toggleOption(optionId: string) {
    if (!question) return
    if (question.type === 'single_choice') {
      setSelectedOptionIds([optionId])
      return
    }
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    )
  }

  if (loading) {
    return (
      <section className="page">
        <p>Loading quiz…</p>
      </section>
    )
  }

  if (error && !session) {
    return (
      <section className="page">
        <ErrorBanner message={error} />
        <button type="button" onClick={() => onNavigate({ name: 'dashboard' })}>
          Back to dashboard
        </button>
      </section>
    )
  }

  if (!session || !question) {
    return (
      <section className="page">
        <p>Quiz unavailable.</p>
      </section>
    )
  }

  const primaryLabel = (() => {
    if (examSelfIndex !== null) return 'Submit evaluation'
    if (showImmediateFeedback && !feedback) {
      if (isSelfAssessedType(question.type) && revealed) {
        return 'Submit evaluation'
      }
      return 'Submit answer'
    }
    if (index < questions.length - 1) return 'Next question'
    return isExam ? 'Submit exam' : 'Finish quiz'
  })()

  const showSelfAssessment =
    isSelfAssessedType(question.type) &&
    (revealed || examSelfIndex !== null || !showImmediateFeedback)

  const showRevealButton =
    showImmediateFeedback &&
    !feedback &&
    !isSelfAssessedType(question.type)

  return (
    <section className="page">
      <div className="panel-header">
        <div>
          <p className="muted">
            {session.subjectNameSnapshot} · {session.mode.replaceAll('_', ' ')}
          </p>
          <h1>
            Question {index + 1} of {questions.length}
          </h1>
        </div>
        <button
          type="button"
          className="danger"
          onClick={() => setConfirmDiscard(true)}
        >
          Discard quiz
        </button>
      </div>

      {session.settings.timerMinutes ? (
        <p className="muted">
          Optional timer set to {session.settings.timerMinutes} minutes (not
          enforced automatically in v1 beyond display).
        </p>
      ) : null}

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="panel">
        <p className="muted">
          {question.difficulty} · {question.type.replaceAll('_', ' ')}
        </p>

        {!isGapFillType(question.type) ? <p>{question.text}</p> : null}

        {isChoiceType(question.type) ? (
          <div className="option-fieldset">
            {visibleOptions.map((option, optionIndex) => (
              <label key={option.id}>
                <input
                  type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                  name="quiz-option"
                  checked={selectedOptionIds.includes(option.id)}
                  onChange={() => toggleOption(option.id)}
                  disabled={Boolean(feedback) && showImmediateFeedback}
                />{' '}
                <span className="muted">{optionIndex + 1}.</span> {option.text}
                {revealed && showImmediateFeedback && option.isCorrect
                  ? ' ✓'
                  : ''}
              </label>
            ))}
          </div>
        ) : null}

        {question.type === 'true_false' ? (
          <div className="option-fieldset">
            <label>
              <input
                type="radio"
                name="tf"
                checked={selectedBoolean === true}
                onChange={() => setSelectedBoolean(true)}
                disabled={Boolean(feedback) && showImmediateFeedback}
              />{' '}
              True
            </label>
            <label>
              <input
                type="radio"
                name="tf"
                checked={selectedBoolean === false}
                onChange={() => setSelectedBoolean(false)}
                disabled={Boolean(feedback) && showImmediateFeedback}
              />{' '}
              False
            </label>
          </div>
        ) : null}

        {isGapFillType(question.type) ? (
          <div className="stack-form">
            <div className="gap-fill-prompt" aria-label="Fill in the gaps">
              {gapSegments.map((segment, segmentIndex) =>
                segment.kind === 'text' ? (
                  <span key={`text-${segmentIndex}`}>{segment.value}</span>
                ) : (
                  <span key={`gap-${segment.index}`}>
                    <input
                      value={gapAnswers[segment.index] ?? ''}
                      onChange={(event) => {
                        const next = [...gapAnswers]
                        next[segment.index] = event.target.value
                        setGapAnswers(next)
                      }}
                      disabled={Boolean(feedback) && showImmediateFeedback}
                      aria-label={`Blank ${segment.index + 1}`}
                      placeholder="…"
                    />
                    {(revealed || examSelfIndex !== null) &&
                    question.gaps?.[segment.index] ? (
                      <span className="muted gap-fill-answer-hint">
                        Correct: {question.gaps[segment.index]}
                      </span>
                    ) : null}
                  </span>
                ),
              )}
            </div>
            {showSelfAssessment ? (
              <SelfAssessmentFields
                value={writtenAssessment}
                onChange={setWrittenAssessment}
              />
            ) : null}
          </div>
        ) : null}

        {isTableFillType(question.type) && question.table ? (
          <div className="stack-form">
            <div className="table-fill-scroll">
              <table className="table-fill-grid">
                <thead>
                  <tr>
                    {question.table.headers.map((header, colIndex) => (
                      <th key={`h-${colIndex}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.table.rows.map((row, rowIndex) => (
                    <tr key={`r-${rowIndex}`}>
                      {row.map((cell, colIndex) => {
                        const key = tableCellKey({ row: rowIndex, col: colIndex })
                        const isBlank = blankCellKeys.has(key)
                        if (!isBlank) {
                          return <td key={key}>{cell}</td>
                        }
                        return (
                          <td key={key} className="is-blank-cell">
                            <input
                              value={tableAnswers[key] ?? ''}
                              onChange={(event) =>
                                setTableAnswers((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              disabled={Boolean(feedback) && showImmediateFeedback}
                              aria-label={`Row ${rowIndex + 1} column ${colIndex + 1}`}
                              placeholder="…"
                            />
                            {(revealed || examSelfIndex !== null) ? (
                              <span className="table-fill-correct-hint">
                                Correct: {cell}
                              </span>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showSelfAssessment ? (
              <SelfAssessmentFields
                value={writtenAssessment}
                onChange={setWrittenAssessment}
              />
            ) : null}
          </div>
        ) : null}

        {isWrittenType(question.type) ? (
          <div className="stack-form">
            {(revealed || examSelfIndex !== null) && question.referenceAnswer ? (
              <p>
                <strong>Reference answer:</strong> {question.referenceAnswer}
              </p>
            ) : null}
            {showSelfAssessment ? (
              <SelfAssessmentFields
                value={writtenAssessment}
                onChange={setWrittenAssessment}
              />
            ) : null}
          </div>
        ) : null}

        {revealed && question.explanation && showImmediateFeedback ? (
          <p>
            <strong>Explanation:</strong> {question.explanation}
          </p>
        ) : null}

        {feedback && showImmediateFeedback ? (
          <p
            className={
              feedback === 'incorrect' ? 'warning-banner' : 'success-banner'
            }
            role="status"
          >
            Result: {feedback.replaceAll('_', ' ')}
          </p>
        ) : null}
      </div>

      <div className="row-actions">
        {showRevealButton ? (
          <button type="button" onClick={() => setRevealed(true)}>
            Reveal answer
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handlePrimaryAction()}
          disabled={saving}
        >
          {saving ? 'Saving…' : primaryLabel}
        </button>
      </div>

      <p className="muted">
        Shortcuts: 1–9 / A–I select options, Space reveal, Enter submit/next
        (disabled while typing in text fields).
      </p>

      {confirmDiscard ? (
        <ConfirmDialog
          title="Discard this quiz?"
          message="An in-progress quiz will be marked discarded and will not count as completed."
          confirmLabel="Discard"
          onConfirm={() => void handleDiscard()}
          onCancel={() => setConfirmDiscard(false)}
        />
      ) : null}
    </section>
  )
}
