import type { Difficulty, Question, QuestionType } from './types'

export type QuestionListFilters = {
  keyword: string
  type: QuestionType | 'all'
  difficulty: Difficulty | 'all'
  includeArchived: boolean
}

export function filterQuestions(
  questions: Question[],
  filters: QuestionListFilters,
): Question[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()

  return questions.filter((question) => {
    if (!filters.includeArchived && question.archivedAt) {
      return false
    }
    if (filters.type !== 'all' && question.type !== filters.type) {
      return false
    }
    if (
      filters.difficulty !== 'all' &&
      question.difficulty !== filters.difficulty
    ) {
      return false
    }
    if (keyword && !question.text.toLocaleLowerCase().includes(keyword)) {
      return false
    }
    return true
  })
}

export const QUESTIONS_PAGE_SIZE = 50

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = QUESTIONS_PAGE_SIZE,
): { pageItems: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    pageItems: items.slice(start, start + pageSize),
    totalPages,
    page: safePage,
  }
}
