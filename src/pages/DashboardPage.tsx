import { useEffect, useState } from 'react'
import { ErrorBanner } from '../components/ErrorBanner'
import { listSubjects } from '../db/repositories/subjects'
import type { Subject } from '../domain/types'
import type { Route } from '../navigation'
import { toUserMessage } from '../services/errors'

interface DashboardPageProps {
  onNavigate: (route: Route) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await listSubjects()
        if (!cancelled) {
          setSubjects(items)
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

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Local-first study app. All data stays in this browser profile.
      </p>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

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
    </section>
  )
}
