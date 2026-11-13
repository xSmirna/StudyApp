export type Route =
  | { name: 'dashboard' }
  | { name: 'subjects' }
  | { name: 'subject'; subjectId: string }

export function routeLabel(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return 'Dashboard'
    case 'subjects':
      return 'Subjects'
    case 'subject':
      return 'Subject'
  }
}
