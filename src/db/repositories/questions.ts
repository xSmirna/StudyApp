import { createId } from '../../domain/ids'
import { nowIso } from '../../domain/time'
import type {
  Option,
  Question,
  QuestionInput,
  QuestionWithOptions,
} from '../../domain/types'
import { validateQuestionInput } from '../../domain/validation'
import { db } from '../database'
import { NotFoundError, ValidationError } from '../errors'

function sortOptions(options: Option[]): Option[] {
  return [...options].sort((a, b) => a.order - b.order)
}

export async function listQuestionsByChapter(
  chapterId: string,
  options?: { includeArchived?: boolean },
): Promise<Question[]> {
  const questions = await db.questions
    .where('chapterId')
    .equals(chapterId)
    .toArray()

  const includeArchived = options?.includeArchived ?? false
  return questions
    .filter((question) => includeArchived || !question.archivedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getQuestionWithOptions(
  id: string,
): Promise<QuestionWithOptions | undefined> {
  const question = await db.questions.get(id)
  if (!question) {
    return undefined
  }

  const options = await db.options.where('questionId').equals(id).toArray()
  return {
    ...question,
    options: sortOptions(options),
  }
}

export async function createQuestion(
  input: QuestionInput,
): Promise<QuestionWithOptions> {
  const chapter = await db.chapters.get(input.chapterId)
  if (!chapter) {
    throw new NotFoundError('Chapter', input.chapterId)
  }

  const validated = validateQuestionInput(input)
  if (!validated.ok) {
    throw new ValidationError(validated.error)
  }

  const timestamp = nowIso()
  const questionId = createId()
  const question: Question = {
    id: questionId,
    chapterId: input.chapterId,
    type: validated.value.type,
    text: validated.value.text,
    difficulty: validated.value.difficulty,
    referenceAnswer: validated.value.referenceAnswer,
    explanation: validated.value.explanation,
    correctBoolean: validated.value.correctBoolean,
    gaps: validated.value.gaps,
    table: validated.value.table,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const options: Option[] = validated.value.options.map((option, index) => ({
    id: option.id ?? createId(),
    questionId,
    text: option.text,
    order: index,
    isCorrect: option.isCorrect,
  }))

  await db.transaction('rw', db.questions, db.options, async () => {
    await db.questions.add(question)
    if (options.length > 0) {
      await db.options.bulkAdd(options)
    }
  })

  return { ...question, options }
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<QuestionWithOptions> {
  const existing = await db.questions.get(id)
  if (!existing) {
    throw new NotFoundError('Question', id)
  }

  if (input.chapterId !== existing.chapterId) {
    throw new ValidationError('Questions cannot be moved between chapters.')
  }

  const validated = validateQuestionInput(input)
  if (!validated.ok) {
    throw new ValidationError(validated.error)
  }

  const updated: Question = {
    ...existing,
    type: validated.value.type,
    text: validated.value.text,
    difficulty: validated.value.difficulty,
    referenceAnswer: validated.value.referenceAnswer,
    explanation: validated.value.explanation,
    correctBoolean: validated.value.correctBoolean,
    gaps: validated.value.gaps,
    table: validated.value.table,
    updatedAt: nowIso(),
  }

  // Clear fields that do not apply to the saved type.
  if (updated.type !== 'true_false') {
    delete updated.correctBoolean
  }
  if (updated.type !== 'short_answer' && updated.type !== 'long_answer') {
    delete updated.referenceAnswer
  }
  if (updated.type !== 'gap_fill') {
    delete updated.gaps
  }
  if (updated.type !== 'table_fill') {
    delete updated.table
  }

  const options: Option[] = validated.value.options.map((option, index) => ({
    id: option.id ?? createId(),
    questionId: id,
    text: option.text,
    order: index,
    isCorrect: option.isCorrect,
  }))

  await db.transaction('rw', db.questions, db.options, async () => {
    await db.questions.put(updated)
    await db.options.where('questionId').equals(id).delete()
    if (options.length > 0) {
      await db.options.bulkAdd(options)
    }
  })

  return { ...updated, options }
}

export async function archiveQuestion(id: string): Promise<Question> {
  const existing = await db.questions.get(id)
  if (!existing) {
    throw new NotFoundError('Question', id)
  }

  const updated: Question = {
    ...existing,
    archivedAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.questions.put(updated)
  return updated
}

export async function restoreQuestion(id: string): Promise<Question> {
  const existing = await db.questions.get(id)
  if (!existing) {
    throw new NotFoundError('Question', id)
  }

  const updated: Question = {
    ...existing,
    archivedAt: undefined,
    updatedAt: nowIso(),
  }
  delete updated.archivedAt
  await db.questions.put(updated)
  return updated
}

export async function deleteQuestion(id: string): Promise<void> {
  const existing = await db.questions.get(id)
  if (!existing) {
    throw new NotFoundError('Question', id)
  }

  await db.transaction('rw', db.questions, db.options, async () => {
    await db.options.where('questionId').equals(id).delete()
    await db.questions.delete(id)
  })
}

export async function deleteQuestionsForChapter(chapterId: string): Promise<void> {
  const questions = await db.questions.where('chapterId').equals(chapterId).toArray()
  const questionIds = questions.map((question) => question.id)

  await db.transaction('rw', db.questions, db.options, async () => {
    for (const questionId of questionIds) {
      await db.options.where('questionId').equals(questionId).delete()
    }
    await db.questions.where('chapterId').equals(chapterId).delete()
  })
}

export async function deleteQuestionsForSubject(subjectId: string): Promise<void> {
  const chapters = await db.chapters.where('subjectId').equals(subjectId).toArray()
  for (const chapter of chapters) {
    await deleteQuestionsForChapter(chapter.id)
  }
}
