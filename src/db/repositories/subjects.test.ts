import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../database'
import { ValidationError } from '../errors'
import { createChapter, listChaptersBySubject } from './chapters'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from './subjects'

describe('subjects and chapters repositories', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('creates and lists subjects', async () => {
    await createSubject({ name: 'Physics' })
    await createSubject({ name: 'Chimie' })

    const subjects = await listSubjects()
    expect(subjects.map((subject) => subject.name)).toEqual([
      'Chimie',
      'Physics',
    ])
  })

  it('rejects blank subject names', async () => {
    await expect(createSubject({ name: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('renames a subject', async () => {
    const subject = await createSubject({ name: 'Math' })
    const updated = await updateSubject(subject.id, { name: 'Mathematics' })
    expect(updated.name).toBe('Mathematics')
  })

  it('cascade-deletes chapters when a subject is deleted', async () => {
    const subject = await createSubject({ name: 'History' })
    await createChapter({
      subjectId: subject.id,
      name: 'Chapter 1',
      description: 'Intro',
    })

    expect(await listChaptersBySubject(subject.id)).toHaveLength(1)

    await deleteSubject(subject.id)

    expect(await listSubjects()).toHaveLength(0)
    expect(await listChaptersBySubject(subject.id)).toHaveLength(0)
  })

  it('keeps chapters under their own subject only', async () => {
    const biology = await createSubject({ name: 'Biology' })
    const chemistry = await createSubject({ name: 'Chemistry' })

    await createChapter({ subjectId: biology.id, name: 'Cells' })
    await createChapter({ subjectId: chemistry.id, name: 'Atoms' })

    const biologyChapters = await listChaptersBySubject(biology.id)
    const chemistryChapters = await listChaptersBySubject(chemistry.id)

    expect(biologyChapters.map((chapter) => chapter.name)).toEqual(['Cells'])
    expect(chemistryChapters.map((chapter) => chapter.name)).toEqual(['Atoms'])
  })
})
