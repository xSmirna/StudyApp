import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ErrorBanner } from './components/ErrorBanner'
import { ensureDatabaseReady } from './db/database'
import type { Route } from './navigation'
import { ChapterDetailPage } from './pages/ChapterDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { QuestionEditorPage } from './pages/QuestionEditorPage'
import { QuizPlayerPage } from './pages/QuizPlayerPage'
import { QuizResultsPage } from './pages/QuizResultsPage'
import { QuizSetupPage } from './pages/QuizSetupPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubjectDetailPage } from './pages/SubjectDetailPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { toUserMessage } from './services/errors'
import { studyTimeTracker } from './services/studyTimeTracker'

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' })
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await ensureDatabaseReady()
        studyTimeTracker.start()
        if (!cancelled) {
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(toUserMessage(err))
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  if (bootError) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <ErrorBanner message={bootError} />
        </main>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p>Starting Study App…</p>
        </main>
      </div>
    )
  }

  return (
    <AppShell route={route} onNavigate={setRoute}>
      {route.name === 'dashboard' ? (
        <DashboardPage onNavigate={setRoute} />
      ) : null}
      {route.name === 'subjects' ? (
        <SubjectsPage onNavigate={setRoute} />
      ) : null}
      {route.name === 'subject' ? (
        <SubjectDetailPage subjectId={route.subjectId} onNavigate={setRoute} />
      ) : null}
      {route.name === 'chapter' ? (
        <ChapterDetailPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          onNavigate={setRoute}
        />
      ) : null}
      {route.name === 'question-new' ? (
        <QuestionEditorPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          onNavigate={setRoute}
        />
      ) : null}
      {route.name === 'question-edit' ? (
        <QuestionEditorPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          questionId={route.questionId}
          onNavigate={setRoute}
        />
      ) : null}
      {route.name === 'quiz-setup' ? (
        <QuizSetupPage
          subjectId={route.subjectId}
          mode={route.mode}
          initialChapterId={route.chapterId}
          onNavigate={setRoute}
        />
      ) : null}
      {route.name === 'quiz-player' ? (
        <QuizPlayerPage sessionId={route.sessionId} onNavigate={setRoute} />
      ) : null}
      {route.name === 'quiz-results' ? (
        <QuizResultsPage sessionId={route.sessionId} onNavigate={setRoute} />
      ) : null}
      {route.name === 'history' ? (
        <HistoryPage onNavigate={setRoute} />
      ) : null}
      {route.name === 'settings' ? <SettingsPage /> : null}
    </AppShell>
  )
}
