import { useEffect, useMemo, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import type { QuestionAttempt, QuizSession } from '../domain/quizTypes'
import { isMissedOutcome, resolveAttemptOutcome } from '../domain/quizTypes'
import type { Route } from '../navigation'
import {
  getQuizSession,
  listAttemptsForSession,
  practiceIncorrectFromSession,
} from '../services/quiz'
import { toUserMessage } from '../services/errors'

interface QuizResultsPageProps {
  sessionId: string
  onNavigate: (route: Route) => void
}

export function QuizResultsPage({
  sessionId,
  onNavigate,
}: QuizResultsPageProps) {
  const [session, setSession] = useState<QuizSession | null>(null)
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingPractice, setStartingPractice] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const nextSession = await getQuizSession(sessionId)
        const nextAttempts = await listAttemptsForSession(sessionId)
        if (!cancelled) {
          setSession(nextSession ?? null)
          setAttempts(nextAttempts)
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

  const summary = useMemo(() => {
    let correct = 0
    let partial = 0
    let incorrect = 0
    for (const attempt of attempts) {
      const outcome = resolveAttemptOutcome(attempt)
      if (outcome === 'correct') correct += 1
      else if (outcome === 'partially_correct') partial += 1
      else if (outcome === 'incorrect') incorrect += 1
    }
    return { correct, partial, incorrect }
  }, [attempts])

  const missed = attempts.filter((attempt) =>
    isMissedOutcome(resolveAttemptOutcome(attempt)),
  )

  async function handlePracticeIncorrect() {
    setStartingPractice(true)
    setError(null)
    try {
      const result = await practiceIncorrectFromSession(sessionId)
      onNavigate({ name: 'quiz-player', sessionId: result.session.id })
    } catch (err) {
      setError(toUserMessage(err))
    } finally {
      setStartingPractice(false)
    }
  }

  if (loading) {
    return (
      <section className="page">
        <p>Loading results…</p>
      </section>
    )
  }

  if (!session || session.status !== 'completed') {
    return (
      <section className="page">
        <h1>Results unavailable</h1>
        <p className="muted">
          This quiz is not a completed session, so it is not counted as finished.
        </p>
        <button type="button" onClick={() => onNavigate({ name: 'dashboard' })}>
          Dashboard
        </button>
      </section>
    )
  }

  return (
    <section className="page">
      <h1>Results</h1>
      <p className="muted">
        {session.subjectNameSnapshot} · {session.mode.replaceAll('_', ' ')}
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="panel">
        <h2>Summary</h2>
        <ul className="plain-list">
          <li>Correct: {summary.correct}</li>
          <li>Partially correct: {summary.partial}</li>
          <li>Incorrect: {summary.incorrect}</li>
          <li>Questions answered: {attempts.length}</li>
          {typeof session.durationSeconds === 'number' ? (
            <li>Duration: {session.durationSeconds}s</li>
          ) : null}
        </ul>
      </div>

      <div className="panel">
        <h2>Per-question review</h2>
        <ul className="entity-list">
          {attempts.map((attempt) => {
            const outcome = resolveAttemptOutcome(attempt)
            return (
              <li key={attempt.id} className="entity-row">
                <div>
                  <strong>{attempt.questionTextSnapshot}</strong>
                  <p className="muted">
                    {attempt.questionType.replaceAll('_', ' ')} ·{' '}
                    {outcome?.replaceAll('_', ' ') ?? 'unresolved'}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="row-actions">
        {missed.length > 0 ? (
          <button
            type="button"
            onClick={() => void handlePracticeIncorrect()}
            disabled={startingPractice}
          >
            {startingPractice
              ? 'Starting…'
              : 'Practice Incorrect Questions'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            onNavigate({ name: 'subject', subjectId: session.subjectId })
          }
        >
          Back to subject
        </button>
        <button type="button" onClick={() => onNavigate({ name: 'dashboard' })}>
          Dashboard
        </button>
      </div>
    </section>
  )
}
