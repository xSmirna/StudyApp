import type { QuizMode } from './domain/quizTypes'

export type Route =
  | { name: 'dashboard' }
  | { name: 'subjects' }
  | { name: 'subject'; subjectId: string }
  | { name: 'chapter'; subjectId: string; chapterId: string }
  | { name: 'question-new'; subjectId: string; chapterId: string }
  | {
      name: 'question-edit'
      subjectId: string
      chapterId: string
      questionId: string
    }
  | {
      name: 'quiz-setup'
      subjectId: string
      mode: QuizMode
      chapterId?: string
    }
  | { name: 'quiz-player'; sessionId: string }
  | { name: 'quiz-results'; sessionId: string }
  | { name: 'history' }
  | { name: 'settings' }

const QUIZ_MODES: QuizMode[] = [
  'learn',
  'revision',
  'exam',
  'custom',
  'practice_incorrect',
]

function isQuizMode(value: string | null): value is QuizMode {
  return value !== null && (QUIZ_MODES as string[]).includes(value)
}

/** App path without Vite base, always starting with `/`. */
export function routeToPath(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return '/'
    case 'subjects':
      return '/subjects'
    case 'subject':
      return `/subjects/${encodeURIComponent(route.subjectId)}`
    case 'chapter':
      return `/subjects/${encodeURIComponent(route.subjectId)}/chapters/${encodeURIComponent(route.chapterId)}`
    case 'question-new':
      return `/subjects/${encodeURIComponent(route.subjectId)}/chapters/${encodeURIComponent(route.chapterId)}/questions/new`
    case 'question-edit':
      return `/subjects/${encodeURIComponent(route.subjectId)}/chapters/${encodeURIComponent(route.chapterId)}/questions/${encodeURIComponent(route.questionId)}`
    case 'quiz-setup': {
      const params = new URLSearchParams({ mode: route.mode })
      if (route.chapterId) {
        params.set('chapterId', route.chapterId)
      }
      return `/subjects/${encodeURIComponent(route.subjectId)}/quiz?${params.toString()}`
    }
    case 'quiz-player':
      return `/quiz/${encodeURIComponent(route.sessionId)}`
    case 'quiz-results':
      return `/quiz/${encodeURIComponent(route.sessionId)}/results`
    case 'history':
      return '/history'
    case 'settings':
      return '/settings'
  }
}

export function pathToRoute(pathname: string, search = ''): Route {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  let path = pathname
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || '/'
  }
  if (!path.startsWith('/')) {
    path = `/${path}`
  }

  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )
  const segments = path.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { name: 'dashboard' }
  }

  if (segments[0] === 'subjects' && segments.length === 1) {
    return { name: 'subjects' }
  }

  if (segments[0] === 'subjects' && segments.length === 2) {
    return { name: 'subject', subjectId: decodeURIComponent(segments[1]!) }
  }

  if (
    segments[0] === 'subjects' &&
    segments[2] === 'chapters' &&
    segments.length === 4
  ) {
    return {
      name: 'chapter',
      subjectId: decodeURIComponent(segments[1]!),
      chapterId: decodeURIComponent(segments[3]!),
    }
  }

  if (
    segments[0] === 'subjects' &&
    segments[2] === 'chapters' &&
    segments[4] === 'questions' &&
    segments[5] === 'new' &&
    segments.length === 6
  ) {
    return {
      name: 'question-new',
      subjectId: decodeURIComponent(segments[1]!),
      chapterId: decodeURIComponent(segments[3]!),
    }
  }

  if (
    segments[0] === 'subjects' &&
    segments[2] === 'chapters' &&
    segments[4] === 'questions' &&
    segments.length === 6
  ) {
    return {
      name: 'question-edit',
      subjectId: decodeURIComponent(segments[1]!),
      chapterId: decodeURIComponent(segments[3]!),
      questionId: decodeURIComponent(segments[5]!),
    }
  }

  if (
    segments[0] === 'subjects' &&
    segments[2] === 'quiz' &&
    segments.length === 3
  ) {
    const modeParam = params.get('mode')
    const mode: QuizMode = isQuizMode(modeParam) ? modeParam : 'custom'
    const chapterId = params.get('chapterId') ?? undefined
    return {
      name: 'quiz-setup',
      subjectId: decodeURIComponent(segments[1]!),
      mode,
      chapterId: chapterId ? decodeURIComponent(chapterId) : undefined,
    }
  }

  if (segments[0] === 'quiz' && segments.length === 2) {
    return {
      name: 'quiz-player',
      sessionId: decodeURIComponent(segments[1]!),
    }
  }

  if (
    segments[0] === 'quiz' &&
    segments[2] === 'results' &&
    segments.length === 3
  ) {
    return {
      name: 'quiz-results',
      sessionId: decodeURIComponent(segments[1]!),
    }
  }

  if (segments[0] === 'history' && segments.length === 1) {
    return { name: 'history' }
  }

  if (segments[0] === 'settings' && segments.length === 1) {
    return { name: 'settings' }
  }

  return { name: 'dashboard' }
}

export function routeToHref(route: Route): string {
  const path = routeToPath(route)
  const [pathname, query] = path.split('?')
  const base = import.meta.env.BASE_URL
  const href = `${base}${pathname!.replace(/^\//, '')}`
  return query ? `${href}?${query}` : href
}

export function readRouteFromLocation(
  location: Pick<Location, 'pathname' | 'search'> = window.location,
): Route {
  return pathToRoute(location.pathname, location.search)
}

export function routesEqual(a: Route, b: Route): boolean {
  return routeToPath(a) === routeToPath(b)
}

export function routeLabel(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return 'Profile'
    case 'subjects':
      return 'Study'
    case 'subject':
      return 'Subject'
    case 'chapter':
      return 'Chapter'
    case 'question-new':
      return 'New question'
    case 'question-edit':
      return 'Edit question'
    case 'quiz-setup':
      return 'Quiz setup'
    case 'quiz-player':
      return 'Quiz'
    case 'quiz-results':
      return 'Results'
    case 'history':
      return 'History'
    case 'settings':
      return 'Settings'
  }
}
