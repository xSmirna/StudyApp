export type EntityId = string

export type IsoDateTime = string

export type QuestionType =
  | 'single_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Subject {
  id: EntityId
  name: string
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface Chapter {
  id: EntityId
  subjectId: EntityId
  name: string
  description?: string
  order: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  archivedAt?: IsoDateTime
}

export interface Question {
  id: EntityId
  chapterId: EntityId
  type: QuestionType
  text: string
  difficulty: Difficulty
  referenceAnswer?: string
  explanation?: string
  correctBoolean?: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  archivedAt?: IsoDateTime
}

export interface Option {
  id: EntityId
  questionId: EntityId
  text: string
  order: number
  isCorrect: boolean
}

export interface AppMetadata {
  key: string
  value: string
}

export type CreateSubjectInput = {
  name: string
}

export type UpdateSubjectInput = {
  name: string
}

export type CreateChapterInput = {
  subjectId: EntityId
  name: string
  description?: string
}

export type UpdateChapterInput = {
  name: string
  description?: string
}

export type OptionInput = {
  id?: EntityId
  text: string
  isCorrect: boolean
  order: number
}

export type QuestionInput = {
  chapterId: EntityId
  type: QuestionType
  text: string
  difficulty: Difficulty
  referenceAnswer?: string
  explanation?: string
  correctBoolean?: boolean
  options?: OptionInput[]
}

export type QuestionWithOptions = Question & {
  options: Option[]
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single choice',
  multiple_select: 'Multiple select',
  true_false: 'True / False',
  short_answer: 'Short written answer',
  long_answer: 'Long written answer',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'single_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'long_answer',
]

export const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export function isChoiceType(type: QuestionType): boolean {
  return type === 'single_choice' || type === 'multiple_select'
}

export function isWrittenType(type: QuestionType): boolean {
  return type === 'short_answer' || type === 'long_answer'
}
