import { SCHEMA_VERSION, db } from '../db/database'
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT_VERSION,
  buildExportFilename,
  chooseNewerByUpdatedAt,
  parseAndValidateBackup,
  previewBackup,
  type BackupPreview,
  type StudyAppBackup,
} from '../domain/backup'
import { nowIso } from '../domain/time'
import type {
  AppMetadata,
  Chapter,
  Option,
  Question,
  Subject,
} from '../domain/types'

export async function collectBackupData(): Promise<StudyAppBackup> {
  const [subjects, chapters, questions, options, appMetadata] =
    await Promise.all([
      db.subjects.toArray(),
      db.chapters.toArray(),
      db.questions.toArray(),
      db.options.toArray(),
      db.appMetadata.toArray(),
    ])

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appName: BACKUP_APP_NAME,
    exportedAt: nowIso(),
    data: {
      subjects,
      chapters,
      questions,
      options,
      appMetadata,
    },
  }
}

export async function exportBackupJson(): Promise<{
  filename: string
  json: string
  backup: StudyAppBackup
}> {
  const backup = await collectBackupData()
  return {
    filename: buildExportFilename(backup.exportedAt),
    json: `${JSON.stringify(backup, null, 2)}\n`,
    backup,
  }
}

export function downloadJsonFile(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readBackupFile(file: File): Promise<{
  backup: StudyAppBackup
  preview: BackupPreview
}> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('Backup file is not valid JSON.')
  }

  const backup = parseAndValidateBackup(parsed)
  return { backup, preview: previewBackup(backup) }
}

function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(
  localItems: T[],
  incomingItems: T[],
): T[] {
  const map = new Map(localItems.map((item) => [item.id, item]))
  for (const incoming of incomingItems) {
    map.set(incoming.id, chooseNewerByUpdatedAt(map.get(incoming.id), incoming))
  }
  return [...map.values()]
}

function mergeOptions(
  localOptions: Option[],
  incomingOptions: Option[],
  localQuestions: Question[],
  mergedQuestions: Question[],
): Option[] {
  const localQuestionMap = new Map(
    localQuestions.map((question) => [question.id, question]),
  )
  const mergedQuestionMap = new Map(
    mergedQuestions.map((question) => [question.id, question]),
  )
  const map = new Map(localOptions.map((option) => [option.id, option]))

  for (const incoming of incomingOptions) {
    const local = map.get(incoming.id)
    if (!local) {
      map.set(incoming.id, incoming)
      continue
    }

    const localQuestion = localQuestionMap.get(incoming.questionId)
    const mergedQuestion = mergedQuestionMap.get(incoming.questionId)
    const incomingWon =
      mergedQuestion !== undefined &&
      (!localQuestion ||
        mergedQuestion.updatedAt !== localQuestion.updatedAt ||
        mergedQuestion.updatedAt > (localQuestion.updatedAt ?? ''))

    // If the merged question came from the backup (newer or new), prefer
    // the backup option text/correctness for matching option IDs.
    if (incomingWon) {
      map.set(incoming.id, incoming)
    }
  }

  return [...map.values()]
}

async function writeAllTables(data: {
  subjects: Subject[]
  chapters: Chapter[]
  questions: Question[]
  options: Option[]
  appMetadata: AppMetadata[]
}): Promise<void> {
  await db.transaction(
    'rw',
    db.subjects,
    db.chapters,
    db.questions,
    db.options,
    db.appMetadata,
    async () => {
      await Promise.all([
        db.subjects.clear(),
        db.chapters.clear(),
        db.questions.clear(),
        db.options.clear(),
        db.appMetadata.clear(),
      ])

      if (data.subjects.length > 0) await db.subjects.bulkAdd(data.subjects)
      if (data.chapters.length > 0) await db.chapters.bulkAdd(data.chapters)
      if (data.questions.length > 0) await db.questions.bulkAdd(data.questions)
      if (data.options.length > 0) await db.options.bulkAdd(data.options)
      if (data.appMetadata.length > 0) {
        await db.appMetadata.bulkAdd(data.appMetadata)
      }

      await db.appMetadata.put({
        key: 'schemaVersion',
        value: String(SCHEMA_VERSION),
      })
    },
  )
}

async function replaceAllFromBackup(backup: StudyAppBackup): Promise<void> {
  await writeAllTables(backup.data)
}

async function smartMergeFromBackup(backup: StudyAppBackup): Promise<void> {
  const [localSubjects, localChapters, localQuestions, localOptions, localMetadata] =
    await Promise.all([
      db.subjects.toArray(),
      db.chapters.toArray(),
      db.questions.toArray(),
      db.options.toArray(),
      db.appMetadata.toArray(),
    ])

  const subjects = mergeByUpdatedAt(localSubjects, backup.data.subjects)
  const chapters = mergeByUpdatedAt(localChapters, backup.data.chapters)
  const questions = mergeByUpdatedAt(localQuestions, backup.data.questions)
  const options = mergeOptions(
    localOptions,
    backup.data.options,
    localQuestions,
    questions,
  )

  const metadataMap = new Map(localMetadata.map((item) => [item.key, item]))
  for (const incoming of backup.data.appMetadata) {
    if (incoming.key === 'schemaVersion') {
      continue
    }
    if (!metadataMap.has(incoming.key)) {
      metadataMap.set(incoming.key, incoming)
    }
  }

  await writeAllTables({
    subjects,
    chapters,
    questions,
    options,
    appMetadata: [...metadataMap.values()],
  })
}

export async function restoreBackup(
  backup: StudyAppBackup,
  strategy: 'replace' | 'merge',
): Promise<{ safetyBackup?: StudyAppBackup }> {
  if (strategy === 'replace') {
    const safetyBackup = await collectBackupData()
    downloadJsonFile(
      `StudyApp-safety-backup-${safetyBackup.exportedAt.slice(0, 10)}.json`,
      `${JSON.stringify(safetyBackup, null, 2)}\n`,
    )
    await replaceAllFromBackup(backup)
    return { safetyBackup }
  }

  await smartMergeFromBackup(backup)
  return {}
}
