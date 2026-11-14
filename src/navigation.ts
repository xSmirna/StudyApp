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
