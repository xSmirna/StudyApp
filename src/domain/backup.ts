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
  exportedAt: string
  schemaVersion: number
  formatVersion: number
}

export type MergeStrategy = 'replace' | 'merge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
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
