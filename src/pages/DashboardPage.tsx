import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorBanner } from '../components/ErrorBanner'
import {
  ACHIEVEMENTS,
  type AchievementUnlock,
} from '../domain/achievements'
import { describeUnlock } from '../db/repositories/achievements'
import { listSubjects } from '../db/repositories/subjects'
import type { QuizSession } from '../domain/quizTypes'
import { formatDuration } from '../domain/studyTime'
import type { Subject } from '../domain/types'
import type { Route } from '../navigation'
import {
  discardQuizSession,
  listInProgressSessions,
} from '../services/quiz'
import { getDashboardStats, type SessionSummary } from '../services/statistics'
import { toUserMessage } from '../services/errors'

interface DashboardPageProps {
  onNavigate: (route: Route) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [inProgress, setInProgress] = useState<QuizSession[]>([])
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([])
  const [unlocks, setUnlocks] = useState<AchievementUnlock[]>([])
  const [studyLabels, setStudyLabels] = useState({
    today: '0s',
    week: '0s',
    total: '0s',
  })
  const [completedQuizzes, setCompletedQuizzes] = useState(0)
  const [pendingDiscard, setPendingDiscard] = useState<QuizSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [items, sessions, stats] = await Promise.all([
      listSubjects(),
      listInProgressSessions(),
      getDashboardStats(),
    ])
    setSubjects(items)
    setInProgress(sessions)
    setRecentSessions(stats.recentSessions)
    setUnlocks(stats.unlocks)
    setStudyLabels(stats.studyTimeLabels)
    setCompletedQuizzes(stats.completedQuizzes)
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        await refresh()
        if (!cancelled) setError(null)
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

  const hiddenCount = ACHIEVEMENTS.length - unlocks.length

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
        <h2>Productive study time</h2>
        <p className="muted">
          Counts active use while this tab is visible and you interact at least
          every 60 seconds. Quiz duration is separate and is not labelled as
          total study time. A sudden crash may lose a little uncommitted time.
        </p>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <ul className="plain-list">
            <li>Today: {studyLabels.today}</li>
            <li>This week: {studyLabels.week}</li>
            <li>Total: {studyLabels.total}</li>
            <li>Completed quizzes: {completedQuizzes}</li>
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Recent activity</h2>
          <button type="button" onClick={() => onNavigate({ name: 'history' })}>
            Full history
          </button>
        </div>
        {recentSessions.length === 0 ? (
          <p className="muted">No completed quizzes yet.</p>
        ) : (
          <ul className="plain-list">
            {recentSessions.map((summary) => (
              <li key={summary.session.id}>
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
                  {summary.session.subjectNameSnapshot} ·{' '}
                  {summary.session.mode.replaceAll('_', ' ')} ·{' '}
                  {summary.correct}/{summary.questionCount}
                  {typeof summary.session.durationSeconds === 'number'
                    ? ` · quiz ${formatDuration(summary.session.durationSeconds)}`
                    : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>Achievements</h2>
        {unlocks.length === 0 ? (
          <p className="muted">
            No achievements unlocked yet.
            {hiddenCount > 0 ? ` ${hiddenCount} remain hidden.` : ''}
          </p>
        ) : (
          <ul className="plain-list">
            {unlocks.map((unlock) => {
              const detail = describeUnlock(unlock)
              return (
                <li key={unlock.achievementId}>
                  <strong>{detail.name}</strong>
                  <p className="muted">
                    {detail.description} · unlocked{' '}
                    {new Date(unlock.unlockedAt).toLocaleString()}
                  </p>
                </li>
              )
            })}
            {hiddenCount > 0 ? (
              <li className="muted">{hiddenCount} hidden achievement(s)</li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Subjects</h2>
          <button type="button" onClick={() => onNavigate({ name: 'subjects' })}>
            Manage subjects
          </button>
        </div>
        {!loading && subjects.length === 0 ? (
          <p className="muted">No subjects yet. Create one to get started.</p>
        ) : null}
        {subjects.length > 0 ? (
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
