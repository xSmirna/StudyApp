import { createId } from '../../domain/ids'
import { nowIso } from '../../domain/time'
import type {
  Chapter,
  CreateChapterInput,
  UpdateChapterInput,
} from '../../domain/types'
import {
  validateOptionalDescription,
  validateRequiredName,
} from '../../domain/validation'
import { db } from '../database'
import { NotFoundError, ValidationError } from '../errors'

export async function listChaptersBySubject(
  subjectId: string,
): Promise<Chapter[]> {
  const chapters = await db.chapters
    .where('subjectId')
    .equals(subjectId)
    .toArray()

  return chapters
    .filter((chapter) => !chapter.archivedAt)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export async function getChapter(id: string): Promise<Chapter | undefined> {
  return db.chapters.get(id)
}

export async function createChapter(
  input: CreateChapterInput,
): Promise<Chapter> {
  const subject = await db.subjects.get(input.subjectId)
  if (!subject) {
    throw new NotFoundError('Subject', input.subjectId)
  }

  const nameResult = validateRequiredName(input.name)
  if (!nameResult.ok) {
    throw new ValidationError(nameResult.error)
  }

  const descriptionResult = validateOptionalDescription(input.description)
  if (!descriptionResult.ok) {
    throw new ValidationError(descriptionResult.error)
  }

  const siblings = await db.chapters
    .where('subjectId')
    .equals(input.subjectId)
    .toArray()
  const nextOrder =
    siblings.reduce((max, chapter) => Math.max(max, chapter.order), -1) + 1

  const timestamp = nowIso()
  const chapter: Chapter = {
    id: createId(),
    subjectId: input.subjectId,
    name: nameResult.value,
    description: descriptionResult.value || undefined,
    order: nextOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.chapters.add(chapter)
  return chapter
}

export async function updateChapter(
  id: string,
  input: UpdateChapterInput,
): Promise<Chapter> {
  const existing = await db.chapters.get(id)
  if (!existing) {
    throw new NotFoundError('Chapter', id)
  }

  const nameResult = validateRequiredName(input.name)
  if (!nameResult.ok) {
    throw new ValidationError(nameResult.error)
  }

  const descriptionResult = validateOptionalDescription(input.description)
  if (!descriptionResult.ok) {
    throw new ValidationError(descriptionResult.error)
  }

  const updated: Chapter = {
    ...existing,
    name: nameResult.value,
    description: descriptionResult.value || undefined,
    updatedAt: nowIso(),
  }

  await db.chapters.put(updated)
  return updated
}

export async function deleteChapter(id: string): Promise<void> {
  const existing = await db.chapters.get(id)
  if (!existing) {
    throw new NotFoundError('Chapter', id)
  }

  await db.chapters.delete(id)
}
