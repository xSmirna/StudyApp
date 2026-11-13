import { SCHEMA_VERSION, db } from '../db/database'
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT_VERSION,
  buildExportFilename,
  chooseNewerByUpdatedAt,
  parseAndValidateBackup,
  previewBackup,
  type BackupData,
  type BackupPreview,
  type StudyAppBackup,
} from '../domain/backup'
import type { AchievementUnlock } from '../domain/achievements'
import type {
  QuestionAttempt,
  QuestionReviewState,
  QuizSession,
} from '../domain/quizTypes'
import type { DailyStudyTime } from '../domain/studyTime'
import { nowIso } from '../domain/time'
import type { AppMetadata, Option, Question } from '../domain/types'

export async function collectBackupData(): Promise<StudyAppBackup> {
  const [
    subjects,
    chapters,
    questions,
    options,
    quizSessions,
    questionAttempts,
    questionReviewStates,
    dailyStudyTime,
    achievementUnlocks,
    appMetadata,
  ] = await Promise.all([
    db.subjects.toArray(),
    db.chapters.toArray(),
    db.questions.toArray(),
    db.options.toArray(),
    db.quizSessions.toArray(),
    db.questionAttempts.toArray(),
    db.questionReviewStates.toArray(),
    db.dailyStudyTime.toArray(),
    db.achievementUnlocks.toArray(),
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
      quizSessions,
      questionAttempts,
      questionReviewStates,
      dailyStudyTime,
      achievementUnlocks,
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

function mergeById<T extends { id: string }>(
  localItems: T[],
  incomingItems: T[],
): T[] {
  const map = new Map(localItems.map((item) => [item.id, item]))
  for (const incoming of incomingItems) {
    if (!map.has(incoming.id)) {
      map.set(incoming.id, incoming)
    }
  }
  return [...map.values()]
}

function mergeSessions(
  localItems: QuizSession[],
  incomingItems: QuizSession[],
): QuizSession[] {
  const map = new Map(localItems.map((item) => [item.id, item]))
  for (const incoming of incomingItems) {
    const local = map.get(incoming.id)
    if (!local) {
      map.set(incoming.id, incoming)
      continue
    }
    if (local.status === 'in_progress' && incoming.status === 'completed') {
      map.set(incoming.id, incoming)
    } else if (
      local.status === incoming.status &&
      incoming.startedAt > local.startedAt
    ) {
      map.set(incoming.id, incoming)
    }
  }
  return [...map.values()]
}

function mergeReviewStates(
  localItems: QuestionReviewState[],
  incomingItems: QuestionReviewState[],
): QuestionReviewState[] {
  const map = new Map(localItems.map((item) => [item.questionId, item]))
  for (const incoming of incomingItems) {
    const local = map.get(incoming.questionId)
    if (!local) {
      map.set(incoming.questionId, incoming)
      continue
    }
    if (incoming.attemptCount > local.attemptCount) {
      map.set(incoming.questionId, incoming)
    } else if (
      incoming.attemptCount === local.attemptCount &&
      (incoming.lastAttemptAt ?? '') > (local.lastAttemptAt ?? '')
    ) {
      map.set(incoming.questionId, incoming)
    }
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

    if (incomingWon) {
      map.set(incoming.id, incoming)
    }
  }

  return [...map.values()]
}

async function writeAllTables(data: BackupData): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.subjects,
      db.chapters,
      db.questions,
      db.options,
      db.quizSessions,
      db.questionAttempts,
      db.questionReviewStates,
      db.dailyStudyTime,
      db.achievementUnlocks,
      db.appMetadata,
    ],
    async () => {
      await Promise.all([
        db.subjects.clear(),
        db.chapters.clear(),
        db.questions.clear(),
        db.options.clear(),
        db.quizSessions.clear(),
        db.questionAttempts.clear(),
        db.questionReviewStates.clear(),
        db.dailyStudyTime.clear(),
        db.achievementUnlocks.clear(),
        db.appMetadata.clear(),
      ])

      if (data.subjects.length > 0) await db.subjects.bulkAdd(data.subjects)
      if (data.chapters.length > 0) await db.chapters.bulkAdd(data.chapters)
      if (data.questions.length > 0) await db.questions.bulkAdd(data.questions)
      if (data.options.length > 0) await db.options.bulkAdd(data.options)
      if (data.quizSessions.length > 0) {
        await db.quizSessions.bulkAdd(data.quizSessions)
      }
      if (data.questionAttempts.length > 0) {
        await db.questionAttempts.bulkAdd(data.questionAttempts)
      }
      if (data.questionReviewStates.length > 0) {
        await db.questionReviewStates.bulkAdd(data.questionReviewStates)
      }
      if (data.dailyStudyTime.length > 0) {
        await db.dailyStudyTime.bulkAdd(data.dailyStudyTime)
      }
      if (data.achievementUnlocks.length > 0) {
        await db.achievementUnlocks.bulkAdd(data.achievementUnlocks)
      }
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
  const [
    localSubjects,
    localChapters,
    localQuestions,
    localOptions,
    localSessions,
    localAttempts,
    localReviews,
    localStudy,
    localUnlocks,
    localMetadata,
  ] = await Promise.all([
    db.subjects.toArray(),
    db.chapters.toArray(),
    db.questions.toArray(),
    db.options.toArray(),
    db.quizSessions.toArray(),
    db.questionAttempts.toArray(),
    db.questionReviewStates.toArray(),
    db.dailyStudyTime.toArray(),
    db.achievementUnlocks.toArray(),
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
  const quizSessions = mergeSessions(localSessions, backup.data.quizSessions)
  const questionAttempts = mergeById<QuestionAttempt>(
    localAttempts,
    backup.data.questionAttempts,
  )
  const questionReviewStates = mergeReviewStates(
    localReviews,
    backup.data.questionReviewStates,
  )

  const studyMap = new Map(localStudy.map((item) => [item.localDate, item]))
  for (const incoming of backup.data.dailyStudyTime) {
    const local = studyMap.get(incoming.localDate)
    if (!local) {
      studyMap.set(incoming.localDate, incoming)
    } else {
      studyMap.set(incoming.localDate, {
        localDate: incoming.localDate,
        seconds: Math.max(local.seconds, incoming.seconds),
      })
    }
  }

  const unlockMap = new Map(
    localUnlocks.map((item) => [item.achievementId, item]),
  )
  for (const incoming of backup.data.achievementUnlocks) {
    if (!unlockMap.has(incoming.achievementId)) {
      unlockMap.set(incoming.achievementId, incoming)
    }
  }

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
    quizSessions,
    questionAttempts,
    questionReviewStates,
    dailyStudyTime: [...studyMap.values()] as DailyStudyTime[],
    achievementUnlocks: [...unlockMap.values()] as AchievementUnlock[],
    appMetadata: [...metadataMap.values()] as AppMetadata[],
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
