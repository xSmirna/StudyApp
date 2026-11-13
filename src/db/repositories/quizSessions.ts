import { createId } from '../../domain/ids'
import { nowIso } from '../../domain/time'
import type {
  AttemptOutcome,
  QuestionAttempt,
  QuizMode,
  QuizQuestionPayload,
  QuizSession,
  QuizSessionSettings,
  QuizStatus,
} from '../../domain/quizTypes'
import { resolveAttemptOutcome } from '../../domain/quizTypes'
import { gradeChoiceQuestion, gradeTrueFalse } from '../../domain/grading'
import { applyReviewOutcome } from './reviewStates'
import { db } from '../database'
import { NotFoundError, ValidationError } from '../errors'

export async function listInProgressSessions(): Promise<QuizSession[]> {
  const sessions = await db.quizSessions
    .where('status')
    .equals('in_progress')
    .toArray()
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function getQuizSession(
  id: string,
): Promise<QuizSession | undefined> {
  return db.quizSessions.get(id)
}

export async function listAttemptsForSession(
  sessionId: string,
): Promise<QuestionAttempt[]> {
  return db.questionAttempts.where('sessionId').equals(sessionId).toArray()
}

export async function getAttemptForQuestion(
  sessionId: string,
  questionId: string,
): Promise<QuestionAttempt | undefined> {
  return db.questionAttempts
    .where('[sessionId+questionId]')
    .equals([sessionId, questionId])
    .first()
}

export async function createQuizSession(input: {
  subjectId: string
  subjectNameSnapshot: string
  chapterIds: string[]
  chapterNameSnapshots: Record<string, string>
  mode: QuizMode
  settings: QuizSessionSettings
}): Promise<QuizSession> {
  if (input.chapterIds.length === 0) {
    throw new ValidationError('Select at least one chapter.')
  }
  if (input.settings.questionIds.length === 0) {
    throw new ValidationError('No eligible questions for this quiz.')
  }

  const session: QuizSession = {
    id: createId(),
    subjectId: input.subjectId,
    subjectNameSnapshot: input.subjectNameSnapshot,
    chapterIds: input.chapterIds,
    chapterNameSnapshots: input.chapterNameSnapshots,
    mode: input.mode,
    status: 'in_progress',
    startedAt: nowIso(),
    settings: {
      ...input.settings,
      currentIndex: input.settings.currentIndex ?? 0,
    },
  }

  await db.quizSessions.add(session)
  return session
}

export async function updateSessionProgress(
  sessionId: string,
  patch: Partial<Pick<QuizSession, 'settings' | 'status' | 'completedAt' | 'durationSeconds'>>,
): Promise<QuizSession> {
  const existing = await db.quizSessions.get(sessionId)
  if (!existing) {
    throw new NotFoundError('QuizSession', sessionId)
  }
  const updated: QuizSession = {
    ...existing,
    ...patch,
    settings: patch.settings ?? existing.settings,
  }
  await db.quizSessions.put(updated)
  return updated
}

export async function discardQuizSession(sessionId: string): Promise<void> {
  const existing = await db.quizSessions.get(sessionId)
  if (!existing) {
    throw new NotFoundError('QuizSession', sessionId)
  }
  if (existing.status === 'completed') {
    throw new ValidationError('Completed quizzes cannot be discarded.')
  }
  await db.quizSessions.put({
    ...existing,
    status: 'discarded' satisfies QuizStatus,
    completedAt: nowIso(),
  })
}

export type SubmitAnswerInput = {
  sessionId: string
  question: QuizQuestionPayload
  shownOptionOrder?: string[]
  selectedOptionIds?: string[]
  selectedBoolean?: boolean
  writtenSelfAssessment?: AttemptOutcome
  timeSpentSeconds?: number
}

/**
 * Idempotent upsert by (sessionId, questionId) to prevent duplicate attempts
 * from double-clicks or refresh retries.
 */
export async function submitAnswer(
  input: SubmitAnswerInput,
): Promise<QuestionAttempt> {
  const session = await db.quizSessions.get(input.sessionId)
  if (!session) {
    throw new NotFoundError('QuizSession', input.sessionId)
  }
  if (session.status !== 'in_progress') {
    throw new ValidationError('This quiz is no longer in progress.')
  }

  let automaticResult: AttemptOutcome | undefined
  if (input.question.type === 'single_choice' || input.question.type === 'multiple_select') {
    automaticResult = gradeChoiceQuestion(
      input.question.type,
      input.selectedOptionIds ?? [],
      input.question.options,
    )
  } else if (input.question.type === 'true_false') {
    automaticResult = gradeTrueFalse(
      input.selectedBoolean,
      input.question.correctBoolean,
    )
  }

  const existing = await getAttemptForQuestion(
    input.sessionId,
    input.question.id,
  )

  const attempt: QuestionAttempt = {
    id: existing?.id ?? createId(),
    sessionId: input.sessionId,
    questionId: input.question.id,
    questionTextSnapshot: input.question.text,
    questionType: input.question.type,
    difficulty: input.question.difficulty,
    shownOptionOrder: input.shownOptionOrder,
    selectedOptionIds: input.selectedOptionIds,
    selectedBoolean: input.selectedBoolean,
    writtenSelfAssessment: input.writtenSelfAssessment,
    automaticResult,
    answeredAt: nowIso(),
    timeSpentSeconds: input.timeSpentSeconds,
  }

  await db.questionAttempts.put(attempt)

  const outcome = resolveAttemptOutcome(attempt)
  if (outcome && session.mode !== 'exam') {
    // Exam review state updates when the exam is fully submitted.
    await applyReviewOutcome(input.question.id, outcome)
  }

  return attempt
}

export async function completeQuizSession(sessionId: string): Promise<QuizSession> {
  const session = await db.quizSessions.get(sessionId)
  if (!session) {
    throw new NotFoundError('QuizSession', sessionId)
  }

  const attempts = await listAttemptsForSession(sessionId)
  if (session.mode === 'exam') {
    for (const attempt of attempts) {
      const outcome = resolveAttemptOutcome(attempt)
      if (outcome) {
        await applyReviewOutcome(attempt.questionId, outcome)
      }
    }
  }

  const started = new Date(session.startedAt).getTime()
  const completedAt = nowIso()
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(completedAt).getTime() - started) / 1000),
  )

  const updated: QuizSession = {
    ...session,
    status: 'completed',
    completedAt,
    durationSeconds,
  }
  await db.quizSessions.put(updated)
  return updated
}

export async function loadQuizQuestions(
  questionIds: string[],
): Promise<QuizQuestionPayload[]> {
  const questions = await db.questions.bulkGet(questionIds)
  const payloads: QuizQuestionPayload[] = []

  for (const questionId of questionIds) {
    const question = questions.find((item) => item?.id === questionId)
    if (!question || question.archivedAt) {
      continue
    }
    const options = await db.options.where('questionId').equals(question.id).toArray()
    payloads.push({
      id: question.id,
      chapterId: question.chapterId,
      type: question.type,
      text: question.text,
      difficulty: question.difficulty,
      referenceAnswer: question.referenceAnswer,
      explanation: question.explanation,
      correctBoolean: question.correctBoolean,
      options: options
        .sort((a, b) => a.order - b.order)
        .map((option) => ({
          id: option.id,
          text: option.text,
          order: option.order,
          isCorrect: option.isCorrect,
        })),
    })
  }

  return payloads
}
