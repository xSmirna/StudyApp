import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ErrorBanner } from './components/ErrorBanner'
import { UpdateBanner } from './components/UpdateBanner'
import { ensureDatabaseReady } from './db/database'
import {
  readRouteFromLocation,
  routeToHref,
  routesEqual,
  type Route,
} from './navigation'
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
import { registerPwaUpdates } from './services/pwaUpdate'
import { studyTimeTracker } from './services/studyTimeTracker'

export default function App() {
  const [route, setRoute] = useState<Route>(() => readRouteFromLocation())
  const routeRef = useRef(route)
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const navigate = useCallback((next: Route, options?: { replace?: boolean }) => {
    if (routesEqual(routeRef.current, next)) {
      return
    }

    const href = routeToHref(next)
    if (options?.replace) {
      window.history.replaceState(next, '', href)
    } else {
      window.history.pushState(next, '', href)
    }
    routeRef.current = next
    setRoute(next)
  }, [])

  useEffect(() => {
    window.history.replaceState(routeRef.current, '', routeToHref(routeRef.current))

    function onPopState(event: PopStateEvent) {
      const next =
        event.state && typeof event.state === 'object' && 'name' in event.state
          ? (event.state as Route)
          : readRouteFromLocation()
      routeRef.current = next
      setRoute(next)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await ensureDatabaseReady()
        studyTimeTracker.start()
        await registerPwaUpdates()
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

  const quizActive = route.name === 'quiz-player'

  return (
    <AppShell route={route} onNavigate={navigate}>
      <UpdateBanner quizActive={quizActive} />
      {route.name === 'dashboard' ? (
        <DashboardPage onNavigate={navigate} />
      ) : null}
      {route.name === 'subjects' ? (
        <SubjectsPage onNavigate={navigate} />
      ) : null}
      {route.name === 'subject' ? (
        <SubjectDetailPage subjectId={route.subjectId} onNavigate={navigate} />
      ) : null}
      {route.name === 'chapter' ? (
        <ChapterDetailPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          onNavigate={navigate}
        />
      ) : null}
      {route.name === 'question-new' ? (
        <QuestionEditorPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          onNavigate={navigate}
        />
      ) : null}
      {route.name === 'question-edit' ? (
        <QuestionEditorPage
          subjectId={route.subjectId}
          chapterId={route.chapterId}
          questionId={route.questionId}
          onNavigate={navigate}
        />
      ) : null}
      {route.name === 'quiz-setup' ? (
        <QuizSetupPage
          subjectId={route.subjectId}
          mode={route.mode}
          initialChapterId={route.chapterId}
          onNavigate={navigate}
        />
      ) : null}
      {route.name === 'quiz-player' ? (
        <QuizPlayerPage sessionId={route.sessionId} onNavigate={navigate} />
      ) : null}
      {route.name === 'quiz-results' ? (
        <QuizResultsPage sessionId={route.sessionId} onNavigate={navigate} />
      ) : null}
      {route.name === 'history' ? (
        <HistoryPage onNavigate={navigate} />
      ) : null}
      {route.name === 'settings' ? <SettingsPage /> : null}
    </AppShell>
  )
}
