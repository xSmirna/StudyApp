import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
import { listSubjects } from '../db/repositories/subjects'
import type { QuizSession } from '../domain/quizTypes'
import type { Subject } from '../domain/types'
import type { Route } from '../navigation'
import {
  discardQuizSession,
  listInProgressSessions,
} from '../services/quiz'
import { toUserMessage } from '../services/errors'

interface DashboardPageProps {
  onNavigate: (route: Route) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [inProgress, setInProgress] = useState<QuizSession[]>([])
  const [pendingDiscard, setPendingDiscard] = useState<QuizSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [items, sessions] = await Promise.all([
      listSubjects(),
      listInProgressSessions(),
    ])
    setSubjects(items)
    setInProgress(sessions)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [items, sessions] = await Promise.all([
          listSubjects(),
          listInProgressSessions(),
        ])
        if (!cancelled) {
          setSubjects(items)
          setInProgress(sessions)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserMessage(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function confirmDiscard() {
    if (!pendingDiscard) return
    try {
      await discardQuizSession(pendingDiscard.id)
      setPendingDiscard(null)
      await refresh()
    } catch (err) {
      setError(toUserMessage(err))
    }
  }

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Local-first study app. All data stays in this browser profile.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {inProgress.length > 0 ? (
        <div className="panel">
          <h2>Resume quiz</h2>
          <p className="muted">
            In-progress quizzes are kept until you resume or discard them.
            Discarded quizzes are not counted as completed.
          </p>
          <ul className="entity-list">
            {inProgress.map((session) => (
              <li key={session.id} className="entity-row">
                <div>
                  <strong>{session.subjectNameSnapshot}</strong>
                  <p className="muted">
                    {session.mode.replaceAll('_', ' ')} · started{' '}
                    {new Date(session.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate({
                        name: 'quiz-player',
                        sessionId: session.id,
                      })
                    }
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setPendingDiscard(session)}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel">
        <h2>Today</h2>
        <p className="muted">
          Productive study time tracking will appear here in a later stage.
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Subjects</h2>
          <button type="button" onClick={() => onNavigate({ name: 'subjects' })}>
            Manage subjects
          </button>
        </div>
        {loading ? <p>Loading…</p> : null}
        {!loading && subjects.length === 0 ? (
          <p className="muted">No subjects yet. Create one to get started.</p>
        ) : null}
        {!loading && subjects.length > 0 ? (
          <ul className="plain-list">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onNavigate({ name: 'subject', subjectId: subject.id })
                  }
                >
                  {subject.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {pendingDiscard ? (
        <ConfirmDialog
          title="Discard quiz?"
          message="This in-progress quiz will be marked discarded and will not count as completed."
          confirmLabel="Discard"
          onConfirm={() => void confirmDiscard()}
          onCancel={() => setPendingDiscard(null)}
        />
      ) : null}
    </section>
  )
}
