import type { ReactNode } from 'react'
import type { Route } from '../navigation'
import { NetworkStatus } from './NetworkStatus'

interface AppShellProps {
  route: Route
  onNavigate: (route: Route) => void
  children: ReactNode
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const studyActive =
    route.name === 'subjects' ||
    route.name === 'subject' ||
    route.name === 'chapter' ||
    route.name === 'question-new' ||
    route.name === 'question-edit' ||
    route.name === 'quiz-setup' ||
    route.name === 'quiz-player' ||
    route.name === 'quiz-results'

  const profileActive = route.name === 'dashboard'
  const historyActive = route.name === 'history'
  const settingsActive = route.name === 'settings'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="app-brand">Study App</p>
          <NetworkStatus />
        </div>

        <div className="header-center">
          <nav className="main-tabs" aria-label="Main" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={studyActive}
              className={studyActive ? 'tab-active' : undefined}
              onClick={() => onNavigate({ name: 'subjects' })}
            >
              Study
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={profileActive}
              className={profileActive ? 'tab-active' : undefined}
              onClick={() => onNavigate({ name: 'dashboard' })}
            >
              Profile
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={historyActive}
              className={historyActive ? 'tab-active' : undefined}
              onClick={() => onNavigate({ name: 'history' })}
            >
              History
            </button>
          </nav>

          <button
            type="button"
            className={
              settingsActive
                ? 'settings-nav-button nav-active'
                : 'settings-nav-button'
            }
            onClick={() => onNavigate({ name: 'settings' })}
          >
            Settings
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
