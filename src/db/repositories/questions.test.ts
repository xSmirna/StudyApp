import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../database'
import { ValidationError } from '../errors'
import { createChapter } from './chapters'
import {
  archiveQuestion,
  createQuestion,
  getQuestionWithOptions,
  listQuestionsByChapter,
  updateQuestion,
} from './questions'
import { createSubject } from './subjects'

describe('questions repository', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  async function seedChapter() {
    const subject = await createSubject({ name: 'Languages' })
    const chapter = await createChapter({
      subjectId: subject.id,
      name: 'Vocabulary',
    })
    return chapter
  }

  it('persists Greek and French text with stable option IDs', async () => {
    const chapter = await seedChapter()
    const created = await createQuestion({
      chapterId: chapter.id,
      type: 'single_choice',
      text: 'Πώς λέμε "bonjour";',
      difficulty: 'medium',
      explanation: 'Γαλλικός χαιρετισμός',
      options: [
        { text: 'καλημέρα', isCorrect: true, order: 0 },
        { text: 'καληνύχτα', isCorrect: false, order: 1 },
      ],
    })

    const optionIds = created.options.map((option) => option.id)
    const updated = await updateQuestion(created.id, {
      chapterId: chapter.id,
      type: 'single_choice',
      text: 'Πώς λέμε "bonjour";',
      difficulty: 'medium',
      options: [
        {
          id: optionIds[0],
          text: 'καλημέρα',
          isCorrect: true,
          order: 0,
        },
        {
          id: optionIds[1],
          text: 'au revoir',
          isCorrect: false,
          order: 1,
        },
      ],
    })

    expect(updated.options.map((option) => option.id)).toEqual(optionIds)
    expect(updated.options[1]?.text).toBe('au revoir')

    const reloaded = await getQuestionWithOptions(created.id)
    expect(reloaded?.text).toBe('Πώς λέμε "bonjour";')
    expect(reloaded?.options[0]?.text).toBe('καλημέρα')
  })

  it('rejects invalid single-choice questions', async () => {
    const chapter = await seedChapter()
    await expect(
      createQuestion({
        chapterId: chapter.id,
        type: 'single_choice',
        text: 'Pick one',
        difficulty: 'easy',
        options: [
          { text: 'A', isCorrect: true, order: 0 },
          { text: 'B', isCorrect: true, order: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('archives questions so they are hidden from active lists', async () => {
    const chapter = await seedChapter()
    const question = await createQuestion({
      chapterId: chapter.id,
      type: 'true_false',
      text: 'True statement',
      difficulty: 'easy',
      correctBoolean: true,
    })

    await archiveQuestion(question.id)

    const active = await listQuestionsByChapter(chapter.id)
    const all = await listQuestionsByChapter(chapter.id, {
      includeArchived: true,
    })

    expect(active).toHaveLength(0)
    expect(all).toHaveLength(1)
    expect(all[0]?.archivedAt).toBeTruthy()
  })
})
