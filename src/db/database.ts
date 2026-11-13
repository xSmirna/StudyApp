import Dexie, { type EntityTable } from 'dexie'
import type { AppMetadata, Chapter, Subject } from '../domain/types'

export const SCHEMA_VERSION = 1

export class StudyAppDatabase extends Dexie {
  subjects!: EntityTable<Subject, 'id'>
  chapters!: EntityTable<Chapter, 'id'>
  appMetadata!: EntityTable<AppMetadata, 'key'>

  constructor(name = 'StudyApp') {
    super(name)

    this.version(SCHEMA_VERSION).stores({
      subjects: 'id, name, updatedAt',
      chapters: 'id, subjectId, order, updatedAt, archivedAt',
      appMetadata: 'key',
    })
  }
}

export const db = new StudyAppDatabase()

export async function ensureDatabaseReady(): Promise<void> {
  await db.open()
  const existing = await db.appMetadata.get('schemaVersion')
  if (!existing) {
    await db.appMetadata.put({
      key: 'schemaVersion',
      value: String(SCHEMA_VERSION),
    })
  }
}
