import type { ReactNode } from 'react'
import type { Route } from '../navigation'
import { NetworkStatus } from './NetworkStatus'

interface AppShellProps {
  route: Route
  onNavigate: (route: Route) => void
  children: ReactNode
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const subjectsActive =
    route.name === 'subjects' ||
    route.name === 'subject' ||
    route.name === 'chapter' ||
    route.name === 'question-new' ||
    route.name === 'question-edit' ||
    route.name === 'quiz-setup' ||
    route.name === 'quiz-player' ||
    route.name === 'quiz-results'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="app-brand">Study App</p>
          <NetworkStatus />
        </div>
        <nav aria-label="Main">
          <button
            type="button"
            className={route.name === 'dashboard' ? 'nav-active' : undefined}
            onClick={() => onNavigate({ name: 'dashboard' })}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={subjectsActive ? 'nav-active' : undefined}
            onClick={() => onNavigate({ name: 'subjects' })}
          >
            Subjects
          </button>
          <button
            type="button"
            className={route.name === 'history' ? 'nav-active' : undefined}
            onClick={() => onNavigate({ name: 'history' })}
          >
            History
          </button>
          <button
            type="button"
            className={route.name === 'settings' ? 'nav-active' : undefined}
            onClick={() => onNavigate({ name: 'settings' })}
          >
            Settings
          </button>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
