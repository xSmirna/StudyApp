import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createChapter } from '../db/repositories/chapters'
import { createQuestion } from '../db/repositories/questions'
import { createSubject, listSubjects } from '../db/repositories/subjects'
import { SCHEMA_VERSION, db } from '../db/database'
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT_VERSION,
  parseAndValidateBackup,
} from '../domain/backup'
import {
  collectBackupData,
  exportBackupJson,
  readBackupFile,
  restoreBackup,
} from './backup'

function stubAnchorDownloads(): { clickCalls: string[]; restore: () => void } {
  const clickCalls: string[] = []
  const createElement = document.createElement.bind(document)
  document.createElement = ((tagName: string) => {
    const el = createElement(tagName)
    if (tagName.toLowerCase() === 'a') {
      const anchor = el as HTMLAnchorElement
      anchor.click = () => {
        clickCalls.push(anchor.download)
      }
    }
    return el
  }) as typeof document.createElement

  return {
    clickCalls,
    restore: () => {
      document.createElement = createElement
    },
  }
}

describe('backup restore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('exportBackupJson produces a versioned StudyApp filename and payload', async () => {
    await createSubject({ name: 'Physics' })
    const exported = await exportBackupJson()

    expect(exported.filename).toMatch(/^StudyApp-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(exported.backup.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(exported.backup.schemaVersion).toBe(SCHEMA_VERSION)
    expect(exported.backup.appName).toBe(BACKUP_APP_NAME)

    const parsed = JSON.parse(exported.json) as unknown
    expect(parseAndValidateBackup(parsed).data.subjects[0]?.name).toBe(
      'Physics',
    )
  })

  it('round-trips Unicode data with Replace All and downloads a safety backup first', async () => {
    const subject = await createSubject({ name: 'Βιολογία' })
    const chapter = await createChapter({
      subjectId: subject.id,
      name: 'Κύτταρα',
      description: 'Introduction à la cellule',
    })
    await createQuestion({
      chapterId: chapter.id,
      type: 'short_answer',
      text: 'Définissez το κύτταρο',
      difficulty: 'medium',
      referenceAnswer: 'Η βασική μονάδα ζωής / unité de base de la vie',
    })

    const backup = await collectBackupData()
    expect(backup.data.questions[0]?.text).toContain('κύτταρο')

    await createSubject({ name: 'Temporary local subject' })
    expect(await listSubjects()).toHaveLength(2)

    const { clickCalls, restore } = stubAnchorDownloads()
    try {
      await restoreBackup(backup, 'replace')
    } finally {
      restore()
    }

    const subjects = await listSubjects()
    expect(subjects.map((item) => item.name)).toEqual(['Βιολογία'])
    expect(clickCalls[0]).toMatch(/StudyApp-safety-backup-/)

    const questions = await db.questions.toArray()
    expect(questions[0]?.text).toBe('Définissez το κύτταρο')
    expect(questions[0]?.referenceAnswer).toContain('unité')
  })

  it('Smart Merge keeps newer local question text and adds missing entities', async () => {
    const subject = await createSubject({ name: 'History' })
    const chapter = await createChapter({
      subjectId: subject.id,
      name: 'WW2',
    })
    const localQuestion = await createQuestion({
      chapterId: chapter.id,
      type: 'true_false',
      text: 'Local newer text',
      difficulty: 'easy',
      correctBoolean: true,
    })

    await db.questions.update(localQuestion.id, {
      updatedAt: '2026-11-13T12:00:00.000Z',
      text: 'Local newer text',
    })

    const backup = await collectBackupData()
    backup.data.questions[0] = {
      ...backup.data.questions[0]!,
      text: 'Incoming older text',
      updatedAt: '2026-11-12T12:00:00.000Z',
    }

    backup.data.subjects.push({
      id: 'incoming-subject',
      name: 'Géographie',
      createdAt: '2026-11-10T00:00:00.000Z',
      updatedAt: '2026-11-10T00:00:00.000Z',
    })

    await restoreBackup(backup, 'merge')

    const subjects = await listSubjects()
    expect(subjects.map((item) => item.name).sort()).toEqual([
      'Géographie',
      'History',
    ])

    const question = await db.questions.get(localQuestion.id)
    expect(question?.text).toBe('Local newer text')
  })

  it('Smart Merge applies newer incoming question text without wiping other local data', async () => {
    const subject = await createSubject({ name: 'Chemistry' })
    const chapter = await createChapter({
      subjectId: subject.id,
      name: 'Atoms',
    })
    const localQuestion = await createQuestion({
      chapterId: chapter.id,
      type: 'short_answer',
      text: 'Local older text',
      difficulty: 'hard',
      referenceAnswer: 'old',
    })
    await createSubject({ name: 'Keep locally only' })

    await db.questions.update(localQuestion.id, {
      updatedAt: '2026-11-10T00:00:00.000Z',
      text: 'Local older text',
    })

    const backup = await collectBackupData()
    backup.data.subjects = backup.data.subjects.filter(
      (item) => item.name !== 'Keep locally only',
    )
    backup.data.questions[0] = {
      ...backup.data.questions[0]!,
      text: 'Incoming newer text — révision',
      updatedAt: '2026-11-14T00:00:00.000Z',
      referenceAnswer: 'nouveau',
    }

    await restoreBackup(backup, 'merge')

    const subjects = await listSubjects()
    expect(subjects.map((item) => item.name).sort()).toEqual([
      'Chemistry',
      'Keep locally only',
    ])
    const question = await db.questions.get(localQuestion.id)
    expect(question?.text).toBe('Incoming newer text — révision')
    expect(question?.referenceAnswer).toBe('nouveau')
  })

  it('rejects malformed backup objects without changing data', async () => {
    await createSubject({ name: 'Keep me' })
    expect(() => parseAndValidateBackup({ bad: true })).toThrow(
      /format version|JSON object|Backup/i,
    )
    expect(await listSubjects()).toHaveLength(1)
  })

  it('readBackupFile rejects corrupt JSON and leaves IndexedDB untouched', async () => {
    await createSubject({ name: 'Intact subject' })
    const before = await collectBackupData()

    await expect(
      readBackupFile(new File(['{not-json'], 'broken.json', { type: 'application/json' })),
    ).rejects.toThrow(/not valid JSON/i)

    await expect(
      readBackupFile(
        new File(
          [JSON.stringify({ formatVersion: 1, appName: 'Wrong', schemaVersion: 4, exportedAt: 'x', data: {} })],
          'wrong-app.json',
          { type: 'application/json' },
        ),
      ),
    ).rejects.toThrow(/appName/i)

    const after = await collectBackupData()
    expect(after.data.subjects).toEqual(before.data.subjects)
    expect(await listSubjects()).toHaveLength(1)
  })

  it('does not call restore when validation fails for a truncated payload', async () => {
    await createSubject({ name: 'Safe' })
    const restoreSpy = vi.fn()

    await expect(
      readBackupFile(
        new File(
          [
            JSON.stringify({
              formatVersion: BACKUP_FORMAT_VERSION,
              schemaVersion: SCHEMA_VERSION,
              appName: BACKUP_APP_NAME,
              exportedAt: '2026-11-14T00:00:00.000Z',
              data: {
                subjects: 'corrupted',
                chapters: [],
                questions: [],
                options: [],
                appMetadata: [],
              },
            }),
          ],
          'truncated.json',
          { type: 'application/json' },
        ),
      ),
    ).rejects.toThrow(/subjects/i)

    expect(restoreSpy).not.toHaveBeenCalled()
    expect((await listSubjects())[0]?.name).toBe('Safe')
  })
})
