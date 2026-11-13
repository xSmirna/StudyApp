import { useEffect, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import type { Route } from '../navigation'
import {
  listCompletedSessionSummaries,
  type SessionSummary,
} from '../services/statistics'
import { toUserMessage } from '../services/errors'
import { formatDuration } from '../domain/studyTime'

interface HistoryPageProps {
  onNavigate: (route: Route) => void
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await listCompletedSessionSummaries()
        if (!cancelled) {
          setSessions(items)
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
  }, [])

  return (
    <section className="page">
      <h1>History</h1>
      <p className="muted">
        Completed quizzes only. Discarded or abandoned sessions are not listed.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading && sessions.length === 0 ? (
        <p className="muted">No completed quizzes yet.</p>
      ) : null}

      <ul className="entity-list">
        {sessions.map((summary) => (
          <li key={summary.session.id} className="entity-row">
            <div>
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  onNavigate({
                    name: 'quiz-results',
                    sessionId: summary.session.id,
                  })
                }
              >
                {summary.session.subjectNameSnapshot}
              </button>
              <p className="muted">
                {summary.session.mode.replaceAll('_', ' ')} ·{' '}
                {new Date(
                  summary.session.completedAt ?? summary.session.startedAt,
                ).toLocaleString()}{' '}
                · {summary.correct}/{summary.questionCount} correct
                {typeof summary.session.durationSeconds === 'number'
                  ? ` · quiz ${formatDuration(summary.session.durationSeconds)}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate({
                  name: 'quiz-results',
                  sessionId: summary.session.id,
                })
              }
            >
              Open
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
