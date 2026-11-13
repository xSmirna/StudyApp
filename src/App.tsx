import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { ErrorBanner } from './components/ErrorBanner'
import { ensureDatabaseReady } from './db/database'
import type { Route } from './navigation'
import { DashboardPage } from './pages/DashboardPage'
import { SubjectDetailPage } from './pages/SubjectDetailPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { toUserMessage } from './services/errors'

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' })
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await ensureDatabaseReady()
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
    </AppShell>
  )
}
