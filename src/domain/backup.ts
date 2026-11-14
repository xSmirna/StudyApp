import type { AchievementUnlock } from './achievements'
import type {
  QuestionAttempt,
  QuestionReviewState,
  QuizSession,
} from './quizTypes'
import type { DailyStudyTime } from './studyTime'
import type {
  AppMetadata,
  Chapter,
  Option,
  Question,
  Subject,
} from './types'

export const BACKUP_FORMAT_VERSION = 1
export const BACKUP_APP_NAME = 'StudyApp'

export type BackupData = {
  subjects: Subject[]
  chapters: Chapter[]
  questions: Question[]
  options: Option[]
  quizSessions: QuizSession[]
  questionAttempts: QuestionAttempt[]
  questionReviewStates: QuestionReviewState[]
  dailyStudyTime: DailyStudyTime[]
  achievementUnlocks: AchievementUnlock[]
  appMetadata: AppMetadata[]
}

export type StudyAppBackup = {
  formatVersion: number
  schemaVersion: number
  appName: string
  exportedAt: string
  data: BackupData
}

export type BackupPreview = {
  subjectCount: number
  chapterCount: number
  questionCount: number
  optionCount: number
  quizSessionCount: number
  attemptCount: number
  studyDayCount: number
  achievementCount: number
  exportedAt: string
  schemaVersion: number
  formatVersion: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function optionalArray(value: unknown): unknown[] {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new Error('Backup field that should be an array is invalid.')
  }
  return value
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Backup is missing a valid "${label}" array.`)
  }
  return value
}

function validateSubject(value: unknown, index: number): Subject {
  if (!isRecord(value)) {
    throw new Error(`Subject at index ${index} is invalid.`)
  }
  if (!isString(value.id) || !isString(value.name) || !isString(value.createdAt) || !isString(value.updatedAt)) {
    throw new Error(`Subject at index ${index} is missing required fields.`)
  }
  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function validateChapter(value: unknown, index: number): Chapter {
  if (!isRecord(value)) {
    throw new Error(`Chapter at index ${index} is invalid.`)
  }
  if (
    !isString(value.id) ||
    !isString(value.subjectId) ||
    !isString(value.name) ||
    typeof value.order !== 'number' ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
  ) {
    throw new Error(`Chapter at index ${index} is missing required fields.`)
  }
  return {
    id: value.id,
    subjectId: value.subjectId,
    name: value.name,
    description: isString(value.description) ? value.description : undefined,
    order: value.order,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archivedAt: isString(value.archivedAt) ? value.archivedAt : undefined,
  }
}

function validateQuestion(value: unknown, index: number): Question {
  if (!isRecord(value)) {
    throw new Error(`Question at index ${index} is invalid.`)
  }
  if (
    !isString(value.id) ||
    !isString(value.chapterId) ||
    !isString(value.type) ||
    !isString(value.text) ||
    !isString(value.difficulty) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
  ) {
    throw new Error(`Question at index ${index} is missing required fields.`)
  }
  const gaps = Array.isArray(value.gaps)
    ? value.gaps.filter((item): item is string => isString(item))
    : undefined
  const table =
    isRecord(value.table) &&
    Array.isArray(value.table.headers) &&
    Array.isArray(value.table.rows) &&
    value.table.headers.every((item) => isString(item)) &&
    value.table.rows.every(
      (row) => Array.isArray(row) && row.every((cell) => isString(cell)),
    )
      ? {
          headers: value.table.headers as string[],
          rows: value.table.rows as string[][],
        }
      : undefined

  return {
    id: value.id,
    chapterId: value.chapterId,
    type: value.type as Question['type'],
    text: value.text,
    difficulty: value.difficulty as Question['difficulty'],
    referenceAnswer: isString(value.referenceAnswer)
      ? value.referenceAnswer
      : undefined,
    explanation: isString(value.explanation) ? value.explanation : undefined,
    correctBoolean:
      typeof value.correctBoolean === 'boolean'
        ? value.correctBoolean
        : undefined,
    gaps: gaps && gaps.length > 0 ? gaps : undefined,
    table,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    archivedAt: isString(value.archivedAt) ? value.archivedAt : undefined,
  }
}

function validateOption(value: unknown, index: number): Option {
  if (!isRecord(value)) {
    throw new Error(`Option at index ${index} is invalid.`)
  }
  if (
    !isString(value.id) ||
    !isString(value.questionId) ||
    !isString(value.text) ||
    typeof value.order !== 'number' ||
    typeof value.isCorrect !== 'boolean'
  ) {
    throw new Error(`Option at index ${index} is missing required fields.`)
  }
  return {
    id: value.id,
    questionId: value.questionId,
    text: value.text,
    order: value.order,
    isCorrect: value.isCorrect,
  }
}

function validateMetadata(value: unknown, index: number): AppMetadata {
  if (!isRecord(value)) {
    throw new Error(`App metadata at index ${index} is invalid.`)
  }
  if (!isString(value.key) || !isString(value.value)) {
    throw new Error(`App metadata at index ${index} is missing required fields.`)
  }
  return { key: value.key, value: value.value }
}

function validateQuizSession(value: unknown, index: number): QuizSession {
  if (!isRecord(value) || !isString(value.id) || !isString(value.subjectId)) {
    throw new Error(`Quiz session at index ${index} is invalid.`)
  }
  return value as unknown as QuizSession
}

function validateAttempt(value: unknown, index: number): QuestionAttempt {
  if (!isRecord(value) || !isString(value.id) || !isString(value.sessionId)) {
    throw new Error(`Question attempt at index ${index} is invalid.`)
  }
  return value as unknown as QuestionAttempt
}

function validateReviewState(
  value: unknown,
  index: number,
): QuestionReviewState {
  if (!isRecord(value) || !isString(value.questionId)) {
    throw new Error(`Review state at index ${index} is invalid.`)
  }
  return value as unknown as QuestionReviewState
}

export function parseAndValidateBackup(raw: unknown): StudyAppBackup {
  if (!isRecord(raw)) {
    throw new Error('Backup file must be a JSON object.')
  }

  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format version: ${String(raw.formatVersion)}. Expected ${BACKUP_FORMAT_VERSION}.`,
    )
  }

  if (typeof raw.schemaVersion !== 'number') {
    throw new Error('Backup is missing a numeric schemaVersion.')
  }

  if (raw.appName !== BACKUP_APP_NAME) {
    throw new Error(
      `Backup appName must be "${BACKUP_APP_NAME}". Received "${String(raw.appName)}".`,
    )
  }

  if (!isString(raw.exportedAt)) {
    throw new Error('Backup is missing exportedAt.')
  }

  if (!isRecord(raw.data)) {
    throw new Error('Backup is missing a data object.')
  }

  const data: BackupData = {
    subjects: requireArray(raw.data.subjects, 'subjects').map(validateSubject),
    chapters: requireArray(raw.data.chapters, 'chapters').map(validateChapter),
    questions: requireArray(raw.data.questions, 'questions').map(validateQuestion),
    options: requireArray(raw.data.options, 'options').map(validateOption),
    quizSessions: optionalArray(raw.data.quizSessions).map(validateQuizSession),
    questionAttempts: optionalArray(raw.data.questionAttempts).map(
      validateAttempt,
    ),
    questionReviewStates: optionalArray(raw.data.questionReviewStates).map(
      validateReviewState,
    ),
    dailyStudyTime: optionalArray(raw.data.dailyStudyTime).map(
      (value, index) => {
        if (
          !isRecord(value) ||
          !isString(value.localDate) ||
          typeof value.seconds !== 'number'
        ) {
          throw new Error(`Daily study time at index ${index} is invalid.`)
        }
        return { localDate: value.localDate, seconds: value.seconds }
      },
    ),
    achievementUnlocks: optionalArray(raw.data.achievementUnlocks).map(
      (value, index) => {
        if (
          !isRecord(value) ||
          !isString(value.achievementId) ||
          !isString(value.unlockedAt)
        ) {
          throw new Error(`Achievement unlock at index ${index} is invalid.`)
        }
        return {
          achievementId: value.achievementId as AchievementUnlock['achievementId'],
          unlockedAt: value.unlockedAt,
        }
      },
    ),
    appMetadata: requireArray(raw.data.appMetadata, 'appMetadata').map(
      validateMetadata,
    ),
  }

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: raw.schemaVersion,
    appName: BACKUP_APP_NAME,
    exportedAt: raw.exportedAt,
    data,
  }
}

export function previewBackup(backup: StudyAppBackup): BackupPreview {
  return {
    subjectCount: backup.data.subjects.length,
    chapterCount: backup.data.chapters.length,
    questionCount: backup.data.questions.length,
    optionCount: backup.data.options.length,
    quizSessionCount: backup.data.quizSessions.length,
    attemptCount: backup.data.questionAttempts.length,
    studyDayCount: backup.data.dailyStudyTime.length,
    achievementCount: backup.data.achievementUnlocks.length,
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    formatVersion: backup.formatVersion,
  }
}

export function chooseNewerByUpdatedAt<
  T extends { id: string; updatedAt: string },
>(local: T | undefined, incoming: T): T {
  if (!local) {
    return incoming
  }
  return incoming.updatedAt >= local.updatedAt ? incoming : local
}

export function buildExportFilename(exportedAt: string): string {
  const date = exportedAt.slice(0, 10) || 'unknown-date'
  return `StudyApp-backup-${date}.json`
}
