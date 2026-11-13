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
  | { name: 'settings' }

export function routeLabel(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return 'Dashboard'
    case 'subjects':
      return 'Subjects'
    case 'subject':
      return 'Subject'
    case 'chapter':
      return 'Chapter'
    case 'question-new':
      return 'New question'
    case 'question-edit':
      return 'Edit question'
    case 'settings':
      return 'Settings'
  }
}
