export type EntityId = string

export type IsoDateTime = string

export type QuestionType =
  | 'single_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'gap_fill'
  | 'table_fill'

export type TableFillData = {
  headers: string[]
  rows: string[][]
}

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
  gaps?: string[]
  table?: TableFillData
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
  gaps?: string[]
  table?: TableFillData
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
  gap_fill: 'Fill in the gaps',
  table_fill: 'Fill in the table',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Difficult',
}

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'single_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'long_answer',
  'gap_fill',
  'table_fill',
]

export const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

export const MAX_GAP_BLANKS = 4
export const MAX_TABLE_COLUMNS = 4
export const MAX_TABLE_DATA_ROWS = 10

export function isChoiceType(type: QuestionType): boolean {
  return type === 'single_choice' || type === 'multiple_select'
}

export function isWrittenType(type: QuestionType): boolean {
  return type === 'short_answer' || type === 'long_answer'
}

export function isGapFillType(type: QuestionType): boolean {
  return type === 'gap_fill'
}

export function isTableFillType(type: QuestionType): boolean {
  return type === 'table_fill'
}

export function isSelfAssessedType(type: QuestionType): boolean {
  return isWrittenType(type) || isGapFillType(type) || isTableFillType(type)
}
