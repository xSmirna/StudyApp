import Dexie, { type EntityTable } from 'dexie'
import type {
  AppMetadata,
  Chapter,
  Option,
  Question,
  Subject,
} from '../domain/types'

export const SCHEMA_VERSION = 2

export class StudyAppDatabase extends Dexie {
  subjects!: EntityTable<Subject, 'id'>
  chapters!: EntityTable<Chapter, 'id'>
  questions!: EntityTable<Question, 'id'>
  options!: EntityTable<Option, 'id'>
  appMetadata!: EntityTable<AppMetadata, 'key'>

  constructor(name = 'StudyApp') {
    super(name)

    this.version(1).stores({
      subjects: 'id, name, updatedAt',
      chapters: 'id, subjectId, order, updatedAt, archivedAt',
      appMetadata: 'key',
    })

    this.version(SCHEMA_VERSION).stores({
      subjects: 'id, name, updatedAt',
      chapters: 'id, subjectId, order, updatedAt, archivedAt',
      questions: 'id, chapterId, type, difficulty, updatedAt, archivedAt',
      options: 'id, questionId, order',
      appMetadata: 'key',
    })
  }
}

export const db = new StudyAppDatabase()

export async function ensureDatabaseReady(): Promise<void> {
  await db.open()
  await db.appMetadata.put({
    key: 'schemaVersion',
    value: String(SCHEMA_VERSION),
  })
}
