import { createId } from '../../domain/ids'
import { nowIso } from '../../domain/time'
import type {
  CreateSubjectInput,
  Subject,
  UpdateSubjectInput,
} from '../../domain/types'
import { validateRequiredName } from '../../domain/validation'
import { db } from '../database'
import { NotFoundError, ValidationError } from '../errors'

export async function listSubjects(): Promise<Subject[]> {
  const subjects = await db.subjects.toArray()
  return subjects.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getSubject(id: string): Promise<Subject | undefined> {
  return db.subjects.get(id)
}

export async function createSubject(
  input: CreateSubjectInput,
): Promise<Subject> {
  const nameResult = validateRequiredName(input.name)
  if (!nameResult.ok) {
    throw new ValidationError(nameResult.error)
  }

  const timestamp = nowIso()
  const subject: Subject = {
    id: createId(),
    name: nameResult.value,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.subjects.add(subject)
  return subject
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectInput,
): Promise<Subject> {
  const existing = await db.subjects.get(id)
  if (!existing) {
    throw new NotFoundError('Subject', id)
  }

  const nameResult = validateRequiredName(input.name)
  if (!nameResult.ok) {
    throw new ValidationError(nameResult.error)
  }

  const updated: Subject = {
    ...existing,
    name: nameResult.value,
    updatedAt: nowIso(),
  }

  await db.subjects.put(updated)
  return updated
}

export async function deleteSubject(id: string): Promise<void> {
  const existing = await db.subjects.get(id)
  if (!existing) {
    throw new NotFoundError('Subject', id)
  }

  await db.transaction('rw', db.subjects, db.chapters, async () => {
    await db.chapters.where('subjectId').equals(id).delete()
    await db.subjects.delete(id)
  })
}
