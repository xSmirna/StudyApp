import type { ReactNode } from 'react'
import type { Route } from '../navigation'

interface AppShellProps {
  route: Route
  onNavigate: (route: Route) => void
  children: ReactNode
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-brand">Study App</p>
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
            className={
              route.name === 'subjects' || route.name === 'subject'
                ? 'nav-active'
                : undefined
            }
            onClick={() => onNavigate({ name: 'subjects' })}
          >
            Subjects
          </button>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
