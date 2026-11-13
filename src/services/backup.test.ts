import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createChapter } from '../db/repositories/chapters'
import { createQuestion } from '../db/repositories/questions'
import { createSubject, listSubjects } from '../db/repositories/subjects'
import { db } from '../db/database'
import {
  collectBackupData,
  restoreBackup,
} from './backup'
import { parseAndValidateBackup } from '../domain/backup'

describe('backup restore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('round-trips Unicode data with Replace All', async () => {
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

    const originalDownload = globalThis.document
    // restoreBackup(replace) tries to download a safety backup via DOM.
    // Provide a minimal stub for jsdom.
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

    try {
      await restoreBackup(backup, 'replace')
    } finally {
      document.createElement = createElement
      void originalDownload
    }

    const subjects = await listSubjects()
    expect(subjects.map((item) => item.name)).toEqual(['Βιολογία'])
    expect(clickCalls[0]).toMatch(/StudyApp-safety-backup-/)

    const questions = await db.questions.toArray()
    expect(questions[0]?.text).toBe('Définissez το κύτταρο')
    expect(questions[0]?.referenceAnswer).toContain('unité')
  })

  it('Smart Merge keeps newer local question text', async () => {
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

    // Add a missing subject from backup
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

  it('rejects malformed backup files without changing data', async () => {
    await createSubject({ name: 'Keep me' })
    expect(() => parseAndValidateBackup({ bad: true })).toThrow(
      /format version|JSON object|Backup/i,
    )
    expect(await listSubjects()).toHaveLength(1)
  })
})
